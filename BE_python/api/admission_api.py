import os
import sys
import numpy as np
from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest
from datetime import datetime

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import MODEL_DIR
from utils.db_utils import db_client
from ai_models.admission_probability_model import AdmissionProbabilityModel

# Tạo blueprint cho API
admission_api = Blueprint('admission_api', __name__)

# Đường dẫn tới thư mục mô hình
MODEL_DIR_PATH = os.path.join(MODEL_DIR, 'admission_probability')

# Biến toàn cục cho mô hình (lazy loading)
_model = None

def get_model():
    """Lazy loading mô hình"""
    global _model
    if _model is None:
        try:
            _model = AdmissionProbabilityModel.load(MODEL_DIR_PATH)
        except Exception as e:
            raise RuntimeError(f"Không thể tải mô hình dự đoán xác suất: {e}")
    return _model

@admission_api.route('/health', methods=['GET'])
def health_check():
    """Kiểm tra trạng thái hoạt động của API"""
    return jsonify({
        'status': 'ok',
        'model_loaded': _model is not None
    })

@admission_api.route('/predict', methods=['POST'])
def predict_admission():
    """
    API dự đoán xác suất đậu đại học
    
    Nhận JSON:
    {
        "universityId": "ObjectId(...)",
        "universityName": "Đại học Bách Khoa TP.HCM",
        "majorId": "ObjectId(...)",
        "majorName": "Công nghệ thông tin",
        "studentScore": 25.5,
        "combination": "A01",
        "year": 2024
    }
    
    Trả về JSON:
    {
        "prediction": {
            "universityName": "Đại học Bách Khoa TP.HCM",
            "majorName": "Công nghệ thông tin",
            "combination": "A01",
            "studentScore": 25.5,
            "benchmarkScore": 26.0,
            "scoreDifference": -0.5,
            "admissionQuota": 150,
            "probability": 0.87,
            "assessment": "Khả năng cao",
            "year": 2024
        }
    }
    """
    try:
        # Lấy dữ liệu từ request
        data = request.json
        if not data:
            raise BadRequest("Dữ liệu đầu vào không hợp lệ")
        
        # Kiểm tra các trường bắt buộc
        required_fields = ['universityName', 'majorName', 'studentScore', 'combination']
        for field in required_fields:
            if field not in data:
                raise BadRequest(f"Thiếu trường bắt buộc: {field}")
        
        # Lấy thông tin từ admission_criteria
        university_name = data['universityName']
        major_name = data['majorName']
        combination = data['combination']
        student_score = float(data['studentScore'])
        
        # Lấy năm dự đoán (mặc định là năm hiện tại)
        prediction_year = int(data.get('year', datetime.now().year))
        
        # Lấy tiêu chí tuyển sinh từ DB
        admission_criteria = get_admission_criteria(university_name, major_name, combination)
        
        if not admission_criteria:
            return jsonify({
                'error': f"Không tìm thấy tiêu chí tuyển sinh cho trường {university_name}, ngành {major_name}, tổ hợp {combination}"
            }), 404
        
        # Lấy mô hình dự đoán
        model = get_model()
        
        # Chuẩn bị dữ liệu đầu vào cho mô hình
        input_data = prepare_model_input(student_score, admission_criteria, prediction_year)
        
        # Dự đoán xác suất
        probability = model.predict(np.array(input_data))[0]
        
        # Định dạng kết quả
        result = format_prediction_result(
            university_name, major_name, combination, 
            student_score, admission_criteria, 
            probability, prediction_year
        )
        
        # Lưu dữ liệu dự đoán vào DB (nếu cần)
        if request.args.get('save', 'true').lower() == 'true':
            save_prediction_data(data, result)
        
        return jsonify({'prediction': result})
    
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f"Lỗi khi xử lý yêu cầu: {str(e)}"}), 500

def get_admission_criteria(university_name, major_name, combination):
    """
    Lấy tiêu chí tuyển sinh từ DB
    
    Args:
        university_name: Tên trường đại học
        major_name: Tên ngành học
        combination: Tổ hợp môn
        
    Returns:
        Dictionary chứa thông tin tiêu chí tuyển sinh
    """
    # Tìm trong collection admission_criteria
    criteria_collection = db_client.get_collection('admission_criteria')
    criteria = criteria_collection.find_one({
        'universityName': university_name,
        'majorName': major_name
    })
    
    if not criteria:
        return None
    
    # Lấy thông tin quota (chỉ tiêu) của năm gần nhất
    quota_data = criteria.get('quota', [])
    if not quota_data:
        return None
        
    # Sắp xếp theo năm giảm dần
    sorted_quota = sorted(quota_data, key=lambda x: x.get('year', 0), reverse=True)
    latest_quota = sorted_quota[0] if sorted_quota else None
    
    if not latest_quota:
        return None
    
    # Lấy thông tin đầu vào
    result = {
        'universityId': criteria.get('universityId'),
        'majorId': criteria.get('majorId'),
        'quota': latest_quota.get('total', 0),
        'year': latest_quota.get('year', datetime.now().year),
        'average_score': 0,
        'expected_score': 0,
        'market_trend': 0.5,
        'score_trend': 0
    }
    
    # Lấy điểm chuẩn trung bình của 3 năm gần nhất
    recent_years = sorted_quota[:3] if len(sorted_quota) >= 3 else sorted_quota
    benchmark_scores = []
    
    for year_data in recent_years:
        if 'minScore' in year_data:
            benchmark_scores.append(year_data.get('minScore', 0))
    
    # Tính điểm chuẩn trung bình
    if benchmark_scores:
        result['average_score'] = sum(benchmark_scores) / len(benchmark_scores)
        
        # Điểm chuẩn dự kiến là điểm của năm gần nhất
        result['expected_score'] = benchmark_scores[0]
    
    # Lấy xu hướng thị trường từ ngành học
    major_collection = db_client.get_collection('majors')
    major = major_collection.find_one({'name': major_name})
    
    if major and 'marketTrends' in major:
        market_trends = major.get('marketTrends', [])
        if market_trends:
            # Sắp xếp theo năm giảm dần
            sorted_trends = sorted(market_trends, key=lambda x: x.get('year', 0), reverse=True)
            latest_trend = sorted_trends[0]
            result['market_trend'] = latest_trend.get('score', 0.5)
    
    # Tính xu hướng điểm chuẩn nếu có đủ dữ liệu
    if len(benchmark_scores) >= 2:
        # Xu hướng = (điểm năm gần nhất - điểm năm trước) / điểm năm trước
        score_diff = benchmark_scores[0] - benchmark_scores[1]
        result['score_trend'] = score_diff / benchmark_scores[1] if benchmark_scores[1] > 0 else 0
    
    return result

def prepare_model_input(student_score, admission_criteria, prediction_year):
    """
    Chuẩn bị dữ liệu đầu vào cho mô hình
    
    Args:
        student_score: Điểm của học sinh
        admission_criteria: Tiêu chí tuyển sinh
        prediction_year: Năm dự đoán
        
    Returns:
        Mảng numpy chứa các đặc trưng đầu vào
    """
    # Lấy các thông số từ tiêu chí tuyển sinh
    average_score = admission_criteria.get('average_score', 0)
    expected_score = admission_criteria.get('expected_score', 0)
    score_diff = student_score - expected_score
    quota = admission_criteria.get('quota', 0)
    q0 = quota  # Đơn giản hóa, có thể lấy chỉ tiêu trung bình từ DB
    market_trend = admission_criteria.get('market_trend', 0.5)
    score_trend = admission_criteria.get('score_trend', 0)
    
    # Tạo mảng đầu vào
    return [
        student_score, average_score, expected_score, 
        score_diff, quota, q0, market_trend, score_trend
    ]

def format_prediction_result(university_name, major_name, combination, 
                           student_score, admission_criteria, 
                           probability, prediction_year):
    """
    Định dạng kết quả dự đoán
    
    Args:
        university_name: Tên trường đại học
        major_name: Tên ngành học
        combination: Tổ hợp môn
        student_score: Điểm của học sinh
        admission_criteria: Tiêu chí tuyển sinh
        probability: Xác suất đậu
        prediction_year: Năm dự đoán
        
    Returns:
        Dictionary chứa kết quả dự đoán đã định dạng
    """
    # Phân loại kết quả
    assessment = "Không xác định"
    if probability >= 0.8:
        assessment = "Khả năng rất cao"
    elif probability >= 0.6:
        assessment = "Khả năng cao"
    elif probability >= 0.4:
        assessment = "Khả năng trung bình"
    elif probability >= 0.2:
        assessment = "Khả năng thấp"
    else:
        assessment = "Khả năng rất thấp"
    
    # Định dạng kết quả
    return {
        "universityName": university_name,
        "majorName": major_name,
        "combination": combination,
        "studentScore": student_score,
        "benchmarkScore": admission_criteria.get('expected_score', 0),
        "scoreDifference": student_score - admission_criteria.get('expected_score', 0),
        "admissionQuota": admission_criteria.get('quota', 0),
        "probability": float(probability),
        "assessment": assessment,
        "year": prediction_year
    }

def save_prediction_data(input_data, prediction_result):
    """
    Lưu dữ liệu dự đoán vào DB
    
    Args:
        input_data: Dữ liệu đầu vào
        prediction_result: Kết quả dự đoán
    """
    try:
        # Tạo document để lưu vào collection student_data
        document = {
            'universityId': input_data.get('universityId'),
            'universityName': input_data.get('universityName'),
            'majorId': input_data.get('majorId'),
            'majorName': input_data.get('majorName'),
            'combination': input_data.get('combination'),
            'studentScore': float(input_data.get('studentScore', 0)),
            'admissionPredictions': [prediction_result],
            'metadata': {
                'dataVersion': '1.0',
                'createdAt': datetime.now(),
                'updatedAt': datetime.now()
            }
        }
        
        # Thêm userId hoặc anonymousId
        if 'userId' in input_data:
            document['userId'] = input_data['userId']
        else:
            import uuid
            document['anonymousId'] = f"anon_{uuid.uuid4().hex[:10]}"
        
        # Lưu vào DB
        db_client.insert_one('student_data', document)
        
    except Exception as e:
        # Log lỗi nhưng không dừng xử lý
        print(f"Lỗi khi lưu dữ liệu dự đoán: {e}")

# Thêm endpoint mới nếu cần
# @admission_api.route('/endpoint', methods=['GET', 'POST'])
# def new_endpoint():
#     pass 