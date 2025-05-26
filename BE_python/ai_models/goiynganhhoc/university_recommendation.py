import os
import re
import logging
from pymongo import MongoClient
from bson import ObjectId

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Kết nối MongoDB
MONGODB_URI = os.getenv('MONGO_URI')
MONGODB_NAME = os.getenv('MONGO_DB_NAME')

client = MongoClient(MONGODB_URI)
db = client[MONGODB_NAME]

# Cache subject combinations để tránh truy vấn DB nhiều lần
_cached_subject_combinations = None

def get_subject_combinations():
    """
    Lấy tất cả tổ hợp môn từ collection subject_combinations
    
    Returns:
        Dictionary với key là mã tổ hợp và value là danh sách môn học
    """
    global _cached_subject_combinations
    
    if _cached_subject_combinations is None:
        try:
            combinations = {}
            # Lấy tất cả tổ hợp từ MongoDB
            subject_combs = list(db.subject_combinations.find({}, {"code": 1, "subjects": 1}))
            
            for combo in subject_combs:
                combo_code = combo.get("code")
                subjects = combo.get("subjects", [])
                
                # Chuẩn hóa tên môn học
                normalized_subjects = [normalize_subject_name(subject) for subject in subjects]
                combinations[combo_code] = normalized_subjects
            
            _cached_subject_combinations = combinations
            print(f"Đã tải {len(_cached_subject_combinations)} tổ hợp môn từ DB")
            
        except Exception as e:
            print(f"Lỗi khi lấy tổ hợp môn: {e}")
            # Khởi tạo dictionary trống
            _cached_subject_combinations = {}
            
    return _cached_subject_combinations

def normalize_subject_name(subject_name):
    """
    Chuẩn hóa tên môn học để mapping với dữ liệu học sinh
    
    Args:
        subject_name: Tên môn học cần chuẩn hóa
        
    Returns:
        Tên môn học đã chuẩn hóa
    """
    # Mapping từ nhiều định dạng tên môn sang tên trong dữ liệu học sinh
    subject_mapping = {
        # Tên đầy đủ và viết tắt trong DB
        "TOAN": "Toan",
        "NGUVAN": "NguVan",
        "NGOAINGU": "NgoaiNgu",
        "VATLY": "VatLy",
        "HOA": "HoaHoc",
        "HOAHOC": "HoaHoc",
        "SINH": "SinhHoc",
        "SINHHOC": "SinhHoc",
        "SU": "LichSu",
        "LICHSU": "LichSu",
        "DIA": "DiaLy",
        "DIALY": "DiaLy",
        "GDCD": "GDCD",
        # Thêm các viết tắt phổ biến
        "TOAN": "Toan",
        "VAN": "NguVan", 
        "ANH": "NgoaiNgu",
        "LY": "VatLy",
        "HOA": "HoaHoc",
        "SINH": "SinhHoc",
        "SU": "LichSu",
        "DIA": "DiaLy",
        # Thêm định dạng viết hoa đầu từ
        "Toan": "Toan",
        "Van": "NguVan",
        "NguVan": "NguVan",
        "Anh": "NgoaiNgu",
        "NgoaiNgu": "NgoaiNgu",
        "Ly": "VatLy",
        "VatLy": "VatLy",
        "Hoa": "HoaHoc",
        "HoaHoc": "HoaHoc",
        "Sinh": "SinhHoc",
        "SinhHoc": "SinhHoc",
        "Su": "LichSu",
        "LichSu": "LichSu",
        "Dia": "DiaLy",
        "DiaLy": "DiaLy"
    }
    
    # Xóa dấu cách và chuyển về chữ hoa
    normalized = subject_name.replace(" ", "").upper()
    
    # Trả về tên đã mapping hoặc giữ nguyên nếu không có trong mapping
    mapped_subject = subject_mapping.get(normalized, None)
    if mapped_subject:
        return mapped_subject
    
    # Thử mapping trực tiếp không chuẩn hóa
    mapped_subject = subject_mapping.get(subject_name, None)
    if mapped_subject:
        return mapped_subject
    
    # Giữ nguyên nếu không có trong mapping
    return subject_name

def normalize_major_name(major_name, for_search=True):
    """
    Chuẩn hóa tên ngành - có hai chế độ:
    - for_search=True: Chuẩn hóa để tìm kiếm (loại bỏ các cụm CLC, đại trà, ...)
    - for_search=False: Chuẩn hóa nhẹ để hiển thị (giữ nguyên CLC, đại trà, ...)
    """
    if not major_name:
        return ""
        
    # Chuẩn hóa cơ bản
    normalized = major_name.lower()
    
    # Chuẩn hóa dấu gạch nối và dấu và
    normalized = normalized.replace(" - ", " ")
    normalized = normalized.replace("-", " ")
    normalized = normalized.replace(" và ", " ")
    normalized = normalized.replace("và", " ")
    
    # Chuẩn hóa một số từ đặc biệt
    replacements = {
        "hóa": "hoa",
        "hoá": "hoa",
        "kĩ": "ky",
        "kỹ": "ky",
        "điện tử": "dien tu",
        "điện": "dien",
        "tự động": "tu dong",
        "công nghệ": "cong nghe",
        "kỹ thuật": "ky thuat"
    }
    
    for old, new in replacements.items():
        if for_search:
            normalized = normalized.replace(old, new)
    
    # Nếu chuẩn hóa cho tìm kiếm, loại bỏ các cụm từ phụ
    if for_search:
        remove_terms = [
            "(hệ đại trà)", "(chất lượng cao)", "(chuẩn quốc tế)", "(tiên tiến)",
            "hệ đại trà", "chất lượng cao", "chuẩn quốc tế", "tiên tiến",
            "clc", "đại trà", "(", ")", "&"
        ]
        
        for term in remove_terms:
            normalized = normalized.replace(term, "")
    
    # Chuẩn hóa khoảng trắng
    normalized = " ".join(normalized.split())
    
    return normalized

def find_related_majors(predicted_major):
    """
    Tìm ngành học trong DB dựa trên tên ngành dự đoán
    - Tìm các ngành có chứa cụm từ khóa chính không phân biệt hoa thường
    """
    try:
        # Chuẩn hóa tên ngành về chữ thường
        search_term = predicted_major.lower()
        logger.info(f"Tìm ngành học có chứa cụm: '{search_term}'")
        
        # Lấy tất cả ngành từ cơ sở dữ liệu
        all_majors = list(db.benchmark_scores.distinct("major"))
        matched_majors = []
        
        # Tìm các ngành có chứa cụm từ trong tên dự đoán
        for major in all_majors:
            if search_term in major.lower():
                matched_majors.append(major)
        
        if matched_majors:
            logger.info(f"Tìm thấy {len(matched_majors)} ngành có chứa '{search_term}'")
            return matched_majors
        
        # Nếu không tìm được, thử tìm theo từng từ khóa riêng lẻ
        if len(matched_majors) == 0:
            # Tách các từ khóa chính
            keywords = [word for word in search_term.split() if len(word) > 3]
            logger.info(f"Không tìm thấy kết quả, thử tìm theo từng từ khóa: {keywords}")
            
            # Đếm số từ khóa match với mỗi ngành
            for major in all_majors:
                major_lower = major.lower()
                matched_keywords = 0
                
                for keyword in keywords:
                    if keyword in major_lower:
                        matched_keywords += 1
                
                # Nếu match >= 50% số từ khóa, thêm vào kết quả
                if matched_keywords > 0 and matched_keywords >= len(keywords) / 2:
                    matched_majors.append(major)
            
            if matched_majors:
                logger.info(f"Tìm thấy {len(matched_majors)} ngành match với các từ khóa")
                return matched_majors
        
        logger.warning(f"Không tìm thấy ngành nào phù hợp với '{predicted_major}'")
        return []
    
    except Exception as e:
        logger.error(f"Lỗi khi tìm ngành: {e}")
        return []

def calculate_student_score_for_subject_group(student_data, subject_group_code):
    """
    Tính điểm của học sinh cho một tổ hợp môn
    
    Args:
        student_data: Dictionary chứa điểm của học sinh
        subject_group_code: Mã tổ hợp môn
        
    Returns:
        Tổng điểm của học sinh hoặc None nếu không tính được
    """
    # Lấy thông tin môn học của tổ hợp từ database
    subject_combo = db.subject_combinations.find_one({"code": subject_group_code})
    
    if not subject_combo:
        return None
        
    # Lấy danh sách môn học trong tổ hợp
    subjects = subject_combo.get("subjects", [])
    if not subjects:
        return None
    
    # Lấy điểm học sinh
    scores = student_data.get('scores', {})
    
    # Kiểm tra xem học sinh có đủ điểm cho tất cả các môn không
    total_score = 0
    for subject in subjects:
        # Chuẩn hóa tên môn
        normalized_subject = normalize_subject_name(subject)
        
        if normalized_subject not in scores or not scores[normalized_subject]:
            # Thiếu điểm môn này
            return None
            
        total_score += float(scores[normalized_subject])
    
    # Thêm điểm ưu tiên nếu có
    priority_score = float(student_data.get('priorityScore', 0))
    final_score = total_score + priority_score
    
    return final_score

def extract_subject_combinations(subject_combination_str):
    """
    Trích xuất mã tổ hợp môn từ một chuỗi đơn giản
    
    Args:
        subject_combination_str: Chuỗi chứa các mã tổ hợp môn (VD: "A00, A01, B00, D07")
        
    Returns:
        Danh sách các mã tổ hợp môn
    """
    if not subject_combination_str:
        return []
        
    # Xử lý chuỗi: loại bỏ khoảng trắng thừa, tách theo dấu phẩy
    combinations = [combo.strip() for combo in subject_combination_str.split(',')]
    
    # Lọc các tổ hợp hợp lệ (định dạng A00, B00, D07...)
    valid_combinations = [combo for combo in combinations if re.match(r'^[A-Z][0-9]{2}$', combo)]
    
    return valid_combinations

def recommend_universities_for_major(predicted_major, student_data, max_universities=10):
    """
    Đơn giản hóa hàm gợi ý trường đại học
    """
    # 1. Tìm ngành chính xác theo tên
    logger.info(f"Tìm thông tin điểm chuẩn cho ngành: '{predicted_major}'")
    benchmark_records = list(db.benchmark_scores.find({"major": predicted_major, "year": 2024}))
    
    if not benchmark_records:
        logger.warning(f"Không tìm thấy thông tin điểm chuẩn cho ngành: '{predicted_major}'")
        return []
    
    logger.info(f"Tìm thấy {len(benchmark_records)} bản ghi điểm chuẩn cho ngành: '{predicted_major}'")
    
    # 2. Nhóm các bản ghi theo trường + ngành
    grouped_records = {}
    for record in benchmark_records:
        uni_major_key = f"{record['university']}_{record['major']}"
        if uni_major_key not in grouped_records:
            grouped_records[uni_major_key] = []
        grouped_records[uni_major_key].append(record)
    
    logger.info(f"Có {len(grouped_records)} trường có ngành '{predicted_major}'")
    
    # 3. Xử lý từng nhóm
    university_matches = []
    
    for uni_major_key, records in grouped_records.items():
        base_record = records[0]
        university_name = base_record['university']
        major_name = base_record['major']
        
        # Lấy tất cả tổ hợp môn của ngành này
        all_combinations = set()
        for record in records:
            subject_combination_str = record.get('subject_combination', '')
            combos = extract_subject_combinations(subject_combination_str)
            all_combinations.update(combos)
        
        # Tìm tổ hợp môn tốt nhất cho học sinh
        best_score = 0
        best_combo = None
        benchmark_score = 0
        
        for combo in all_combinations:
            student_score = calculate_student_score_for_subject_group(student_data, combo)
            
            if student_score is not None:
                # Tìm điểm chuẩn tương ứng
                for record in records:
                    subject_combination_str = record.get('subject_combination', '')
                    record_combos = extract_subject_combinations(subject_combination_str)
                    
                    if combo in record_combos:
                        current_benchmark = float(record.get('benchmark_score', 0))
                        if student_score > best_score:
                            best_score = student_score
                            best_combo = combo
                            benchmark_score = current_benchmark
        
        # Bỏ qua nếu không tìm được tổ hợp phù hợp
        if not best_combo:
            continue
            
        # Tính mức độ an toàn
        score_diff = best_score - benchmark_score
        
        if score_diff >= 2:
            safety_level = "An toàn"
        elif score_diff >= 0:
            safety_level = "Cân nhắc"
        else:
            safety_level = "Khó đậu"
        
        # Thêm vào kết quả
        university_matches.append({
            'university_name': university_name,
            'university_code': base_record.get('university_code', ''),
            # Giữ nguyên tên đầy đủ từ database
            'major_name': major_name,
            'benchmark_score': benchmark_score,
            'student_score': best_score,
            'combination': best_combo,
            'safety_level': safety_level,
            'score_difference': score_diff
        })
    
    # 4. Sắp xếp kết quả theo mức độ an toàn và điểm chênh lệch
    safe_unis = [u for u in university_matches if u['safety_level'] == "An toàn"]
    consider_unis = [u for u in university_matches if u['safety_level'] == "Cân nhắc"]
    risky_unis = [u for u in university_matches if u['safety_level'] == "Khó đậu"]
    
    # Sắp xếp theo điểm chênh lệch
    safe_unis.sort(key=lambda x: x['score_difference'], reverse=True)
    consider_unis.sort(key=lambda x: x['score_difference'], reverse=True)
    risky_unis.sort(key=lambda x: x['score_difference'], reverse=True)
    
    # Kết hợp kết quả
    result = safe_unis + consider_unis + risky_unis
    
    # Giới hạn số lượng kết quả
    if len(result) > max_universities:
        result = result[:max_universities]
    
    return result

def recommend_universities_for_top_majors(top_majors, student_data, max_unis_per_major=10):
    """
    Tìm các trường đại học phù hợp cho danh sách các ngành dự đoán
    
    Args:
        top_majors: Danh sách các ngành dự đoán hàng đầu
        student_data: Dictionary chứa thông tin học sinh
        max_unis_per_major: Số lượng trường tối đa cho mỗi ngành
        
    Returns:
        Dictionary với key là tên ngành và value là danh sách trường phù hợp
    """
    recommendations = {}
    
    for major_info in top_majors:
        major_name = major_info.get('major_name') or major_info.get('major')
        if not major_name:
            continue
        
        logger.info(f"Đang tìm trường cho ngành: {major_name}")
        
        # Tìm các ngành liên quan trong DB
        related_majors = find_related_majors(major_name)
        
        if not related_majors:
            logger.warning(f"Không tìm thấy ngành liên quan cho: {major_name}")
            recommendations[major_name] = []
            continue
        
        # Tìm trường cho từng ngành liên quan
        all_universities = []
        
        for related_major in related_majors:
            logger.info(f"Tìm trường cho ngành liên quan: {related_major}")
            universities = recommend_universities_for_major(
                related_major, student_data, max_unis_per_major)
            
            # Thêm thông tin về ngành
            for uni in universities:
                # Lưu tên ngành gốc để tham chiếu nhưng hiển thị tên ngành đầy đủ từ DB
                uni['original_major'] = major_name
                # Đây là tên ngành đầy đủ từ DB để hiển thị
                uni['major_name'] = related_major
            
            all_universities.extend(universities)
        
        # Sắp xếp kết quả theo mức độ an toàn và điểm chênh lệch
        safe_unis = [u for u in all_universities if u['safety_level'] == "An toàn"]
        consider_unis = [u for u in all_universities if u['safety_level'] == "Cân nhắc"]
        risky_unis = [u for u in all_universities if u['safety_level'] == "Khó đậu"]
        
        # Sắp xếp theo điểm chênh lệch
        safe_unis.sort(key=lambda x: x['score_difference'], reverse=True)
        consider_unis.sort(key=lambda x: x['score_difference'], reverse=True)
        risky_unis.sort(key=lambda x: x['score_difference'], reverse=True)
        
        # Kết hợp kết quả
        result = safe_unis + consider_unis + risky_unis
        
        # Giới hạn số lượng kết quả
        if len(result) > max_unis_per_major:
            result = result[:max_unis_per_major]
            
        # Thêm vào kết quả
        recommendations[major_name] = result
    
    return recommendations

# Ví dụ sử dụng:
# student_data = {
#    'scores': {'Toan': 9.0, 'NguVan': 8.0, 'NgoaiNgu': 9.5, 'VatLy': 8.5, 'HoaHoc': 7.5},
#    'priorityScore': 1.0
# }
# 
# top_majors = [
#    {'major_name': 'Công nghệ thông tin'},
#    {'major_name': 'Khoa học máy tính'}
# ]
# 
# recommendations = recommend_universities_for_top_majors(top_majors, student_data)
# print(recommendations) 