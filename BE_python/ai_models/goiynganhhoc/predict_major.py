import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from pymongo import MongoClient
import sys

def load_model_and_scaler():
    """
    Tải mô hình dự đoán gợi ý ngành học và bộ scaler
    
    Returns:
        model: Mô hình đã được đào tạo
        scaler: Tuple (scaler_mean, scaler_scale) dùng để chuẩn hóa dữ liệu
        features_info: Thông tin về các đặc trưng mô hình sử dụng
    """
    model_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(model_dir, 'model', 'major_recommendation_model.h5')
    scaler_mean_path = os.path.join(model_dir, 'model', 'scaler_mean.npy')
    scaler_scale_path = os.path.join(model_dir, 'model', 'scaler_scale.npy')
    
    # Kiểm tra xem file mô hình tồn tại không
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Không tìm thấy mô hình tại: {model_path}")
    
    # Kiểm tra scaler
    if not os.path.exists(scaler_mean_path) or not os.path.exists(scaler_scale_path):
        raise FileNotFoundError(f"Không tìm thấy file scaler tại: {scaler_mean_path} hoặc {scaler_scale_path}")
    
    # Tải mô hình
    model = load_model(model_path)
    
    # Tải scaler
    scaler_mean = np.load(scaler_mean_path)
    scaler_scale = np.load(scaler_scale_path)
    scaler = (scaler_mean, scaler_scale)
    
    # Thông tin về các đặc trưng
    features_info = {
        "subjects": ["Toan", "NguVan", "VatLy", "HoaHoc", "SinhHoc", "LichSu", "DiaLy", "GDCD", "NgoaiNgu"],
        "tohopthi": ["TN", "XH"],
        # Các thông tin khác sẽ lấy từ MongoDB
    }
    
    return model, scaler, features_info

def preprocess_student_data(student_data, db):
    """
    Tiền xử lý dữ liệu của một học sinh để đưa vào mô hình dự đoán
    
    Args:
        student_data: Dictionary chứa thông tin điểm số, sở thích và tổ hợp môn
        db: Kết nối MongoDB
        
    Returns:
        features: Mảng numpy chứa đặc trưng đã tiền xử lý
        metadata: Thông tin bổ sung để hiển thị kết quả
    """
    # Lấy dữ liệu từ MongoDB
    interests = list(db.interests.find())
    subject_combinations = list(db.subject_combinations.find())
    majors = list(db.majors.find())
    
    if not interests:
        raise ValueError("Không tìm thấy dữ liệu sở thích trong cơ sở dữ liệu")
    
    if not subject_combinations:
        raise ValueError("Không tìm thấy dữ liệu tổ hợp môn trong cơ sở dữ liệu")
        
    if not majors:
        raise ValueError("Không tìm thấy dữ liệu ngành học trong cơ sở dữ liệu")
    
    # Tạo mapping
    interest_to_id = {interest['name']: i for i, interest in enumerate(interests)}
    subject_comb_to_id = {comb['code']: i for i, comb in enumerate(subject_combinations)}
    major_to_id = {}
    id_to_major = {}
    
    # Debug thông tin ngành học
    print(f"\n===== DEBUG THÔNG TIN NGÀNH HỌC =====")
    print(f"Số lượng ngành trong DB: {len(majors)}")
    
    # Kiểm tra thông tin sở thích cho mỗi ngành
    major_with_interests = 0
    for major in majors:
        if 'interests' in major and isinstance(major['interests'], list):
            major_with_interests += 1
    
    print(f"Số ngành có trường interests: {major_with_interests}/{len(majors)}")
    
    for i, major in enumerate(majors):
        name = major['name']
        major_to_id[name] = i
        
        # Lấy đầy đủ thông tin ngành học
        # Chú ý: Trong MongoDB, interests là mảng các object {interestId, name, weight}
        # Cần trích xuất chỉ tên sở thích
        major_interests = []
        if 'interests' in major and isinstance(major['interests'], list):
            for interest_obj in major['interests']:
                if isinstance(interest_obj, dict) and 'name' in interest_obj:
                    major_interests.append(interest_obj['name'])
        
        id_to_major[i] = {
            'name': name, 
            'id': str(major['_id']), 
            'description': major.get('description', ''),
            'category': major.get('category', 'Chưa phân loại'),
            'interests': major_interests  # Lưu mảng tên sở thích đã trích xuất
        }
        
        # Debug một số ngành để kiểm tra
        if i < 3 or name == "Nuôi trồng thủy sản":  # Debug thêm ngành đang có vấn đề
            print(f"Ngành {name}: có {len(major_interests)} sở thích")
            if major_interests:
                print(f"- Sở thích đã trích xuất: {major_interests}")
                # In cấu trúc sở thích gốc để debug
                if 'interests' in major:
                    print(f"- Cấu trúc sở thích gốc (1 mẫu): {major['interests'][0] if major['interests'] else 'N/A'}")
    
    # Danh sách các môn học
    subjects = ['Toan', 'NguVan', 'VatLy', 'HoaHoc', 'SinhHoc', 'LichSu', 'DiaLy', 'GDCD', 'NgoaiNgu']
    
    # Xử lý điểm số (9 môn)
    scores = np.zeros(9)
    for i, subject in enumerate(subjects):
        if subject in student_data.get('scores', {}):
            scores[i] = float(student_data['scores'].get(subject, 0)) / 10.0  # Chuẩn hóa về [0,1]
    
    # Xử lý khối thi (TN, XH)
    tohopthi = np.zeros(2)  # TN, XH
    if 'tohopthi' in student_data:
        if student_data['tohopthi'] == 'TN':
            tohopthi[0] = 1.0
        elif student_data['tohopthi'] == 'XH':
            tohopthi[1] = 1.0
    
    # Xử lý sở thích (one-hot encoding)
    interests_vector = np.zeros(len(interest_to_id))
    for interest in student_data.get('interests', []):
        if interest in interest_to_id:
            interests_vector[interest_to_id[interest]] = 1.0
    
    # Xử lý tổ hợp môn (one-hot encoding)
    subject_groups = np.zeros(len(subject_comb_to_id))
    for group in student_data.get('subject_groups', []):
        if group in subject_comb_to_id:
            subject_groups[subject_comb_to_id[group]] = 1.0
    
    # Gộp tất cả đặc trưng
    features = np.concatenate([
        scores,             # 9 đặc trưng
        tohopthi,           # 2 đặc trưng
        interests_vector,   # n đặc trưng (số lượng sở thích)
        subject_groups      # m đặc trưng (số lượng tổ hợp môn)
    ])
    
    # Metadata cho việc hiển thị kết quả
    metadata = {
        'id_to_major': id_to_major,
        'interest_names': {interest['name']: interest for interest in interests},
        'student_interests': student_data.get('interests', []),
        'student_data': student_data,  # Lưu lại toàn bộ dữ liệu học sinh để sử dụng sau
        'db': db  # Lưu lại kết nối DB để truy vấn các trường
    }
    
    return features, metadata

def predict_recommended_majors(model, scaler, features, metadata, top_k=5):
    """
    Dự đoán các ngành phù hợp nhất cho học sinh và gợi ý trường phù hợp
    """
    # Áp dụng chuẩn hóa
    scaler_mean, scaler_scale = scaler
    
    # Đảm bảo kích thước đúng
    if scaler_mean.shape[0] != features.shape[0]:
        raise ValueError(f"Kích thước đặc trưng không khớp với scaler: scaler={scaler_mean.shape[0]}, features={features.shape[0]}")
    
    # Áp dụng chuẩn hóa đầy đủ
    features_scaled = (features.reshape(1, -1) - scaler_mean) / scaler_scale
    
    # Dự đoán
    predictions = model.predict(features_scaled)[0]
    
    # Lấy top-k ngành
    top_indices = np.argsort(predictions)[::-1][:top_k]
    
    # Tạo danh sách kết quả
    recommendations = []
    id_to_major = metadata['id_to_major']
    student_data = metadata['student_data']
    student_interests = metadata['student_interests']
    
    # Xác định tổ hợp môn và điểm cao nhất của học sinh
    best_combination, student_score = find_best_combination_score(student_data)
    
    print("\n====== GỢI Ý NGÀNH HỌC ======")
    print(f"Sở thích của học sinh: {student_interests}")
    
    for idx in top_indices:
        if idx in id_to_major:
            major_info = id_to_major[idx]
            major_name = major_info['name']
            confidence = float(predictions[idx])
            
            print(f"\nNgành: {major_name}, Mức độ phù hợp: {confidence*100:.1f}%")
            
            # Tìm các sở thích khớp với ngành học
            matching_interests = []
            major_interests = major_info.get('interests', [])
            
            print(f"Sở thích của ngành từ MongoDB: {major_interests}")
            
            # Kiểm tra sự trùng khớp giữa sở thích của học sinh và sở thích của ngành
            for interest in student_interests:
                if interest in major_interests:
                    matching_interests.append(interest)
                    print(f"✓ Khớp với sở thích: {interest}")
                else:
                    print(f"✗ Không khớp với sở thích: {interest}")
            
            # Nếu không tìm thấy sở thích nào khớp và độ tin cậy đủ cao, 
            # thêm tối đa 2 sở thích đầu tiên của học sinh (như code cũ)
            if not matching_interests and confidence >= 0.15:  # 15% min confidence
                num_interests = min(2, len(student_interests))
                if num_interests > 0:
                    matching_interests = student_interests[:num_interests]
                    print(f"⚠️ Không tìm thấy sở thích trùng khớp. Tạm thời thêm {num_interests} sở thích đầu tiên.")
            
            # Tìm các trường đại học phù hợp với ngành này
            suitable_universities = find_suitable_universities(
                major_name, 
                best_combination, 
                student_score, 
                db=metadata['db']
            )
            
            recommendation = {
                'major_name': major_name,
                'category': major_info.get('category', 'Chưa phân loại'),
                'confidence': confidence,
                'matching_interests': matching_interests,
                'description': major_info.get('description', 'Không có mô tả'),
                'best_combination': best_combination,
                'student_score': student_score,
                'suitable_universities': suitable_universities
            }
            
            recommendations.append(recommendation)
    
    return recommendations

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

def find_suitable_universities(major_name, combination, student_score, db):
    """
    Tìm 3 trường đại học phù hợp với ngành và điểm của học sinh
    
    Returns: 
        List các trường phù hợp ở 3 mức độ: cao, trung bình, thấp
    """
    suitable_unis = []
    
    try:
        # Lấy dữ liệu điểm chuẩn từ MongoDB
        benchmark_query = {
            'major': {'$regex': major_name, '$options': 'i'},
            'subject_combination': combination,
            'year': 2024  # Chỉ lấy năm 2024
        }
        
        print(f"\n====== TÌM TRƯỜNG PHÙ HỢP ======")
        print(f"Query điểm chuẩn: {benchmark_query}")
        
        # Kiểm tra collection benchmark_scores có tồn tại không
        collections = db.list_collection_names()
        print(f"Collections có trong DB: {collections}")
        if 'benchmark_scores' not in collections:
            print("CẢNH BÁO: Collection benchmark_scores không tồn tại trong database!")
            return []
            
        # Kiểm tra số lượng bản ghi trong collection benchmark_scores
        benchmark_count = db.benchmark_scores.count_documents({})
        print(f"Số lượng bản ghi điểm chuẩn trong DB: {benchmark_count}")
        
        benchmarks = list(db.benchmark_scores.find(benchmark_query))
        print(f"Tìm thấy {len(benchmarks)} điểm chuẩn phù hợp với ngành '{major_name}', tổ hợp '{combination}'")
        
        # Nếu không có dữ liệu năm 2024, thử lấy năm gần nhất
        if not benchmarks:
            print("Không tìm thấy điểm chuẩn cho năm 2024, tìm kiếm năm gần nhất")
            broader_query = {
                'major': {'$regex': major_name, '$options': 'i'},
                'subject_combination': combination
            }
            print(f"Query mở rộng: {broader_query}")
            
            # Tìm năm gần nhất có dữ liệu
            latest_year = db.benchmark_scores.find(broader_query).sort('year', -1).limit(1)
            latest_year = list(latest_year)
            if latest_year:
                latest_year = latest_year[0].get('year')
                print(f"Tìm thấy năm gần nhất: {latest_year}")
                
                # Chỉ lấy dữ liệu của năm gần nhất
                year_query = {
                    'major': {'$regex': major_name, '$options': 'i'},
                    'subject_combination': combination,
                    'year': latest_year
                }
                benchmarks = list(db.benchmark_scores.find(year_query))
                print(f"Tìm thấy {len(benchmarks)} điểm chuẩn với năm {latest_year}")
            
            # Nếu vẫn không tìm thấy, thử bỏ qua subject_combination với năm gần nhất
            if not benchmarks:
                print("Không tìm thấy điểm chuẩn với tổ hợp, tìm bất kỳ tổ hợp nào")
                # Tìm năm gần nhất
                latest_year_query = {'major': {'$regex': major_name, '$options': 'i'}}
                latest_year_data = db.benchmark_scores.find(latest_year_query).sort('year', -1).limit(1)
                latest_year_data = list(latest_year_data)
                
                if latest_year_data:
                    latest_year = latest_year_data[0].get('year')
                    name_only_query = {
                        'major': {'$regex': major_name, '$options': 'i'},
                        'year': latest_year
                    }
                    print(f"Query chỉ theo tên ngành và năm {latest_year}: {name_only_query}")
                    benchmarks = list(db.benchmark_scores.find(name_only_query))
                    print(f"Tìm thấy {len(benchmarks)} điểm chuẩn chỉ dựa vào tên ngành và năm {latest_year}")
        
        # Phân loại trường theo điểm chuẩn và entry_level
        high_level = []
        mid_level = []
        low_level = []
        
        # Track trường đã thêm để tránh trùng lặp
        seen_universities = set()
        
        for benchmark in benchmarks:
            benchmark_score = float(benchmark.get('benchmark_score', 0))
            university_name = benchmark.get('university', 'Không xác định')
            university_id = benchmark.get('university_id')  # Lấy id trường nếu có
            entry_level = benchmark.get('entry_level', 'Trung bình')
            
            # Bỏ qua nếu trường đã được thêm
            if university_name in seen_universities:
                continue
            
            seen_universities.add(university_name)
            
            # Tính chênh lệch điểm
            score_diff = student_score - benchmark_score
            
            # Xác định mức độ phù hợp
            if score_diff >= 1.5:
                safety_level = "An toàn"
            elif score_diff >= -1.5:
                safety_level = "Cân nhắc" 
            else:
                safety_level = "Khó khăn"
            
            uni_info = {
                'university_name': university_name,
                'university_id': university_id,  # Thêm id trường nếu có
                'benchmark_score': benchmark_score,
                'combination': benchmark.get('subject_combination', combination),
                'score_difference': score_diff,
                'safety_level': safety_level,
                'year': benchmark.get('year', 2024)  # Thêm năm để biết điểm chuẩn là của năm nào
            }
            
            # Phân loại theo entry_level
            if entry_level == 'Cao':
                high_level.append(uni_info)
            elif entry_level == 'Trung bình':
                mid_level.append(uni_info)
            else:
                low_level.append(uni_info)
        
        print(f"Phân loại trường: Cao ({len(high_level)}), Trung bình ({len(mid_level)}), Thấp ({len(low_level)})")
        
        # Sắp xếp các trường theo mức độ phù hợp (điểm chênh lệch giảm dần)
        high_level.sort(key=lambda x: x['score_difference'], reverse=True)
        mid_level.sort(key=lambda x: x['score_difference'], reverse=True)
        low_level.sort(key=lambda x: x['score_difference'], reverse=True)
        
        # Chọn 1 trường từ mỗi mức độ
        if high_level:
            suitable_unis.append(high_level[0])
        if mid_level:
            suitable_unis.append(mid_level[0])
        if low_level:
            suitable_unis.append(low_level[0])
        
        # Nếu không đủ 3 trường, bổ sung thêm
        while len(suitable_unis) < 3 and (high_level or mid_level or low_level):
            if len(high_level) > 1 and len(suitable_unis) < 3:
                suitable_unis.append(high_level[1])
                high_level.pop(1)
            elif len(mid_level) > 1 and len(suitable_unis) < 3:
                suitable_unis.append(mid_level[1])
                mid_level.pop(1)
            elif len(low_level) > 1 and len(suitable_unis) < 3:
                suitable_unis.append(low_level[1])
                low_level.pop(1)
            else:
                break
        
        print(f"Trả về {len(suitable_unis)} trường phù hợp")
        if len(suitable_unis) > 0:
            print(f"Trường đầu tiên: {suitable_unis[0]}")
        
    except Exception as e:
        print(f"Lỗi khi tìm trường phù hợp: {e}")
        import traceback
        traceback.print_exc()
    
    return suitable_unis 