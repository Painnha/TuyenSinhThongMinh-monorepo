import os
import sys
import numpy as np
import json
import pandas as pd

from models.data_preprocessing import DataPreprocessor
from models.neural_network import MajorRecommendationModel

# File paths
INTEREST_FILE = 'data/interests.csv'
SUBJECT_COMBINATION_FILE = 'data/subject_combinations.csv'
DIEM_CHUAN_FILE = 'data/DiemChuan.csv'
MARKET_TREND_FILE = 'data/market_trend.csv'
MODEL_PATH = 'models/major_recommendation_model.keras'

def load_model_and_preprocessor():
    """Load the trained model and data preprocessor"""
    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}. Please train the model first.")
    
    # Load preprocessor with the new data files
    preprocessor = DataPreprocessor(
        INTEREST_FILE, 
        SUBJECT_COMBINATION_FILE,
        DIEM_CHUAN_FILE,
        MARKET_TREND_FILE
    )
    
    # Load model
    model = MajorRecommendationModel.load(MODEL_PATH)
    
    return model, preprocessor

def get_student_score_for_subject_group(student_data, subject_group):
    """
    Tính điểm tổ hợp môn của học sinh
    
    Args:
        student_data: Dữ liệu điểm của học sinh
        subject_group: Mã tổ hợp môn (vd: A00, D01)
    
    Returns:
        Tổng điểm tổ hợp
    """
    # Mapping tổ hợp môn
    subject_group_mapping = {
        # Khối A
        'A00': ['Toan', 'VatLy', 'HoaHoc'],
        'A01': ['Toan', 'VatLy', 'NgoaiNgu'],
        'A02': ['Toan', 'VatLy', 'SinhHoc'],
        
        # Khối B
        'B00': ['Toan', 'HoaHoc', 'SinhHoc'],
        'B08': ['Toan', 'SinhHoc', 'NgoaiNgu'],
        
        # Khối C
        'C00': ['NguVan', 'LichSu', 'DiaLy'],
        'C01': ['NguVan', 'Toan', 'VatLy'],
        'C02': ['NguVan', 'Toan', 'HoaHoc'],
        'C03': ['NguVan', 'Toan', 'LichSu'],
        'C04': ['NguVan', 'Toan', 'DiaLy'],
        'C14': ['NguVan', 'Toan', 'GDCD'],
        'C20': ['NguVan', 'LichSu', 'GDCD'],
        
        # Khối D
        'D01': ['NguVan', 'Toan', 'NgoaiNgu'],
        'D07': ['Toan', 'HoaHoc', 'NgoaiNgu'],
        'D08': ['Toan', 'SinhHoc', 'NgoaiNgu'],
        'D09': ['Toan', 'LichSu', 'NgoaiNgu'],
        'D10': ['Toan', 'DiaLy', 'NgoaiNgu'],
        'D14': ['NguVan', 'LichSu', 'NgoaiNgu'],
        'D15': ['NguVan', 'DiaLy', 'NgoaiNgu'],
        'D28': ['Toan', 'HoaHoc', 'NgoaiNgu'],
        'D29': ['Toan', 'VatLy', 'NgoaiNgu'],
        
        # Các khối khác
        'D66': ['NguVan', 'GDCD', 'NgoaiNgu'],
        'D78': ['NguVan', 'VatLy', 'NgoaiNgu'],
        'D82': ['NguVan', 'DiaLy', 'GDCD'],
        'D83': ['Toan', 'LichSu', 'NgoaiNgu'],
        'D84': ['Toan', 'GDCD', 'NgoaiNgu'],
        'D90': ['Toan', 'GDCD', 'NgoaiNgu'],
        'D95': ['Toan', 'NgoaiNgu', 'GDCD'],
        'D96': ['Toan', 'NgoaiNgu', 'DiaLy'],
        
        # Khối V (ngành kiến trúc)
        'V00': ['Toan', 'VatLy', 'NgoaiNgu'],
        'V01': ['Toan', 'VatLy', 'NguVan'],
        'V02': ['Toan', 'HoaHoc', 'NgoaiNgu'],
        
        # Khối H (mỹ thuật)
        'H00': ['NguVan', 'LichSu', 'DiaLy'],
        'H01': ['Toan', 'NguVan', 'NgoaiNgu'],
        'H02': ['NguVan', 'DiaLy', 'GDCD'],
        'H07': ['NguVan', 'DiaLy', 'GDCD'],
    }
    
    # Nếu không có mapping cho tổ hợp này, trả về 0
    if subject_group not in subject_group_mapping:
        return 0
    
    # Tính tổng điểm
    total_score = 0
    for subject in subject_group_mapping[subject_group]:
        if subject in student_data['scores']:
            total_score += student_data['scores'][subject]
    
    return total_score

def recommend_majors(student_data, top_k=3):
    """
    Recommend majors for a given student
    
    Args:
        student_data: Dictionary containing student's information
        top_k: Number of top recommendations to return
        
    Returns:
        List of recommended majors with details
    """
    # Load model and preprocessor
    model, preprocessor = load_model_and_preprocessor()
    
    # Preprocess student data
    X_student = preprocessor.preprocess_student_data(student_data)
    X_student = np.expand_dims(X_student, axis=0)  # Add batch dimension
    
    # Make prediction without market trend weights
    recommendations = model.predict(X_student, market_trend_weights=None, top_k=top_k*2)  # Lấy nhiều hơn để lọc trùng
    
    # Load DiemChuan.csv để lấy thông tin trường và điểm chuẩn
    diem_chuan_df = pd.read_csv(DIEM_CHUAN_FILE)
    
    # Format recommendations
    result = []
    seen_majors = set()  # Để tránh trùng lặp tên ngành
    
    for major_id, probability in recommendations:
        major_name = preprocessor.get_major_by_id(major_id)
        
        # Bỏ qua nếu ngành đã xuất hiện
        if major_name in seen_majors:
            continue
        seen_majors.add(major_name)
        
        major_info = preprocessor.get_major_info(major_name)
        
        # Tìm các trường và điểm chuẩn phù hợp từ DiemChuan.csv
        matching_programs = diem_chuan_df[diem_chuan_df['Ngành'].str.strip().str.lower() == major_name]
        
        # Lọc các trường phù hợp với điểm của học sinh
        suitable_programs = []
        
        if not matching_programs.empty:
            # Nhóm các tổ hợp theo trường và điểm chuẩn
            schools_data = {}
            
            for _, program in matching_programs.iterrows():
                school = program['Trường đại học']
                min_score = float(program['Điểm chuẩn'])
                subject_group = program['Tổ hợp']
                note = program['Ghi chú'] if not pd.isna(program['Ghi chú']) else ""
                
                # Tính điểm của học sinh cho tổ hợp này
                student_score = get_student_score_for_subject_group(student_data, subject_group)
                
                # Nếu điểm đủ để đậu
                if student_score >= min_score:
                    if school not in schools_data:
                        schools_data[school] = {
                            'min_scores': {},
                            'notes': set()
                        }
                    
                    # Nhóm các tổ hợp có cùng điểm chuẩn
                    if min_score not in schools_data[school]['min_scores']:
                        schools_data[school]['min_scores'][min_score] = []
                    
                    schools_data[school]['min_scores'][min_score].append(subject_group)
                    
                    if note:
                        schools_data[school]['notes'].add(note)
            
            # Format kết quả
            for school, data in schools_data.items():
                school_entry = {
                    'school_name': school,
                    'subject_groups': []
                }
                
                # Thêm các nhóm tổ hợp
                for min_score, subject_groups in data['min_scores'].items():
                    school_entry['subject_groups'].append({
                        'min_score': min_score,
                        'combinations': subject_groups
                    })
                
                # Thêm ghi chú nếu có
                if data['notes']:
                    school_entry['notes'] = list(data['notes'])
                
                suitable_programs.append(school_entry)
        
        # Thêm vào kết quả
        result.append({
            "major_name": major_name,
            "category": major_info.get("category", "Unknown"),
            "confidence": float(probability),
            "primary_subject_groups": major_info.get("primary_subject_groups", ""),
            "secondary_subject_groups": major_info.get("secondary_subject_groups", ""),
            "interests": major_info.get("interests", ""),
            "suitable_schools": suitable_programs
        })
        
        # Dừng lại khi đã đủ top_k kết quả
        if len(result) >= top_k:
            break
    
    return result

def process_input_data(input_data):
    """Process and validate input data"""
    # Validate mandatory subjects
    if 'Toan' not in input_data['scores'] or 'NguVan' not in input_data['scores']:
        raise ValueError("Điểm Toán và Văn là bắt buộc")
    
    # Ensure the student has selected tohopthi
    if 'tohopthi' not in input_data:
        raise ValueError("Vui lòng chọn tổ hợp thi (TN hoặc XH)")
    
    # Ensure the student has selected more optional subjects
    if input_data['tohopthi'] == 'TN':
        required_subjects = ['VatLy', 'HoaHoc', 'SinhHoc']
        optional_subjects = [subj for subj in required_subjects if subj in input_data['scores'] and input_data['scores'][subj] > 0]
        if len(optional_subjects) < 1:
            raise ValueError("Vui lòng chọn ít nhất 1 môn Khoa học tự nhiên (Vật lý, Hóa học, Sinh học)")
    elif input_data['tohopthi'] == 'XH':
        required_subjects = ['LichSu', 'DiaLy', 'GDCD']
        optional_subjects = [subj for subj in required_subjects if subj in input_data['scores'] and input_data['scores'][subj] > 0]
        if len(optional_subjects) < 1:
            raise ValueError("Vui lòng chọn ít nhất 1 môn Khoa học xã hội (Lịch sử, Địa lý, GDCD)")
    
    # Validate interests (max 3)
    if len(input_data['interests']) > 3:
        input_data['interests'] = input_data['interests'][:3]
    
    # Validate subject groups (max 2)
    if len(input_data['subject_groups']) > 2:
        input_data['subject_groups'] = input_data['subject_groups'][:2]
    
    return input_data

def main():
    """Main function to handle CLI arguments and return recommendations"""
    if len(sys.argv) < 2:
        print("Usage: python recommend.py <input_json> OR python recommend.py --file <json_file>")
        sys.exit(1)
    
    # Check if reading from file
    if sys.argv[1] == "--file" and len(sys.argv) > 2:
        try:
            with open(sys.argv[2], 'r', encoding='utf-8') as f:
                student_data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Error: {str(e)}")
            sys.exit(1)
    else:
        # Parse input JSON
        try:
            input_json = sys.argv[1]
            student_data = json.loads(input_json)
        except json.JSONDecodeError:
            print("Error: Invalid JSON input")
            sys.exit(1)
    
    try:
        # Process and validate input data
        student_data = process_input_data(student_data)
        
        # Get recommendations
        recommendations = recommend_majors(student_data)
        
        # Write to file instead of printing to avoid encoding issues
        with open('output_result.json', 'w', encoding='utf-8') as f:
            json.dump(recommendations, f, ensure_ascii=False, indent=2)
        
        # Print success message
        print("Recommendations saved to output_result.json")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 