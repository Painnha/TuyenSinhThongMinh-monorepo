import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
import os
import sys
import datetime
import json

# Thêm thư mục cha vào sys.path để import các module
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(parent_dir)

# Import DataPreprocessor từ data_preprocessing.py
from ai_models.goiynganhhoc.data_preprocessing import DataPreprocessor

def load_model_and_scaler():
    """
    Tải mô hình dự đoán và bộ scaler
    
    Returns:
        model: Mô hình đã được huấn luyện
        scaler: Tuple (scaler_mean, scaler_scale)
    """
    model_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(model_dir, 'model', 'major_recommendation_model.h5')
    scaler_mean_path = os.path.join(model_dir, 'model', 'scaler_mean.npy')
    scaler_scale_path = os.path.join(model_dir, 'model', 'scaler_scale.npy')
    
    # Kiểm tra file mô hình
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Không tìm thấy mô hình tại: {model_path}")
    
    # Kiểm tra file scaler
    if not os.path.exists(scaler_mean_path) or not os.path.exists(scaler_scale_path):
        raise FileNotFoundError(f"Không tìm thấy file scaler")
    
    # Tải mô hình
    model = load_model(model_path)
    
    # Tải scaler
    scaler_mean = np.load(scaler_mean_path)
    scaler_scale = np.load(scaler_scale_path)
    scaler = (scaler_mean, scaler_scale)
    
    return model, scaler

def predict_majors(model, scaler, preprocessor, student_data, top_k=5):
    """
    Dự đoán ngành học phù hợp cho học sinh
    
    Args:
        model: Mô hình đã huấn luyện
        scaler: Bộ scaler để chuẩn hóa đầu vào
        preprocessor: DataPreprocessor instance
        student_data: Dictionary chứa thông tin học sinh
        top_k: Số lượng ngành gợi ý
        
    Returns:
        Danh sách các ngành phù hợp nhất
    """
    # Tiền xử lý dữ liệu học sinh
    features = preprocessor.preprocess_student_data(student_data)
    
    # Chuẩn hóa đặc trưng
    scaler_mean, scaler_scale = scaler
    features_scaled = (features.reshape(1, -1) - scaler_mean) / scaler_scale
    
    # Dự đoán
    predictions = model.predict(features_scaled, verbose=0)[0]
    
    # Lấy top-k ngành có xác suất cao nhất
    top_indices = np.argsort(predictions)[::-1][:top_k]
    
    # Tạo danh sách kết quả
    recommendations = []
    
    # Tìm tổ hợp môn tốt nhất
    best_combination, total_score = find_best_combination_score(student_data)
    
    for idx in top_indices:
        major_name = preprocessor.get_major_by_id(idx)
        confidence = float(predictions[idx])
        
        # Lấy thêm thông tin ngành nếu có
        major_info = preprocessor.get_major_info(major_name)
        
        # Tìm sở thích phù hợp với ngành (nếu có)
        matching_interests = []
        if 'interests' in major_info:
            for interest_obj in major_info['interests']:
                if isinstance(interest_obj, dict) and 'name' in interest_obj:
                    interest_name = interest_obj['name']
                    if interest_name in student_data.get('interests', []):
                        matching_interests.append(interest_name)
        
        recommendation = {
            'major_name': major_name,
            'confidence': confidence,
            'category': major_info.get('category', 'Chưa phân loại'),
            'matching_interests': matching_interests,
            'description': major_info.get('description', ''),
            'best_combination': best_combination,
            'total_score': total_score
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

def clear_screen():
    """Xóa màn hình console"""
    os.system('cls' if os.name == 'nt' else 'clear')

def predict_with_sample_data(sample_number=1):
    """
    Dự đoán với dữ liệu mẫu
    """
    # Các dữ liệu mẫu để dự đoán
    sample_data = [
        # Mẫu 1: Học sinh khoa học tự nhiên
        {
            "scores": {
                "Toan": 9.0,
                "NguVan": 7.5,
                "VatLy": 8.5,
                "HoaHoc": 8.0,
                "SinhHoc": 7.0,
                "LichSu": 0.0,
                "DiaLy": 0.0,
                "GDCD": 0.0,
                "NgoaiNgu": 8.5
            },
            "interests": ["Lập trình", "Máy tính", "Công nghệ", "Phân tích dữ liệu"],
            "subject_groups": ["A00", "A01"],
            "tohopthi": "TN",
            "priorityScore": 0.5
        },
        
        # Mẫu 2: Học sinh khoa học xã hội
        {
            "scores": {
                "Toan": 7.0,
                "NguVan": 8.5,
                "VatLy": 0.0,
                "HoaHoc": 0.0,
                "SinhHoc": 0.0,
                "LichSu": 8.0,
                "DiaLy": 8.5,
                "GDCD": 9.0,
                "NgoaiNgu": 8.0
            },
            "interests": ["Nghiên cứu xã hội", "Truyền thông", "Kinh doanh", "Quản lý"],
            "subject_groups": ["C00", "D01"],
            "tohopthi": "XH",
            "priorityScore": 0.0
        },
        
        # Mẫu 3: Học sinh y dược
        {
            "scores": {
                "Toan": 8.5,
                "NguVan": 7.0,
                "VatLy": 7.5,
                "HoaHoc": 9.0,
                "SinhHoc": 9.0,
                "LichSu": 0.0,
                "DiaLy": 0.0,
                "GDCD": 0.0,
                "NgoaiNgu": 8.0
            },
            "interests": ["Y học", "Dược phẩm", "Chăm sóc sức khỏe", "Khoa học"],
            "subject_groups": ["B00", "A00"],
            "tohopthi": "TN",
            "priorityScore": 0.0
        }
    ]
    
    # Kiểm tra số mẫu hợp lệ
    if sample_number < 1 or sample_number > len(sample_data):
        print(f"Lỗi: Không có mẫu số {sample_number}. Chỉ có {len(sample_data)} mẫu.")
        return
    
    # Lấy dữ liệu mẫu tương ứng
    student_data = sample_data[sample_number - 1]
    
    # Thực hiện dự đoán
    predict_for_student(student_data)

def input_student_data():
    """Nhập dữ liệu học sinh từ người dùng"""
    student_data = {
        "scores": {},
        "interests": [],
        "subject_groups": [],
        "tohopthi": "",
        "priorityScore": 0.0
    }
    
    print("\n==== NHẬP THÔNG TIN HỌC SINH ====")
    
    # Nhập điểm số các môn
    print("\nNhập điểm các môn học (0-10, để trống nếu không có):")
    subjects = ["Toan", "NguVan", "VatLy", "HoaHoc", "SinhHoc", "LichSu", "DiaLy", "GDCD", "NgoaiNgu"]
    subject_names = ["Toán", "Ngữ Văn", "Vật Lý", "Hóa Học", "Sinh Học", "Lịch Sử", "Địa Lý", "GDCD", "Ngoại Ngữ"]
    
    for i, subject in enumerate(subjects):
        while True:
            try:
                score_input = input(f"{subject_names[i]}: ")
                if not score_input:
                    student_data["scores"][subject] = 0.0
                    break
                    
                score = float(score_input)
                if 0 <= score <= 10:
                    student_data["scores"][subject] = score
                    break
                else:
                    print("Điểm phải từ 0 đến 10.")
            except ValueError:
                print("Vui lòng nhập một số hợp lệ.")
    
    # Nhập khối thi
    while True:
        tohopthi = input("\nKhối thi (TN: Tự nhiên, XH: Xã hội): ").strip().upper()
        if tohopthi in ["TN", "XH"]:
            student_data["tohopthi"] = tohopthi
            break
        else:
            print("Vui lòng nhập TN hoặc XH.")
    
    # Nhập tổ hợp môn
    print("\nNhập các tổ hợp môn thi (A00, A01, B00, C00, D01, ...):")
    print("Các tổ hợp phổ biến:")
    print("A00: Toán, Lý, Hóa")
    print("A01: Toán, Lý, Anh")
    print("B00: Toán, Hóa, Sinh")
    print("C00: Văn, Sử, Địa")
    print("D01: Toán, Văn, Anh")
    
    print("Nhập các tổ hợp môn, cách nhau bởi dấu phẩy:")
    subject_groups = input("Tổ hợp môn: ").strip().upper()
    student_data["subject_groups"] = [group.strip() for group in subject_groups.split(",") if group.strip()]
    
    # Nhập sở thích
    print("\nNhập các sở thích (cách nhau bởi dấu phẩy):")
    interests = input("Sở thích: ").strip()
    student_data["interests"] = [interest.strip() for interest in interests.split(",") if interest.strip()]
    
    # Nhập điểm ưu tiên
    while True:
        try:
            priority_score = input("\nĐiểm ưu tiên (0-4): ")
            if not priority_score:
                student_data["priorityScore"] = 0.0
                break
                
            score = float(priority_score)
            if 0 <= score <= 4:
                student_data["priorityScore"] = score
                break
            else:
                print("Điểm ưu tiên phải từ 0 đến 4.")
        except ValueError:
            print("Vui lòng nhập một số hợp lệ.")
    
    return student_data

def predict_for_student(student_data):
    """
    Thực hiện dự đoán cho một học sinh
    
    Args:
        student_data: Dictionary chứa thông tin học sinh
    """
    try:
        print("Đang khởi tạo DataPreprocessor...")
        preprocessor = DataPreprocessor()
        
        print("Đang tải mô hình và scaler...")
        model, scaler = load_model_and_scaler()
        
        print("Đang dự đoán ngành học phù hợp...")
        recommendations = predict_majors(model, scaler, preprocessor, student_data)
        
        # Hiển thị kết quả
        print("\n==== KẾT QUẢ DỰ ĐOÁN NGÀNH HỌC ====")
        print(f"Sở thích của học sinh: {', '.join(student_data['interests'])}")
        print(f"Tổ hợp môn: {', '.join(student_data['subject_groups'])}")
        print(f"Khối thi: {student_data['tohopthi']}")
        
        for i, rec in enumerate(recommendations):
            print(f"\n{i+1}. Ngành: {rec['major_name']}")
            print(f"   Độ phù hợp: {rec['confidence']*100:.1f}%")
            
            if rec['matching_interests']:
                print(f"   Sở thích phù hợp: {', '.join(rec['matching_interests'])}")
            else:
                print(f"   Không có sở thích nào phù hợp trực tiếp")
                
            print(f"   Thuộc lĩnh vực: {rec['category']}")
            print(f"   Tổ hợp môn tốt nhất: {rec['best_combination']}")
            print(f"   Tổng điểm: {rec['total_score']}")
            
            if rec['description']:
                print(f"   Mô tả: {rec['description'][:100]}..." if len(rec['description']) > 100 else f"   Mô tả: {rec['description']}")
        
    except Exception as e:
        print(f"Lỗi khi dự đoán: {e}")
        import traceback
        traceback.print_exc()

def show_menu():
    """Hiển thị menu lựa chọn"""
    clear_screen()
    print("==================================================")
    print("  CHƯƠNG TRÌNH DỰ ĐOÁN NGÀNH HỌC CHO HỌC SINH")
    print("==================================================")
    print("1. Dự đoán với mẫu 1 (Học sinh khoa học tự nhiên)")
    print("2. Dự đoán với mẫu 2 (Học sinh khoa học xã hội)")
    print("3. Dự đoán với mẫu 3 (Học sinh y dược)")
    print("4. Nhập thông tin học sinh mới")
    print("0. Thoát")
    print("--------------------------------------------------")

def main():
    """Hàm chính của chương trình"""
    while True:
        show_menu()
        choice = input("Nhập lựa chọn của bạn: ")
        
        if choice == "0":
            print("Cảm ơn bạn đã sử dụng chương trình!")
            break
            
        elif choice in ["1", "2", "3"]:
            sample_number = int(choice)
            clear_screen()
            print(f"Đang dự đoán với mẫu {sample_number}...")
            predict_with_sample_data(sample_number)
            input("\nNhấn Enter để tiếp tục...")
            
        elif choice == "4":
            clear_screen()
            student_data = input_student_data()
            predict_for_student(student_data)
            input("\nNhấn Enter để tiếp tục...")
            
        else:
            print("Lựa chọn không hợp lệ. Vui lòng thử lại.")
            input("Nhấn Enter để tiếp tục...")

if __name__ == "__main__":
    main() 