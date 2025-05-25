import os
import sys
import json
import traceback
import numpy as np
import tensorflow as tf
from datetime import datetime
from flask import Blueprint, request, jsonify
from bson import ObjectId
from pymongo import MongoClient

# Thêm đường dẫn để import cần thiết
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(parent_dir)

# Import modules từ các file khác
from ai_models.goiynganhhoc.neural_network import MajorRecommendationModel
from ai_models.goiynganhhoc.data_preprocessing import DataPreprocessor

# Kết nối MongoDB
MONGODB_URI = os.getenv('MONGO_URI')
MONGODB_NAME = os.getenv('MONGO_DB_NAME')

print(f"Major Recommendation API MongoDB Configuration: URI={MONGODB_URI}, DB={MONGODB_NAME}")
client = MongoClient(MONGODB_URI)
db = client[MONGODB_NAME]

# Class để hỗ trợ serialization numpy arrays
class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

# Blueprint cho API gợi ý ngành học
major_recommendation_blueprint = Blueprint('major_recommendation', __name__)

# Cache cho model mappings để tránh truy vấn DB nhiều lần
_cached_model_mappings = None
_cached_timestamp = None

def get_active_model_mappings():
    """
    Lấy mapping đang active từ collection model_mappings
    
    Returns:
        Dictionary chứa các mapping đang active
    """
    global _cached_model_mappings, _cached_timestamp
    
    # Kiểm tra xem đã cache mapping chưa hoặc đã cache quá 1 giờ
    current_time = datetime.now()
    if _cached_model_mappings is None or _cached_timestamp is None or \
       (current_time - _cached_timestamp).total_seconds() > 3600:  # 1 giờ
        
        try:
            # Lấy mapping active từ MongoDB
            mapping_record = db.model_mappings.find_one(
                {"model_name": "major_recommendation", "active": True}
            )
            
            if mapping_record and 'mappings' in mapping_record:
                _cached_model_mappings = mapping_record['mappings']
                _cached_timestamp = current_time
                print(f"Đã tải mapping phiên bản {_cached_model_mappings.get('version', 'unknown')}")
            else:
                print("Không tìm thấy mapping active trong DB, sử dụng preprocessor mặc định")
                _cached_model_mappings = None
                
        except Exception as e:
            print(f"Lỗi khi lấy model mapping: {e}")
            _cached_model_mappings = None
            
    return _cached_model_mappings

def load_model():
    """
    Tải mô hình mới nhất đã lưu
    """
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
    
    # Kiểm tra thư mục model đã tồn tại chưa
    if not os.path.exists(model_dir):
        print(f"Thư mục {model_dir} không tồn tại.")
        return None
        
    # Lấy danh sách file model trong thư mục
    model_files = [f for f in os.listdir(model_dir) if f.endswith('.h5')]
    
    if not model_files:
        print("Không tìm thấy file mô hình nào.")
        return None
        
    # Lấy file mới nhất
    latest_model = sorted(model_files)[-1]
    model_path = os.path.join(model_dir, latest_model)
    
    print(f"Đang tải mô hình từ {model_path}...")
    try:
        model = MajorRecommendationModel.load(model_path)
        return model
    except Exception as e:
        print(f"Lỗi khi tải mô hình: {e}")
        return None

def load_scaler():
    """
    Tải scaler để chuẩn hóa dữ liệu
    """
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
    scaler_mean_path = os.path.join(model_dir, 'scaler_mean.npy')
    scaler_scale_path = os.path.join(model_dir, 'scaler_scale.npy')
    
    if not os.path.exists(scaler_mean_path) or not os.path.exists(scaler_scale_path):
        print("Không tìm thấy file scaler.")
        return None
    
    try:
        scaler_mean = np.load(scaler_mean_path)
        scaler_scale = np.load(scaler_scale_path)
        return (scaler_mean, scaler_scale)
    except Exception as e:
        print(f"Lỗi khi tải scaler: {e}")
        return None

def preprocess_data(data):
    """
    Chuyển đổi dữ liệu từ format của client sang format cho mô hình
    """
    transformed_data = {
        'scores': {},
        'interests': data.get('interests', []),
        'subject_groups': data.get('examBlocks', []) or data.get('subject_groups', []),
        'tohopthi': data.get('tohopthi', 'TN'),
        'priorityScore': data.get('priorityScore', 0)
    }
    
    # Chuyển đổi điểm số
    if 'scores' in data:
        if 'thpt' in data['scores']:
            # Mapping từ tên tiếng Anh sang tiếng Việt
            score_mapping = {
                'math': 'Toan',
                'literature': 'NguVan',
                'foreignLanguage': 'NgoaiNgu',
                'physics': 'VatLy',
                'chemistry': 'HoaHoc',
                'biology': 'SinhHoc',
                'history': 'LichSu',
                'geography': 'DiaLy',
                'civics': 'GDCD'
            }
            
            for eng_name, vie_name in score_mapping.items():
                if eng_name in data['scores']['thpt']:
                    transformed_data['scores'][vie_name] = data['scores']['thpt'][eng_name]
        else:
            # Nếu điểm đã được chuyển đổi từ frontend
            transformed_data['scores'] = data['scores']
    
    # Đảm bảo các giá trị điểm số là số
    for subject, score in transformed_data['scores'].items():
        try:
            transformed_data['scores'][subject] = float(score)
        except (ValueError, TypeError):
            print(f"Cảnh báo: Điểm môn {subject} không phải số hợp lệ: {score}, đặt về 0")
            transformed_data['scores'][subject] = 0.0
    
    return transformed_data

def preprocess_student_data_with_mappings(student_data, mappings=None):
    """
    Tiền xử lý dữ liệu học sinh sử dụng mapping từ model_mappings
    
    Args:
        student_data: Dictionary chứa thông tin học sinh
        mappings: Dictionary chứa các mapping, nếu None thì sử dụng mappings từ DB
        
    Returns:
        features: numpy array chứa đặc trưng đã tiền xử lý
    """
    # Nếu không có mappings, lấy từ DB
    if mappings is None:
        mappings = get_active_model_mappings()
    
    # Nếu vẫn không tìm thấy mapping, sử dụng DataPreprocessor mặc định
    if mappings is None:
        preprocessor = DataPreprocessor()
        return preprocessor.preprocess_student_data(student_data)
    
    # Sử dụng phương thức tĩnh preprocess_with_mappings từ DataPreprocessor
    return DataPreprocessor.preprocess_with_mappings(student_data, mappings)

def find_best_combination_score(student_data):
    """Tìm tổ hợp môn và điểm cao nhất của học sinh"""
    combinations = {
        'A00': ['Toan', 'VatLy', 'HoaHoc'],
        'A01': ['Toan', 'VatLy', 'NgoaiNgu'],
        'B00': ['Toan', 'HoaHoc', 'SinhHoc'],
        'C00': ['NguVan', 'LichSu', 'DiaLy'],
        'D01': ['Toan', 'NguVan', 'NgoaiNgu']
    }
    
    scores = student_data.get('scores', {})
    best_score = 0
    best_combo = None
    
    for combo_code, subjects in combinations.items():
        total = 0
        valid = True
        
        for subject in subjects:
            if subject in scores and scores[subject] is not None:
                total += float(scores[subject])
            else:
                valid = False
                break
                
        if valid and total > best_score:
            best_score = total
            best_combo = combo_code
    
    # Thêm điểm ưu tiên nếu có
    priority_score = float(student_data.get('priorityScore', 0))
    
    return best_combo, best_score + priority_score

def normalize_scores(raw_scores):
    """Chuẩn hóa điểm từ mô hình thành thang [0-1]"""
    # Áp dụng softmax hoặc min-max normalization
    exp_scores = np.exp(raw_scores - np.max(raw_scores))
    normalized = exp_scores / exp_scores.sum()
    
    # Tăng độ phù hợp bằng cách áp dụng hàm mũ
    enhanced_scores = np.power(normalized, 0.3)  # Sử dụng mũ 0.3 để tăng giá trị
    enhanced_normalized = enhanced_scores / enhanced_scores.sum()
    
    # Đảm bảo tổng các giá trị vẫn = 1
    return enhanced_normalized

def find_universities_with_major(major_name):
    """
    Tìm các trường đại học có đào tạo ngành học cụ thể
    
    Args:
        major_name: Tên ngành học
        
    Returns:
        Danh sách các trường đại học có đào tạo ngành này
    """
    try:
        print(f"Tìm kiếm trường cho ngành: '{major_name}'")
        
        # Tìm ngành trong MongoDB sử dụng collection benchmark_scores
        benchmark_collection = db.benchmark_scores
        
        # Tìm kiếm không phân biệt chữ hoa thường
        benchmark_records = list(benchmark_collection.find(
            {'major': {'$regex': f"^{major_name}$", '$options': 'i'}}
        ))
        
        # Nếu không tìm thấy, thử tìm kiếm dựa trên việc ngành có chứa tên ngành đầu vào
        if not benchmark_records:
            print(f"Không tìm thấy ngành '{major_name}' chính xác, thử tìm gần đúng...")
            benchmark_records = list(benchmark_collection.find(
                {'major': {'$regex': major_name, '$options': 'i'}}
            ))
        
        if not benchmark_records:
            print(f"Không tìm thấy thông tin về ngành {major_name} trong benchmark_scores")
            
            # Thử in ra một số ngành có trong DB để debug
            sample_majors = list(benchmark_collection.find({}, {"major": 1}).limit(5).distinct("major"))
            print(f"Một số ngành có trong DB: {sample_majors}")
            
            return []
        
        print(f"Đã tìm thấy {len(benchmark_records)} bản ghi cho ngành '{major_name}'")
        
        # Gom nhóm các bản ghi theo trường đại học
        university_map = {}
        
        for record in benchmark_records:
            uni_name = record.get('university', '')
            uni_code = record.get('university_code', '')
            subject_group_code = record.get('subject_combination', '')
            benchmark_score = float(record.get('benchmark_score', 0))
            
            # Tạo key cho trường đại học
            uni_key = f"{uni_name}_{uni_code}"
            
            if uni_key not in university_map:
                university_map[uni_key] = {
                    'name': uni_name,
                    'code': uni_code,
                    'subject_groups': []
                }
            
            # Thêm tổ hợp môn vào danh sách nếu chưa tồn tại
            subject_group_exists = False
            for sg in university_map[uni_key]['subject_groups']:
                if sg['code'] == subject_group_code:
                    subject_group_exists = True
                    break
            
            if not subject_group_exists and subject_group_code:
                university_map[uni_key]['subject_groups'].append({
                    'code': subject_group_code,
                    'benchmark_score': benchmark_score
                })
        
        # Chuyển map thành danh sách
        universities = list(university_map.values())
        
        # Đảm bảo mọi trường đều có ít nhất một tổ hợp môn
        for university in universities:
            if not university['subject_groups']:
                default_groups = [
                    {'code': 'A00', 'benchmark_score': 25.0},
                    {'code': 'A01', 'benchmark_score': 24.5},
                    {'code': 'D01', 'benchmark_score': 24.0}
                ]
                university['subject_groups'] = default_groups
        
        return universities
    
    except Exception as e:
        print(f"Lỗi khi tìm trường ĐH cho ngành {major_name}: {e}")
        import traceback
        traceback.print_exc()
        return []

def calculate_student_score_for_subject_group(student_data, subject_group_code):
    """
    Tính tổng điểm của học sinh cho một tổ hợp môn
    
    Args:
        student_data: Dictionary chứa điểm của học sinh
        subject_group_code: Mã tổ hợp môn (A00, A01, ...)
        
    Returns:
        Tổng điểm của học sinh cho tổ hợp môn
    """
    # Mapping từ mã tổ hợp môn sang các môn học
    subject_combinations = {
        'A00': ['Toan', 'VatLy', 'HoaHoc'],
        'A01': ['Toan', 'VatLy', 'NgoaiNgu'],
        'B00': ['Toan', 'HoaHoc', 'SinhHoc'],
        'C00': ['NguVan', 'LichSu', 'DiaLy'],
        'D01': ['Toan', 'NguVan', 'NgoaiNgu'],
        'C01': ['NguVan', 'Toan', 'VatLy'],
        'D07': ['Toan', 'HoaHoc', 'NgoaiNgu']
    }
    
    # Nếu không tìm thấy tổ hợp môn, trả về 0
    if subject_group_code not in subject_combinations:
        print(f"Không tìm thấy tổ hợp môn {subject_group_code}")
        return 0
    
    # Lấy danh sách môn học trong tổ hợp
    subjects = subject_combinations[subject_group_code]
    
    # Tính tổng điểm
    total_score = 0
    scores = student_data.get('scores', {})
    
    for subject in subjects:
        if subject in scores:
            total_score += float(scores[subject])
    
    # Thêm điểm ưu tiên nếu có
    priority_score = float(student_data.get('priorityScore', 0))
    
    return total_score + priority_score

def find_best_combination_for_student(subject_groups, student_data):
    """
    Tìm tổ hợp môn tốt nhất cho học sinh dựa trên điểm
    
    Args:
        subject_groups: Danh sách các tổ hợp môn của trường
        student_data: Dictionary chứa điểm của học sinh
        
    Returns:
        Tổ hợp môn tốt nhất cho học sinh
    """
    best_combination = None
    best_score_diff = -100  # Chênh lệch tốt nhất (điểm học sinh - điểm chuẩn)
    
    for group in subject_groups:
        # Tính điểm của học sinh cho tổ hợp môn này
        student_score = calculate_student_score_for_subject_group(student_data, group['code'])
        benchmark_score = group['benchmark_score']
        score_diff = student_score - benchmark_score
        
        # Cập nhật nếu tìm thấy tổ hợp tốt hơn
        if score_diff > best_score_diff:
            best_score_diff = score_diff
            
            # Xác định mức độ an toàn
            safety_level = "Khó đậu"
            if student_score >= benchmark_score + 1:
                safety_level = "An toàn"
            elif student_score >= benchmark_score:
                safety_level = "Cân nhắc"
            
            best_combination = {
                'code': group['code'],
                'benchmark_score': benchmark_score,
                'student_score': student_score,
                'safety_level': safety_level
            }
    
    # Trả về tổ hợp mặc định nếu không tìm thấy tổ hợp nào phù hợp
    if not best_combination:
        return {
            'code': 'A00',
            'benchmark_score': 0,
            'student_score': 0,
            'safety_level': 'Khó đậu'
        }
    
    return best_combination

def find_suitable_universities(major_name, student_data):
    """
    Tìm các trường đại học phù hợp với ngành học và điểm của học sinh
    
    Args:
        major_name: Tên ngành học
        student_data: Dictionary chứa thông tin học sinh
        
    Returns:
        Danh sách các trường đại học phù hợp
    """
    # Tìm các trường có đào tạo ngành học này
    universities = find_universities_with_major(major_name)
    
    if not universities:
        print(f"Không tìm thấy trường đào tạo ngành {major_name}")
        # Trả về một số trường mặc định
        return default_university_fallback(student_data)
    
    suitable_universities = []
    for university in universities:
        # Tính điểm của học sinh cho từng tổ hợp môn của trường
        for subject_group in university['subject_groups']:
            student_score = calculate_student_score_for_subject_group(
                student_data, subject_group['code'])
            
            # Tính toán mức độ an toàn khi xét tuyển
            safety_level = "Khó đậu"
            if student_score >= subject_group['benchmark_score'] + 1:
                safety_level = "An toàn"
            elif student_score >= subject_group['benchmark_score']:
                safety_level = "Cân nhắc"
            
            # Thêm điểm học sinh và mức độ an toàn vào thông tin tổ hợp môn
            subject_group['student_score'] = student_score
            subject_group['safety_level'] = safety_level
        
        # Tìm tổ hợp môn tốt nhất cho học sinh
        best_combination = find_best_combination_for_student(
            university['subject_groups'], student_data)
            
        # Thêm vào danh sách trường phù hợp với thông tin xét tuyển
        suitable_universities.append({
            'university_name': university['name'],
            'benchmark_score': best_combination['benchmark_score'],
            'student_score': best_combination['student_score'],
            'combination': best_combination['code'],
            'safety_level': best_combination['safety_level']
        })
    
    # Sắp xếp theo mức độ an toàn và chênh lệch điểm
    suitable_universities.sort(key=lambda x: (
        0 if x['safety_level'] == "An toàn" else 
        (1 if x['safety_level'] == "Cân nhắc" else 2),
        x['benchmark_score']
    ))
    
    return suitable_universities

def default_university_fallback(student_data):
    """
    Trả về danh sách trường đại học mặc định khi không tìm thấy thông tin
    
    Args:
        student_data: Dictionary chứa thông tin học sinh
        
    Returns:
        Danh sách các trường đại học mặc định
    """
    # Tìm tổ hợp môn tốt nhất
    best_combination, total_score = find_best_combination_score(student_data)
    
    default_universities = [
        {"name": "Đại học Quốc gia Hà Nội", "score": 25},
        {"name": "Đại học Bách Khoa Hà Nội", "score": 26}, 
        {"name": "Đại học Ngoại thương", "score": 25.5}
    ]
    
    result = []
    for uni in default_universities:
        safety_level = "Khó đậu"
        if total_score >= uni["score"] + 1:
            safety_level = "An toàn"
        elif total_score >= uni["score"]:
            safety_level = "Cân nhắc"
        
        result.append({
            'university_name': uni["name"],
            'benchmark_score': uni["score"],
            'student_score': total_score,
            'combination': best_combination,
            'safety_level': safety_level
        })
    
    return result

def predict_recommended_majors(student_data, top_k=3):
    """
    Dự đoán ngành học phù hợp với học sinh
    
    Args:
        student_data: Dictionary chứa thông tin học sinh
        top_k: Số lượng ngành gợi ý trả về
        
    Returns:
        List các ngành phù hợp nhất với thông tin chi tiết
    """
    try:
        # Lấy mapping từ model_mappings collection
        mappings = get_active_model_mappings()
        
        # Tải mô hình và scaler
        model = load_model()
        scaler = load_scaler()
        
        if model is None or scaler is None:
            raise ValueError("Không thể tải mô hình hoặc scaler")
        
        # Tiền xử lý dữ liệu học sinh sử dụng mapping
        if mappings:
            print("Sử dụng mappings từ model_mappings collection")
            features = preprocess_student_data_with_mappings(student_data, mappings)
            id_to_major = {int(k): v for k, v in mappings.get('id_to_major', {}).items()}
        else:
            # Fallback: Sử dụng preprocessor mặc định nếu không tìm thấy mappings
            print("Không tìm thấy mappings, sử dụng preprocessor mặc định")
            preprocessor = DataPreprocessor()
            features = preprocessor.preprocess_student_data(student_data)
            id_to_major = preprocessor.id_to_major
        
        # Chuẩn hóa đặc trưng
        scaler_mean, scaler_scale = scaler
        features_scaled = (features.reshape(1, -1) - scaler_mean) / scaler_scale
        
        # Dự đoán ngành học - lấy trực tiếp output sigmoid
        predictions = model.predict_combined(features_scaled)[0]
        
        # Lấy top-k ngành có điểm sigmoid cao nhất
        top_indices = np.argsort(predictions)[::-1][:top_k]
        
        # Tìm tổ hợp môn tốt nhất
        best_combination, total_score = find_best_combination_score(student_data)
        
        # Danh sách mô tả ngành mặc định (backup)
        major_descriptions = {
            "Công nghệ thông tin": "Ngành học nghiên cứu về các hệ thống xử lý thông tin, đặc biệt là các hệ thống phần mềm và phần cứng máy tính.",
            "Kỹ thuật phần mềm": "Ngành học tập trung vào quy trình phát triển phần mềm chất lượng cao, bao gồm các phương pháp phân tích, thiết kế và kiểm thử.",
            "Khoa học máy tính": "Ngành học chuyên sâu về các nguyên lý và lý thuyết của khoa học máy tính, thuật toán và trí tuệ nhân tạo.",
            "Kỹ thuật điện tử": "Nghiên cứu về thiết kế và phát triển các thiết bị điện tử, mạch tích hợp và hệ thống nhúng."
        }
        
        # Danh sách danh mục ngành mặc định (backup)
        major_categories = {
            "Công nghệ thông tin": "Công nghệ thông tin",
            "Kỹ thuật phần mềm": "Công nghệ thông tin",
            "Khoa học máy tính": "Công nghệ thông tin",
            "Kỹ thuật điện tử": "Kỹ thuật"
        }
        
        # Tạo danh sách kết quả
        recommendations = []
        
        # Khởi tạo preprocessor để lấy thông tin ngành học
        preprocessor = DataPreprocessor()
        
        for idx in top_indices:
            # Lấy tên ngành
            idx_int = int(idx)
            print(f"Đang xử lý ngành ID: {idx_int}")
            
            # Tìm tên ngành từ id_to_major trong mappings
            if idx_int in id_to_major:
                major_name = id_to_major[idx_int]
                print(f"Tìm thấy tên ngành trong id_to_major: {major_name}")
            else:
                # Fallback: Thử lấy từ get_major_by_id
                major_name = preprocessor.get_major_by_id(idx_int)
                print(f"Lấy tên ngành từ get_major_by_id: {major_name}")
            
            # Lấy điểm phù hợp trực tiếp từ output sigmoid của mô hình
            confidence = float(predictions[idx])  # Chuyển thành phần trăm
            
            # Lấy thông tin ngành học từ DB
            print(f"Tìm thông tin ngành học từ DB cho: {major_name}")
            major_info = preprocessor.get_major_info(major_name)
            
            # Tìm sở thích phù hợp với ngành
            matching_interests = []
            if 'interests' in major_info:
                for interest_obj in major_info['interests']:
                    if isinstance(interest_obj, dict) and 'name' in interest_obj:
                        interest_name = interest_obj['name']
                        if interest_name in student_data.get('interests', []):
                            matching_interests.append(interest_name)
            
            # Thêm mô tả mặc định nếu không có trong DB
            description = major_info.get('description', '')
            if not description and major_name in major_descriptions:
                description = major_descriptions[major_name]
                
            # Thêm danh mục mặc định nếu không có trong DB
            category = major_info.get('category', '')
            if not category and major_name in major_categories:
                category = major_categories[major_name]
            else:
                category = "Chưa phân loại"
            
            # Tìm các trường đại học phù hợp sử dụng phương pháp từ dự án cũ
            suitable_universities = find_suitable_universities(major_name, student_data)
            
            # Tạo đối tượng recommendation
            recommendation = {
                'major_name': major_name,
                'major': major_name,  # Thêm trường này để tương thích với API cũ
                'confidence': confidence,
                'compatibility': f"{confidence:.2f}%",  # Dạng chuỗi: "85.45%"
                'compatibility_value': confidence,  # Dạng số: 85.45
                'category': category,
                'matching_interests': matching_interests,
                'description': description,
                'best_combination': best_combination,
                'student_score': total_score,
                'suitable_universities': suitable_universities
            }
            
            recommendations.append(recommendation)
        
        return recommendations
    
    except Exception as e:
        print(f"Lỗi khi dự đoán ngành học: {e}")
        traceback.print_exc()
        return None

@major_recommendation_blueprint.route('/recommend', methods=['POST'])
def recommend_majors():
    try:
        # Lấy dữ liệu từ request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Không có dữ liệu đầu vào'
            }), 400
        
        print("Dữ liệu đầu vào:", json.dumps(data, indent=2, cls=NpEncoder))
        
        # Tiền xử lý dữ liệu
        transformed_data = preprocess_data(data)
        
        # Kiểm tra các trường bắt buộc
        required_fields = ['scores', 'interests', 'subject_groups']
        for field in required_fields:
            if field not in transformed_data:
                return jsonify({
                    'success': False,
                    'message': f'Thiếu trường {field}'
                }), 400
        
        # Dự đoán ngành học phù hợp (chỉ lấy top 3)
        recommendations = predict_recommended_majors(transformed_data, top_k=3)
        
        if not recommendations:
            return jsonify({
                'success': False,
                'message': 'Không có kết quả dự đoán từ mô hình',
                'error': 'NO_RESULTS'
            }), 500
        
        # Chuẩn bị dữ liệu để lưu log
        user_id = data.get('userId', None)
        
        # Nếu userId không có hoặc rỗng thì sử dụng số điện thoại (nếu có)
        if not user_id and 'phone' in data:
            user_id = data.get('phone')
        
        # Tạo log dữ liệu
        log_data = {
            "userId": user_id,
            "timestamp": datetime.now(),
            "modelType": "major_recommendation",
            "inputs": transformed_data,
            "outputs": recommendations,
            "isUseful": None,  # Sẽ được cập nhật khi có feedback
            "feedback": None   # Sẽ được cập nhật khi có feedback
        }
        
        # Lưu vào MongoDB và lấy id của bản ghi
        log_id = db.prediction_logs.insert_one(log_data).inserted_id
        
        # Trả về kết quả
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            '_id': str(log_id)  # Thêm ID của log để frontend có thể sử dụng cho feedback
        }), 200
        
    except Exception as e:
        print(f"Lỗi khi gợi ý ngành học: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f"Đã xảy ra lỗi: {str(e)}",
            'error': 'INTERNAL_ERROR'
        }), 500

@major_recommendation_blueprint.route('/feedback', methods=['POST'])
def update_feedback():
    try:
        data = request.get_json()
        
        if not data or 'predictionId' not in data:
            return jsonify({
                'success': False,
                'message': 'Thiếu thông tin predictionId'
            }), 400
            
        prediction_id = data.get('predictionId')
        is_useful = data.get('isUsful')
        feedback_text = data.get('feedback')
        
        # Cập nhật log trong MongoDB
        result = db.prediction_logs.update_one(
            {'_id': ObjectId(prediction_id)},
            {'$set': {
                'isUseful': is_useful,
                'feedback': feedback_text,
                'feedbackDate': datetime.now()
            }}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Đã cập nhật feedback thành công'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy dự đoán với ID đã cung cấp'
            }), 404
            
    except Exception as e:
        print(f"Lỗi khi cập nhật feedback: {e}")
        return jsonify({
            'success': False,
            'message': f"Đã xảy ra lỗi: {str(e)}"
        }), 500 