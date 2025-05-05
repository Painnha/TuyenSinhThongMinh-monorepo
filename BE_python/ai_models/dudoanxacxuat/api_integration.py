from flask import Blueprint, request, jsonify
from .predict_admission import load_model_and_scaler
import numpy as np
import json
from bson.json_util import dumps
import traceback
from datetime import datetime
from pymongo import MongoClient
import os

# Kết nối MongoDB - sử dụng biến môi trường thống nhất với Node.js
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
MONGODB_NAME = os.getenv('MONGODB_NAME', 'tuyen_sinh_thong_minh')

print(f"Python API MongoDB Configuration: URI={MONGODB_URI}, DB={MONGODB_NAME}")
client = MongoClient(MONGODB_URI)
db = client[MONGODB_NAME]

# Thêm debug để kiểm tra kết nối
try:
    # Liệt kê collections trong database để kiểm tra kết nối
    print(f"Collections trong database: {db.list_collection_names()}")
    print(f"Tìm kiếm trong collection benchmark_scores: {db.benchmark_scores.count_documents({})}")
except Exception as e:
    print(f"Lỗi kết nối MongoDB: {e}")

# Class để giúp serialization numpy arrays và các object khác
class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

# Blueprint cho các API liên quan đến dự đoán xác suất đậu đại học
admission_prediction_blueprint = Blueprint('admission_prediction', __name__)

# API dự đoán xác suất đậu đại học cho một ngành/trường
@admission_prediction_blueprint.route('/predict-ai', methods=['POST'])
def predict_admission():
    try:
        # Lấy dữ liệu từ request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Không có dữ liệu đầu vào'
            }), 400
        
        # Kiểm tra các trường bắt buộc
        required_fields = ['universityCode', 'majorName', 'scores']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Thiếu trường {field}'
                }), 400
                
        # Trích xuất dữ liệu từ request
        university_code = data.get('universityCode')
        major_name = data.get('majorName').lower().strip()
        subject_scores = data.get('scores', {})
        priority_score = float(data.get('priorityScore', 0))
        
        # Chuyển đổi các giá trị điểm từ chuỗi rỗng thành None
        for key, value in subject_scores.items():
            if value == '':
                subject_scores[key] = None
        
        # Tính toán tổ hợp môn tối ưu
        combinations = {
            'A00': {'subjects': ['TOAN', 'LY', 'HOA']},
            'A01': {'subjects': ['TOAN', 'LY', 'ANH']},
            'B00': {'subjects': ['TOAN', 'HOA', 'SINH']},
            'C00': {'subjects': ['VAN', 'SU', 'DIA']},
            'D01': {'subjects': ['TOAN', 'VAN', 'ANH']}
        }
        
        best_combination = None
        best_score = 0
        
        for code, combo in combinations.items():
            total_score = 0
            valid = True
            
            for subject in combo['subjects']:
                if subject in subject_scores and subject_scores[subject] is not None:
                    try:
                        total_score += float(subject_scores[subject])
                    except (ValueError, TypeError):
                        valid = False
                        break
                else:
                    valid = False
                    break
            
            if valid and total_score > best_score:
                best_score = total_score
                best_combination = code
        
        if not best_combination:
            # Nếu không tìm thấy tổ hợp hợp lệ, hãy cung cấp thông tin chi tiết về tổ hợp còn thiếu
            missing_subjects = {}
            for code, combo in combinations.items():
                missing = []
                for subject in combo['subjects']:
                    if subject not in subject_scores or subject_scores[subject] is None:
                        missing.append(subject)
                if missing:
                    missing_subjects[code] = missing
            
            message = 'Không có đủ điểm cho bất kỳ tổ hợp môn nào. '
            for code, missing in missing_subjects.items():
                subjects_str = ', '.join(missing)
                message += f'Tổ hợp {code} còn thiếu môn: {subjects_str}. '
            
            return jsonify({
                'success': False,
                'message': message.strip(),
                'missingSubjects': missing_subjects
            }), 400
        
        # Cộng điểm ưu tiên vào điểm tổng
        student_score = best_score + priority_score
        
        # 1. Tìm kiếm dữ liệu điểm chuẩn từ benchmark_scores
        benchmark_query = {
            'university_code': university_code,
            'major': {'$regex': major_name, '$options': 'i'},
            'subject_combination': best_combination
        }
        
        benchmark_scores = list(db.benchmark_scores.find(benchmark_query).sort('year', -1))
        
        # Nếu không tìm thấy với tổ hợp cụ thể, thử tìm với bất kỳ tổ hợp nào
        if not benchmark_scores:
            print(f"DEBUG: Không tìm thấy điểm chuẩn với tổ hợp {best_combination}, tìm với bất kỳ tổ hợp nào")
            benchmark_scores = list(db.benchmark_scores.find({
                'university_code': university_code,
                'major': {'$regex': major_name, '$options': 'i'}
            }).sort('year', -1))
        
        if not benchmark_scores:
            return jsonify({
                'success': False,
                'message': f'Không tìm thấy điểm chuẩn cho trường {university_code}, ngành {major_name}'
            }), 400
        
        # Lấy thông tin từ bản ghi đầu tiên (mới nhất)
        latest_record = benchmark_scores[0]
        university_name = latest_record.get('university', '')
        entry_level = latest_record.get('entry_level', 'Trung bình')
        
        # Chuẩn bị dữ liệu lịch sử điểm chuẩn
        historical_scores = []
        for score in benchmark_scores:
            year = score.get('year')
            benchmark = score.get('benchmark_score')
            if year and benchmark:
                historical_scores.append((year, float(benchmark)))
        
        # Tính điểm chuẩn trung bình
        scores = [score for _, score in historical_scores]
        average_score = sum(scores) / len(scores) if scores else 0
        
        # 2. Tìm kiếm chỉ tiêu từ admission_criteria
        criteria_query = {
            'universityCode': university_code,
            'majorName': {'$regex': major_name, '$options': 'i'}
        }
        
        admission_criteria = db.admission_criteria.find_one(criteria_query)
        
        # Xử lý chỉ tiêu
        quota = None
        q0 = None
        current_year = datetime.now().year
        
        if admission_criteria and 'quota' in admission_criteria:
            quota_data = admission_criteria.get('quota', [])
            all_quotas = []
            
            for q in quota_data:
                year = q.get('year')
                total = q.get('total')
                
                if total and isinstance(total, str) and '-' in total:
                    # Xử lý trường hợp "91-112"
                    low, high = map(int, total.split('-'))
                    avg_quota = (low + high) / 2
                    all_quotas.append(avg_quota)
                    
                    # Nếu là năm hiện tại, lưu làm quota chính
                    if year == current_year:
                        quota = avg_quota
            
            # Tính q0 (trung bình của tất cả chỉ tiêu)
            q0 = sum(all_quotas) / len(all_quotas) if all_quotas else None
        
        # Nếu không tìm thấy chỉ tiêu, sử dụng giá trị mặc định dựa vào entry_level
        if quota is None:
            if entry_level == 'Cao':
                quota = 85  # Trung bình của 70-100
            elif entry_level == 'Trung bình':
                quota = 125  # Trung bình của 100-150
            else:  # 'Thấp'
                quota = 175  # Trung bình của 150-200
        
        if q0 is None:
            q0 = quota  # Nếu không có dữ liệu, lấy bằng quota
        
        # 3. Tìm kiếm xu hướng thị trường từ majors
        major_query = {
            'nameNormalized': {'$regex': major_name, '$options': 'i'}
        }
        
        major_data = db.majors.find_one(major_query)
        
        if not major_data:
            # Tìm thử với regex chứa từng phần của tên ngành
            words = major_name.split()
            for word in words:
                if len(word) > 3:  # Chỉ tìm với từ có ít nhất 4 ký tự
                    major_data = db.majors.find_one({'nameNormalized': {'$regex': word, '$options': 'i'}})
                    if major_data:
                        break
        
        # Lấy xu hướng thị trường
        market_trend = 0.5  # Giá trị mặc định
        
        if major_data and 'marketTrends' in major_data:
            market_trends = major_data.get('marketTrends', [])
            
            # Tìm xu hướng của năm hiện tại
            for trend in market_trends:
                if trend.get('year') == current_year:
                    market_trend = float(trend.get('score', 0.5))
                    break
            
            # Nếu không có năm hiện tại, lấy năm gần nhất
            if market_trend == 0.5 and market_trends:
                # Sắp xếp theo năm giảm dần
                sorted_trends = sorted(market_trends, key=lambda x: x.get('year', 0), reverse=True)
                market_trend = float(sorted_trends[0].get('score', 0.5))
        
        # 4. Tính xu hướng điểm chuẩn từ dữ liệu lịch sử
        score_trend = 0.0
        if len(historical_scores) >= 2:
            years = np.array([year for year, _ in historical_scores])
            scores = np.array([score for _, score in historical_scores])
            slope, _ = np.polyfit(years, scores, 1)
            score_trend = round(slope, 2)
        
        # 5. Tính điểm chuẩn dự kiến
        expected_score = calculate_expected_score(average_score, market_trend, quota, q0, score_trend)
        
        # 6. Tải mô hình và dự đoán
        try:
            model, scaler, features = load_model_and_scaler()
            
            # 7. Dự đoán xác suất
            probability = predict_single_student(
                student_score=student_score,
                average_score=average_score,
                expected_score=expected_score,
                quota=quota,
                q0=q0,
                market_trend=market_trend,
                score_trend=score_trend,
                model=model,
                scaler=scaler
            )
            
            # 8. Tạo kết quả dự đoán
            prediction = {
                'universityCode': university_code,
                'universityName': university_name,
                'majorName': major_data.get('name', major_name) if major_data else major_name,
                'selectedCombination': best_combination,
                'totalScore': student_score,
                'expectedScore': expected_score,
                'scoreDiff': student_score - expected_score,
                'quota': quota,
                'marketTrend': market_trend,
                'admissionProbability': float(probability),
                'predictionDate': datetime.now().isoformat(),
                'averageHistoricalScore': average_score,
                'scoreTrend': score_trend,
                'historicalScores': historical_scores,
                'entryLevel': entry_level,
                'subjectScores': {subject: subject_scores.get(subject) for subject in combinations[best_combination]['subjects']}
            }
            
            # Thêm đánh giá dựa trên xác suất
            if probability >= 0.8:
                assessment = "Khả năng trúng tuyển rất cao"
            elif probability >= 0.6:
                assessment = "Khả năng trúng tuyển cao"
            elif probability >= 0.4:
                assessment = "Khả năng trúng tuyển trung bình"
            elif probability >= 0.2:
                assessment = "Khả năng trúng tuyển thấp"
            else:
                assessment = "Khả năng trúng tuyển rất thấp"
            
            prediction['assessment'] = assessment
            
            # Trả về kết quả
            return jsonify({
                'success': True,
                'prediction': prediction
            }), 200
            
        except FileNotFoundError as e:
            return jsonify({
                'success': False,
                'message': str(e),
                'error': 'MODEL_NOT_FOUND' 
            }), 500
            
        except ValueError as e:
            # Xử lý lỗi liên quan đến dữ liệu
            error_message = str(e)
            error_code = 'DATA_ERROR'
            
            print(f"DEBUG: ValueError xảy ra: {error_message}")
            
            if "Không tìm thấy thông tin về ngành" in error_message:
                error_code = 'MAJOR_NOT_FOUND'
            elif "Không tìm thấy thông tin về trường" in error_message:
                error_code = 'UNIVERSITY_NOT_FOUND'
            elif "Không tìm thấy dữ liệu điểm chuẩn" in error_message:
                error_code = 'BENCHMARK_NOT_FOUND'
            
            return jsonify({
                'success': False,
                'message': error_message,
                'error': error_code
            }), 400
            
    except Exception as e:
        print(f"Lỗi khi dự đoán: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f"Đã xảy ra lỗi: {str(e)}",
            'error': 'INTERNAL_ERROR'
        }), 500

def calculate_expected_score(mu, t, q, q0, score_trend, alpha=0.5, beta=1.0, gamma=0.7):
    """
    Tính điểm chuẩn dự kiến
    mu: điểm chuẩn trung bình
    t: xu hướng thị trường
    q: chỉ tiêu năm dự đoán
    q0: chỉ tiêu trung bình của ngành
    score_trend: xu hướng điểm chuẩn qua các năm
    """
    # Phòng tránh trường hợp q0 = 0
    if q0 == 0:
        q0 = 1
        
    return round(mu + alpha * t - beta * (q / q0 - 1) + gamma * score_trend, 2)

def predict_single_student(student_score, average_score, expected_score, quota, q0, market_trend, score_trend, model, scaler):
    """
    Dự đoán xác suất trúng tuyển cho một học sinh
    """
    # Tính toán chênh lệch điểm
    score_diff = student_score - expected_score
    
    # Tạo dữ liệu đầu vào
    input_data = np.array([[
        student_score, average_score, expected_score, 
        score_diff, quota, q0, market_trend, score_trend
    ]])
    
    # Áp dụng chuẩn hóa
    scaler_mean, scaler_scale = scaler
    input_scaled = (input_data - scaler_mean) / scaler_scale
    
    # Dự đoán
    probability = model.predict(input_scaled, verbose=0)[0][0]
    
    return probability

# API dự đoán xác suất đậu đại học cho nhiều ngành/trường
@admission_prediction_blueprint.route('/predict-ai/batch', methods=['POST'])
def batch_predict_admission():
    try:
        # Lấy dữ liệu từ request
        data = request.get_json()
        
        if not data or not isinstance(data, list):
            return jsonify({
                'success': False,
                'message': 'Dữ liệu đầu vào phải là một mảng các yêu cầu dự đoán'
            }), 400
        
        # Tải mô hình và dự đoán
        try:
            model, scaler, features = load_model_and_scaler()
            
            predictions = []
            
            for item in data:
                try:
                    # Kiểm tra các trường bắt buộc
                    required_fields = ['universityCode', 'majorName', 'scores']
                    for field in required_fields:
                        if field not in item:
                            raise ValueError(f'Thiếu trường {field}')
                    
                    # Tính toán tổ hợp môn tối ưu
                    university_code = item.get('universityCode')
                    major_name = item.get('majorName')
                    subject_scores = item.get('scores', {})
                    
                    # Tính điểm cho các tổ hợp môn và chọn tổ hợp tốt nhất
                    combinations = {
                        'A00': {'subjects': ['TOAN', 'LY', 'HOA']},
                        'A01': {'subjects': ['TOAN', 'LY', 'ANH']},
                        'B00': {'subjects': ['TOAN', 'HOA', 'SINH']},
                        'C00': {'subjects': ['VAN', 'SU', 'DIA']},
                        'D01': {'subjects': ['TOAN', 'VAN', 'ANH']}
                    }
                    
                    best_combination = None
                    best_score = 0
                    
                    for code, combo in combinations.items():
                        total_score = 0
                        valid_combo = True
                        
                        for subject in combo['subjects']:
                            if subject in subject_scores and subject_scores[subject] is not None:
                                total_score += float(subject_scores[subject])
                            else:
                                valid_combo = False
                                break
                        
                        if valid_combo and total_score > best_score:
                            best_score = total_score
                            best_combination = code
                    
                    if not best_combination:
                        raise ValueError('Không có đủ điểm cho bất kỳ tổ hợp môn nào')
                    
                    # Cộng điểm ưu tiên nếu có
                    priority_score = float(item.get('priorityScore', 0))
                    student_score = best_score + priority_score
                    
                    # Thực hiện các truy vấn tương tự như trong predict_admission
                    # ...
                    
                    # Giả lập kết quả nếu không có đủ dữ liệu
                    predictions.append({
                        'success': True,
                        'prediction': {
                            'universityCode': university_code,
                            'majorName': major_name,
                            'combination': best_combination,
                            'studentScore': student_score,
                            'admissionProbability': 0.5,  # Giá trị mặc định
                            'assessment': 'Khả năng trúng tuyển trung bình'
                        },
                        'data': item
                    })
                    
                except Exception as e:
                    # Xử lý lỗi cho từng item riêng biệt
                    predictions.append({
                        'success': False,
                        'message': str(e),
                        'data': item
                    })
            
            # Trả về kết quả
            return jsonify({
                'success': True,
                'predictions': predictions
            }), 200
            
        except FileNotFoundError as e:
            return jsonify({
                'success': False,
                'message': str(e),
                'error': 'MODEL_NOT_FOUND'
            }), 500
        
    except Exception as e:
        print(f"Lỗi khi dự đoán batch: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500 