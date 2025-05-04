import os
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import StandardScaler
import argparse
import json
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
from bson import ObjectId

# Tải biến môi trường
load_dotenv()

# Kết nối MongoDB
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'tuyen_sinh_thong_minh')

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Thư mục chứa mô hình
MODEL_DIR = 'BE_python/ai_models/dudoanxacxuat/models'

def load_model_and_scaler():
    """
    Tải mô hình và scaler đã lưu
    """
    model_path = os.path.join(MODEL_DIR, 'admission_probability_model.h5')
    
    if not os.path.exists(model_path):
        print(f"Lỗi: Không tìm thấy mô hình tại {model_path}")
        print("Vui lòng chạy neural_network_model.py trước để huấn luyện mô hình")
        return None, None, None
    
    try:
        # Tải mô hình
        model = tf.keras.models.load_model(model_path)
        
        # Tải scaler
        scaler_mean = np.load(os.path.join(MODEL_DIR, 'scaler_mean.npy'))
        scaler_scale = np.load(os.path.join(MODEL_DIR, 'scaler_scale.npy'))
        
        # Tải danh sách đặc trưng
        with open(os.path.join(MODEL_DIR, 'features.txt'), 'r', encoding='utf-8') as f:
            features = f.read().splitlines()
        
        print("Đã tải mô hình và scaler thành công!")
        return model, (scaler_mean, scaler_scale), features
    
    except Exception as e:
        print(f"Lỗi khi tải mô hình: {e}")
        return None, None, None

def predict_single_student(
    student_score, 
    average_score, 
    expected_score, 
    quota, 
    q0, 
    market_trend, 
    score_trend,
    model, 
    scaler
):
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

def predict_from_mongodb(university_code, major_name, combination, student_score, model, scaler, features):
    """
    Dự đoán xác suất trúng tuyển dựa trên dữ liệu từ MongoDB
    """
    try:
        # Tìm thông tin ngành học
        major = db.majors.find_one({'nameNormalized': major_name.lower()})
        if not major:
            print(f"Không tìm thấy thông tin về ngành {major_name}")
            return None
        
        # Lấy xu hướng thị trường (market trend) của ngành
        current_year = datetime.now().year
        market_trend = 0.5  # Giá trị mặc định
        for trend in major.get('marketTrends', []):
            if trend.get('year') == current_year:
                market_trend = trend.get('score', 0.5)
                break
        
        # Tìm thông tin trường đại học
        university = db.universities.find_one({'code': university_code})
        if not university:
            print(f"Không tìm thấy thông tin về trường {university_code}")
            return None
        
        # Tìm thông tin tuyển sinh
        admission_criteria = db.admission_criteria.find_one({
            'universityCode': university_code,
            'majorId': major['_id']
        })
        
        if not admission_criteria:
            print(f"Không tìm thấy thông tin tuyển sinh cho ngành {major_name} tại trường {university_code}")
            return None
        
        # Lấy chỉ tiêu tuyển sinh cho năm hiện tại hoặc năm gần nhất
        quota_list = admission_criteria.get('quota', [])
        quota_years = sorted([q.get('year') for q in quota_list if q.get('year') is not None], reverse=True)
        
        quota = None
        if quota_years:
            target_year = current_year if current_year in quota_years else quota_years[0]
            for q in quota_list:
                if q.get('year') == target_year:
                    quota_value = q.get('total')
                    # Xử lý giá trị chỉ tiêu
                    if isinstance(quota_value, str):
                        if '-' in quota_value:
                            low, high = map(int, quota_value.split('-'))
                            quota = (low + high) / 2
                        elif quota_value.isdigit():
                            quota = int(quota_value)
                    elif isinstance(quota_value, (int, float)):
                        quota = float(quota_value)
                    break
        
        if quota is None:
            print("Không thể xác định chỉ tiêu tuyển sinh")
            quota = 100  # Giá trị mặc định
        
        # Tính toán q0 (chỉ tiêu trung bình) nếu có
        similar_criteria = list(db.admission_criteria.find({
            'majorId': major['_id']
        }))
        
        q0 = quota  # Mặc định
        if similar_criteria:
            all_quotas = []
            for criteria in similar_criteria:
                for q in criteria.get('quota', []):
                    if q.get('year') == current_year and q.get('total'):
                        quota_value = q.get('total')
                        if isinstance(quota_value, str):
                            if '-' in quota_value:
                                low, high = map(int, quota_value.split('-'))
                                all_quotas.append((low + high) / 2)
                            elif quota_value.isdigit():
                                all_quotas.append(int(quota_value))
                        elif isinstance(quota_value, (int, float)):
                            all_quotas.append(float(quota_value))
            
            if all_quotas:
                q0 = sum(all_quotas) / len(all_quotas)
        
        # TODO: Lấy điểm chuẩn trung bình từ dữ liệu lịch sử nếu có collection riêng
        average_score = student_score - 1  # Giả định điểm chuẩn trung bình thấp hơn điểm học sinh 1 đơn vị
        
        # TODO: Tính xu hướng điểm chuẩn (score_trend) nếu có dữ liệu lịch sử
        score_trend = 0  # Giả định xu hướng bằng 0 nếu không có dữ liệu
        
        # Tính điểm chuẩn dự kiến
        expected_score = calculate_expected_score(average_score, market_trend, quota, q0, score_trend)
        
        # Dự đoán xác suất
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
        
        # Tạo kết quả dự đoán
        prediction = {
            'universityCode': university_code,
            'universityName': university.get('name', ''),
            'majorName': major.get('name', ''),
            'combination': combination,
            'studentScore': student_score,
            'expectedScore': expected_score,
            'scoreDiff': student_score - expected_score,
            'quota': quota,
            'marketTrend': market_trend,
            'admissionProbability': float(probability),
            'admissionPercentage': f"{float(probability)*100:.2f}%",
            'predictionDate': datetime.now().isoformat()
        }
        
        return prediction
    
    except Exception as e:
        print(f"Lỗi khi dự đoán từ MongoDB: {e}")
        return None

def calculate_expected_score(mu, t, q, q0, score_trend, alpha=0.5, beta=1.0, gamma=0.7):
    """
    Tính điểm chuẩn dự kiến
    mu: điểm chuẩn trung bình
    t: xu hướng thị trường
    q: chỉ tiêu năm dự đoán
    q0: chỉ tiêu trung bình của ngành
    score_trend: xu hướng điểm chuẩn qua các năm
    """
    return round(mu + alpha * t - beta * (q / q0 - 1) + gamma * score_trend, 2)

def save_prediction_to_mongodb(user_id, anonymous_id, prediction_data):
    """
    Lưu kết quả dự đoán vào MongoDB
    """
    try:
        # Kiểm tra xem đã có dữ liệu của học sinh này chưa
        filter_query = {}
        if user_id:
            filter_query['userId'] = ObjectId(user_id)
        elif anonymous_id:
            filter_query['anonymousId'] = anonymous_id
        else:
            anonymous_id = f"anon_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            filter_query['anonymousId'] = anonymous_id
        
        student_data = db.student_data.find_one(filter_query)
        
        if student_data:
            # Nếu đã có dữ liệu, cập nhật thêm dự đoán mới
            current_predictions = student_data.get('admissionPredictions', [])
            
            # Kiểm tra xem đã có dự đoán tương tự chưa
            similar_prediction = None
            for idx, pred in enumerate(current_predictions):
                if (pred.get('universityName') == prediction_data.get('universityName') and 
                    pred.get('majorName') == prediction_data.get('majorName') and
                    pred.get('combination') == prediction_data.get('combination')):
                    similar_prediction = idx
                    break
            
            if similar_prediction is not None:
                # Cập nhật dự đoán cũ
                current_predictions[similar_prediction] = {
                    'universityId': ObjectId(prediction_data.get('universityId')) if 'universityId' in prediction_data else None,
                    'universityName': prediction_data.get('universityName'),
                    'majorId': ObjectId(prediction_data.get('majorId')) if 'majorId' in prediction_data else None,
                    'majorName': prediction_data.get('majorName'),
                    'combination': prediction_data.get('combination'),
                    'admissionProbability': prediction_data.get('admissionProbability'),
                    'year': datetime.now().year
                }
            else:
                # Thêm dự đoán mới
                current_predictions.append({
                    'universityId': ObjectId(prediction_data.get('universityId')) if 'universityId' in prediction_data else None,
                    'universityName': prediction_data.get('universityName'),
                    'majorId': ObjectId(prediction_data.get('majorId')) if 'majorId' in prediction_data else None,
                    'majorName': prediction_data.get('majorName'),
                    'combination': prediction_data.get('combination'),
                    'admissionProbability': prediction_data.get('admissionProbability'),
                    'year': datetime.now().year
                })
            
            # Cập nhật document
            db.student_data.update_one(
                filter_query,
                {
                    '$set': {
                        'admissionPredictions': current_predictions,
                        'metadata.updatedAt': datetime.now()
                    }
                }
            )
        else:
            # Nếu chưa có, tạo mới
            new_student_data = {
                'anonymousId': anonymous_id,
                'admissionPredictions': [{
                    'universityId': ObjectId(prediction_data.get('universityId')) if 'universityId' in prediction_data else None,
                    'universityName': prediction_data.get('universityName'),
                    'majorId': ObjectId(prediction_data.get('majorId')) if 'majorId' in prediction_data else None,
                    'majorName': prediction_data.get('majorName'),
                    'combination': prediction_data.get('combination'),
                    'admissionProbability': prediction_data.get('admissionProbability'),
                    'year': datetime.now().year
                }],
                'metadata': {
                    'dataVersion': '1.0',
                    'createdAt': datetime.now(),
                    'updatedAt': datetime.now()
                }
            }
            
            # Thêm userId nếu có
            if user_id:
                new_student_data['userId'] = ObjectId(user_id)
            
            # Thêm document mới
            db.student_data.insert_one(new_student_data)
        
        print("Đã lưu kết quả dự đoán vào MongoDB")
        return True
    
    except Exception as e:
        print(f"Lỗi khi lưu dữ liệu vào MongoDB: {e}")
        return False

def interactive_prediction(model, scaler, features):
    """
    Cho phép người dùng nhập dữ liệu và dự đoán tương tác
    """
    print("\n=== NHẬP THÔNG TIN ĐỂ DỰ ĐOÁN XÁC SUẤT TRÚNG TUYỂN ===")
    
    try:
        # Lấy danh sách trường và ngành từ MongoDB
        universities = list(db.universities.find({}, {'code': 1, 'name': 1}))
        majors = list(db.majors.find({}, {'name': 1, 'nameNormalized': 1}))
        
        # Hiển thị các lựa chọn
        print("\nDanh sách trường đại học:")
        for i, uni in enumerate(universities[:10]):  # Chỉ hiển thị 10 trường đầu tiên
            print(f"{i+1}. {uni.get('name')} ({uni.get('code')})")
        print("...")
        
        university_code = input("\nNhập mã trường: ").strip().upper()
        
        print("\nDanh sách ngành học:")
        for i, major in enumerate(majors[:10]):  # Chỉ hiển thị 10 ngành đầu tiên
            print(f"{i+1}. {major.get('name')}")
        print("...")
        
        major_name = input("\nNhập tên ngành: ").strip().lower()
        
        print("\nCác tổ hợp xét tuyển phổ biến:")
        print("1. A00 - Toán, Lý, Hóa")
        print("2. A01 - Toán, Lý, Anh")
        print("3. B00 - Toán, Hóa, Sinh")
        print("4. C00 - Văn, Sử, Địa")
        print("5. D01 - Toán, Văn, Anh")
        
        combination_choice = input("\nChọn tổ hợp (1-5): ").strip()
        combination_map = {
            '1': 'A00', '2': 'A01', '3': 'B00', '4': 'C00', '5': 'D01'
        }
        combination = combination_map.get(combination_choice, 'A00')
        
        student_score = float(input("\nNhập điểm của học sinh: "))
        
        # Dự đoán từ MongoDB
        prediction = predict_from_mongodb(
            university_code, major_name, combination, student_score,
            model, scaler, features
        )
        
        if prediction:
            print("\n=== KẾT QUẢ DỰ ĐOÁN ===")
            print(f"Trường: {prediction['universityName']} ({prediction['universityCode']})")
            print(f"Ngành: {prediction['majorName']}")
            print(f"Tổ hợp xét tuyển: {prediction['combination']}")
            print(f"Điểm của học sinh: {prediction['studentScore']}")
            print(f"Điểm chuẩn dự kiến: {prediction['expectedScore']}")
            print(f"Chênh lệch điểm: {prediction['scoreDiff']}")
            print(f"Xác suất trúng tuyển: {prediction['admissionPercentage']} ({prediction['admissionProbability']:.4f})")
            
            # Phân loại kết quả
            probability = prediction['admissionProbability']
            if probability >= 0.8:
                print("Đánh giá: Khả năng trúng tuyển rất cao")
            elif probability >= 0.6:
                print("Đánh giá: Khả năng trúng tuyển cao")
            elif probability >= 0.4:
                print("Đánh giá: Khả năng trúng tuyển trung bình")
            elif probability >= 0.2:
                print("Đánh giá: Khả năng trúng tuyển thấp")
            else:
                print("Đánh giá: Khả năng trúng tuyển rất thấp")
            
            # Lưu kết quả vào MongoDB
            anonymous_id = input("\nNhập mã học sinh (để trống nếu không có): ").strip()
            save_prediction_to_mongodb(None, anonymous_id if anonymous_id else None, prediction)
        else:
            print("Không thể dự đoán xác suất trúng tuyển với thông tin đã nhập")
        
    except ValueError as e:
        print(f"Lỗi: Vui lòng nhập số hợp lệ - {e}")
    except Exception as e:
        print(f"Lỗi: {e}")

def api_predict(university_code, major_name, combination, student_score, user_id=None, anonymous_id=None):
    """
    Hàm dự đoán xác suất trúng tuyển để gọi từ API
    """
    # Tải mô hình và scaler
    model, scaler, features = load_model_and_scaler()
    if model is None:
        return {
            'success': False,
            'message': 'Không thể tải mô hình dự đoán'
        }
    
    # Dự đoán từ MongoDB
    prediction = predict_from_mongodb(
        university_code, major_name, combination, student_score,
        model, scaler, features
    )
    
    if not prediction:
        return {
            'success': False,
            'message': 'Không thể dự đoán với thông tin đã cung cấp'
        }
    
    # Lưu kết quả vào MongoDB nếu có user_id hoặc anonymous_id
    if user_id or anonymous_id:
        save_prediction_to_mongodb(user_id, anonymous_id, prediction)
    
    return {
        'success': True,
        'data': prediction
    }

def main():
    """
    Hàm chính
    """
    parser = argparse.ArgumentParser(description='Dự đoán xác suất trúng tuyển')
    parser.add_argument('-i', '--interactive', action='store_true', help='Chế độ nhập liệu tương tác')
    parser.add_argument('-u', '--university', help='Mã trường đại học')
    parser.add_argument('-m', '--major', help='Tên ngành học')
    parser.add_argument('-c', '--combination', help='Tổ hợp xét tuyển')
    parser.add_argument('-s', '--score', type=float, help='Điểm của học sinh')
    args = parser.parse_args()
    
    # Tải mô hình và scaler
    model, scaler, features = load_model_and_scaler()
    if model is None:
        return
    
    if args.interactive:
        # Chế độ tương tác
        interactive_prediction(model, scaler, features)
    elif args.university and args.major and args.combination and args.score is not None:
        # Dự đoán trực tiếp từ tham số dòng lệnh
        prediction = predict_from_mongodb(
            args.university, args.major, args.combination, args.score,
            model, scaler, features
        )
        
        if prediction:
            print(json.dumps(prediction, indent=2))
        else:
            print("Không thể dự đoán với thông tin đã cung cấp")
    else:
        # Không có tham số đủ, hiển thị hướng dẫn
        print("Vui lòng chọn một trong các chế độ sau:")
        print("  -i, --interactive            Chế độ nhập liệu tương tác")
        print("  -u, --university UNIVERSITY  Mã trường đại học")
        print("  -m, --major MAJOR            Tên ngành học")
        print("  -c, --combination COMBINATION Tổ hợp xét tuyển")
        print("  -s, --score SCORE            Điểm của học sinh")
        print("\nVí dụ:")
        print("  python predict_admission.py -i")
        print("  python predict_admission.py -u BKA -m 'cong nghe thong tin' -c A00 -s 25.5")

if __name__ == "__main__":
    main() 