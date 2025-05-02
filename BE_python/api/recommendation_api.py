import os
import sys
import json
import numpy as np
from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import MODEL_DIR
from utils.db_utils import db_client
from ai_models.data_preprocessing import DataPreprocessor
from ai_models.neural_network import MajorRecommendationModel

# Tạo blueprint cho API
recommendation_api = Blueprint('recommendation_api', __name__)

# Đường dẫn tới mô hình đã huấn luyện
MODEL_PATH = os.path.join(MODEL_DIR, 'major_recommendation_model.keras')

# Biến toàn cục cho mô hình và preprocessor (lazy loading)
_model = None
_preprocessor = None

def get_model():
    """Lazy loading mô hình"""
    global _model
    if _model is None:
        try:
            _model = MajorRecommendationModel.load(MODEL_PATH)
        except Exception as e:
            raise RuntimeError(f"Không thể tải mô hình gợi ý ngành học: {e}")
    return _model

def get_preprocessor():
    """Lazy loading preprocessor"""
    global _preprocessor
    if _preprocessor is None:
        try:
            _preprocessor = DataPreprocessor(db_client)
        except Exception as e:
            raise RuntimeError(f"Không thể khởi tạo preprocessor: {e}")
    return _preprocessor

@recommendation_api.route('/health', methods=['GET'])
def health_check():
    """Kiểm tra trạng thái hoạt động của API"""
    return jsonify({
        'status': 'ok',
        'model_loaded': _model is not None,
        'preprocessor_loaded': _preprocessor is not None
    })

@recommendation_api.route('/recommend', methods=['POST'])
def recommend_majors():
    """
    API gợi ý ngành học
    
    Nhận JSON:
    {
        "scores": {
            "Toan": 8.0,
            "NguVan": 7.5,
            "VatLy": 9.0,
            "HoaHoc": 9.0,
            ...
        },
        "tohopthi": "TN",
        "priority": {
            "area": "KV2",
            "subject": "01"
        },
        "interests": ["Lập trình", "Máy tính", "Công nghệ"],
        "subject_groups": ["A01", "A00"]
    }
    
    Trả về JSON:
    {
        "recommendations": [
            {
                "major_name": "công nghệ thông tin",
                "category": "Công nghệ - Kỹ thuật",
                "confidence": 0.88,
                "matching_interests": ["Lập trình", "Máy tính"],
                "suitable_universities": [
                    {
                        "university_name": "Đại học Bách Khoa TP.HCM",
                        "subject_groups": [
                            {
                                "code": "A01",
                                "min_score": 26.5,
                                "student_score": 26.0,
                                "result": "Không đạt"
                            }
                        ]
                    }
                ]
            }
        ]
    }
    """
    try:
        # Lấy dữ liệu từ request
        data = request.json
        if not data:
            raise BadRequest("Dữ liệu đầu vào không hợp lệ")
        
        # Kiểm tra và làm sạch dữ liệu đầu vào
        student_data = validate_and_clean_input(data)
        
        # Lấy mô hình và preprocessor
        model = get_model()
        preprocessor = get_preprocessor()
        
        # Tiền xử lý dữ liệu học sinh
        X_student = preprocessor.preprocess_student_data(student_data)
        X_student = np.expand_dims(X_student, axis=0)  # Thêm chiều batch
        
        # Lấy trọng số xu hướng thị trường
        market_trend_weights = preprocessor.get_market_trend_weights()
        
        # Dự đoán ngành học phù hợp
        top_k = int(request.args.get('top_k', 3))  # Số lượng gợi ý mặc định là 3
        recommendations = model.predict(X_student, market_trend_weights, top_k)
        
        # Định dạng kết quả
        result = format_recommendations(recommendations, preprocessor, student_data)
        
        # Lưu dữ liệu học sinh và kết quả gợi ý vào DB (nếu cần)
        if request.args.get('save', 'true').lower() == 'true':
            save_student_data(student_data, result)
        
        return jsonify({'recommendations': result})
    
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f"Lỗi khi xử lý yêu cầu: {str(e)}"}), 500

def validate_and_clean_input(data):
    """
    Kiểm tra và làm sạch dữ liệu đầu vào
    
    Args:
        data: Dữ liệu đầu vào từ request
        
    Returns:
        Dữ liệu đã được làm sạch
    """
    # Kiểm tra điểm số
    if 'scores' not in data or not isinstance(data['scores'], dict):
        raise BadRequest("Thiếu điểm số hoặc dữ liệu không hợp lệ")
    
    # Kiểm tra điểm Toán và Văn (bắt buộc)
    if 'Toan' not in data['scores'] or 'NguVan' not in data['scores']:
        raise BadRequest("Điểm Toán và Văn là bắt buộc")
    
    # Kiểm tra tổ hợp thi
    if 'tohopthi' not in data or data['tohopthi'] not in ['TN', 'XH']:
        raise BadRequest("Tổ hợp thi không hợp lệ (phải là 'TN' hoặc 'XH')")
    
    # Kiểm tra sở thích
    if 'interests' not in data or not isinstance(data['interests'], list):
        raise BadRequest("Thiếu sở thích hoặc dữ liệu không hợp lệ")
    
    if len(data['interests']) > 3:
        # Giới hạn số lượng sở thích
        data['interests'] = data['interests'][:3]
    
    # Kiểm tra tổ hợp môn
    if 'subject_groups' not in data or not isinstance(data['subject_groups'], list):
        raise BadRequest("Thiếu tổ hợp môn hoặc dữ liệu không hợp lệ")
    
    if len(data['subject_groups']) > 2:
        # Giới hạn số lượng tổ hợp môn
        data['subject_groups'] = data['subject_groups'][:2]
    
    return data

def format_recommendations(recommendations, preprocessor, student_data):
    """
    Định dạng kết quả gợi ý ngành học
    
    Args:
        recommendations: Kết quả từ mô hình
        preprocessor: Instance của DataPreprocessor
        student_data: Dữ liệu học sinh
        
    Returns:
        Danh sách các gợi ý đã được định dạng
    """
    result = []
    seen_majors = set()  # Để tránh trùng lặp tên ngành
    
    for major_id, probability in recommendations:
        major_name = preprocessor.get_major_by_id(major_id)
        
        # Bỏ qua nếu ngành đã xuất hiện
        if major_name in seen_majors:
            continue
        seen_majors.add(major_name)
        
        # Lấy thông tin ngành
        major_info = preprocessor.get_major_info(major_name)
        
        # Tìm các trường phù hợp
        suitable_universities = find_suitable_universities(major_name, student_data)
        
        # Tìm các sở thích phù hợp
        matching_interests = []
        if 'interests' in major_info:
            for interest in student_data.get('interests', []):
                if any(i['name'] == interest for i in major_info['interests']):
                    matching_interests.append(interest)
        
        # Thêm vào kết quả
        result.append({
            "major_name": major_name,
            "category": major_info.get("category", "Không xác định"),
            "confidence": float(probability),
            "description": major_info.get("description", ""),
            "matching_interests": matching_interests,
            "suitable_universities": suitable_universities
        })
    
    return result

def find_suitable_universities(major_name, student_data):
    """
    Tìm các trường phù hợp với ngành học và điểm của học sinh
    
    Args:
        major_name: Tên ngành học
        student_data: Dữ liệu học sinh
        
    Returns:
        Danh sách các trường phù hợp
    """
    # Lấy danh sách trường có ngành này
    admission_criteria = db_client.fetch_data(
        'admission_criteria',
        {'majorName': major_name},
        sort=[('universityName', 1)]
    )
    
    if not admission_criteria:
        return []
    
    result = []
    processed_universities = set()
    
    for criteria in admission_criteria:
        university_name = criteria.get('universityName')
        
        # Bỏ qua nếu đã xử lý trường này
        if university_name in processed_universities:
            continue
        
        # Lấy tất cả tiêu chí của trường này và ngành này
        university_criteria = [c for c in admission_criteria 
                              if c.get('universityName') == university_name]
        
        # Tính điểm tổ hợp môn của học sinh
        subject_group_results = []
        
        for uc in university_criteria:
            # Lấy điểm chuẩn mới nhất
            quota_data = uc.get('quota', [])
            if not quota_data:
                continue
                
            # Sắp xếp theo năm giảm dần
            sorted_quota = sorted(quota_data, key=lambda x: x.get('year', 0), reverse=True)
            
            # Lấy điểm chuẩn năm gần nhất
            latest_quota = sorted_quota[0] if sorted_quota else None
            if not latest_quota:
                continue
            
            # Kiểm tra các tổ hợp môn
            for sg in student_data.get('subject_groups', []):
                # Tính điểm tổ hợp của học sinh
                student_score = calculate_student_score_for_subject_group(student_data, sg)
                
                # Kiểm tra điểm chuẩn
                min_score = latest_quota.get('minScore', 0)
                
                # Thêm vào kết quả
                subject_group_results.append({
                    "code": sg,
                    "min_score": min_score,
                    "student_score": student_score,
                    "result": "Đạt" if student_score >= min_score else "Không đạt"
                })
        
        # Chỉ thêm trường vào kết quả nếu có ít nhất một tổ hợp môn
        if subject_group_results:
            result.append({
                "university_name": university_name,
                "subject_groups": subject_group_results
            })
            
            processed_universities.add(university_name)
    
    return result

def calculate_student_score_for_subject_group(student_data, subject_group):
    """
    Tính điểm tổ hợp môn của học sinh
    
    Args:
        student_data: Dữ liệu học sinh
        subject_group: Mã tổ hợp môn (vd: A00, D01)
    
    Returns:
        Tổng điểm tổ hợp
    """
    # Mapping tổ hợp môn (đơn giản hóa, cần bổ sung đầy đủ)
    subject_group_mapping = {
        'A00': ['Toan', 'VatLy', 'HoaHoc'],
        'A01': ['Toan', 'VatLy', 'NgoaiNgu'],
        'B00': ['Toan', 'HoaHoc', 'SinhHoc'],
        'C00': ['NguVan', 'LichSu', 'DiaLy'],
        'D01': ['NguVan', 'Toan', 'NgoaiNgu'],
        # Thêm các tổ hợp khác ở đây
    }
    
    # Nếu không có mapping cho tổ hợp này, trả về 0
    if subject_group not in subject_group_mapping:
        return 0
    
    # Tính tổng điểm
    total_score = 0
    for subject in subject_group_mapping[subject_group]:
        if subject in student_data.get('scores', {}):
            total_score += student_data['scores'][subject]
    
    # Cộng điểm ưu tiên nếu có
    if 'priority' in student_data:
        priority_area = student_data['priority'].get('area')
        priority_subject = student_data['priority'].get('subject')
        
        # Điểm ưu tiên khu vực
        area_points = {
            'KV1': 0.75,
            'KV2': 0.5,
            'KV3': 0.25
        }.get(priority_area, 0)
        
        # Điểm ưu tiên đối tượng
        subject_points = {
            '01': 2.0,
            '02': 1.5,
            '03': 1.0,
            '04': 0.5,
            '05': 0.5,
            '06': 0.5,
            '07': 0.5
        }.get(priority_subject, 0)
        
        # Cộng điểm ưu tiên (tối đa 4 điểm)
        total_score += min(area_points + subject_points, 4.0)
    
    return total_score

def save_student_data(student_data, recommendations):
    """
    Lưu dữ liệu học sinh và kết quả gợi ý vào DB
    
    Args:
        student_data: Dữ liệu học sinh
        recommendations: Kết quả gợi ý
    """
    try:
        # Tạo document để lưu vào collection student_data
        document = {
            'scores': student_data.get('scores', {}),
            'tohopthi': student_data.get('tohopthi', ''),
            'priority': student_data.get('priority', {}),
            'interests': student_data.get('interests', []),
            'subject_groups': student_data.get('subject_groups', []),
            'recommendations': recommendations,
            'metadata': {
                'dataVersion': '1.0',
                'createdAt': datetime.now(),
                'updatedAt': datetime.now()
            }
        }
        
        # Thêm anonymousId nếu không có userId
        if 'userId' not in student_data:
            import uuid
            document['anonymousId'] = f"anon_{uuid.uuid4().hex[:10]}"
        else:
            document['userId'] = student_data['userId']
        
        # Lưu vào DB
        db_client.insert_one('student_data', document)
        
    except Exception as e:
        # Log lỗi nhưng không dừng xử lý
        print(f"Lỗi khi lưu dữ liệu học sinh: {e}")

# Thêm endpoint mới nếu cần
# @recommendation_api.route('/endpoint', methods=['GET', 'POST'])
# def new_endpoint():
#     pass 