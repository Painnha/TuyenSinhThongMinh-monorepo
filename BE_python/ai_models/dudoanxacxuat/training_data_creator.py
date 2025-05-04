import pandas as pd
import numpy as np
import os
import random
import sys
from datetime import datetime

# Thêm đường dẫn gốc vào sys.path để có thể import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
# Import MongoDBClient từ utils
from BE_python.utils.db_utils import db_client

# Thư mục lưu mô hình - sử dụng đường dẫn tuyệt đối
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

def get_admission_data():
    """
    Lấy dữ liệu điểm chuẩn và chỉ tiêu từ MongoDB
    Tương đương với file Diemchuan2020_2024_loc.csv và chitieu_2020_2025.csv
    """
    print("Đang truy vấn dữ liệu điểm chuẩn và chỉ tiêu từ MongoDB...")
    
    try:
        # Truy vấn dữ liệu từ admission_criteria
        admission_criteria = db_client.fetch_data('admission_criteria')
        
        # Nếu không có dữ liệu, hiển thị cảnh báo
        if not admission_criteria:
            print("Cảnh báo: Không tìm thấy dữ liệu trong collection admission_criteria")
            return None, None
        
        print(f"Đã tìm thấy {len(admission_criteria)} bản ghi dữ liệu admission_criteria")
        
        # Xử lý và định dạng dữ liệu điểm chuẩn
        diem_chuan_data = []
        chitieu_data = []
        
        # Lấy danh sách tổ hợp môn
        subject_combinations = db_client.fetch_and_normalize_subject_combinations()
        
        # Xử lý từng bản ghi admission_criteria
        for criteria in admission_criteria:
            # Lấy thông tin chi tiết về ngành từ collection majors
            major = db_client.fetch_data('majors', query={'_id': criteria['majorId']}, limit=1)
            
            # Bỏ qua nếu không tìm thấy thông tin ngành
            if not major or len(major) == 0:
                continue
                
            major = major[0]
            # Lấy tên chuẩn hóa không dấu của ngành
            major_name = major['nameNormalized']
            market_trends = {item['year']: item['score'] for item in major.get('marketTrends', [])}
            
            # Lấy thông tin về trường từ collection universities
            university = db_client.fetch_data('universities', query={'_id': criteria['universityId']}, limit=1)
            
            # Bỏ qua nếu không tìm thấy thông tin trường
            if not university or len(university) == 0:
                continue
                
            university = university[0]
            level_mapping = {'cao': 'Cao', 'trung bình': 'Trung bình', 'thấp': 'Thấp'}
            university_code = university['code']
            university_level = level_mapping.get(university.get('level', ''), 'Trung bình')
            
            # Xử lý chi tiêu tuyển sinh
            for quota_item in criteria.get('quota', []):
                year = quota_item.get('year')
                quota_value = quota_item.get('total')
                
                # Xử lý giá trị chỉ tiêu
                processed_quota = None
                if isinstance(quota_value, str):
                    if '-' in quota_value:
                        low, high = map(int, quota_value.split('-'))
                        processed_quota = (low + high) / 2
                    elif quota_value.isdigit():
                        processed_quota = int(quota_value)
                elif isinstance(quota_value, (int, float)):
                    processed_quota = float(quota_value)
                    
                if processed_quota is not None and year:
                    # Thêm vào dữ liệu chỉ tiêu
                    market_trend = market_trends.get(year, 0.5)  # Mặc định là 0.5 nếu không có
                    chitieu_data.append({
                        'Ngành': major_name,
                        'Trường': university_code,
                        'Mã trường': university_code,
                        'Năm': year,
                        'Chỉ tiêu THPT (Ước tính)': quota_value,
                        'Chỉ tiêu': processed_quota,
                        'market_trend': market_trend
                    })
        
        # Lấy dữ liệu điểm chuẩn từ lịch sử (cần bổ sung collection và logic cụ thể)
        # TODO: Cần bổ sung logic lấy điểm chuẩn thực tế từ MongoDB
        
        print(f"Đã xử lý dữ liệu chỉ tiêu: {len(chitieu_data)} bản ghi")
        
        # Chuyển đổi thành DataFrame để dễ xử lý
        diem_chuan_df = pd.DataFrame(diem_chuan_data)
        chitieu_df = pd.DataFrame(chitieu_data)
        
        return chitieu_df, diem_chuan_df
    
    except Exception as e:
        print(f"Lỗi khi truy vấn dữ liệu admission: {e}")
        return None, None

def get_student_data():
    """
    Lấy dữ liệu học sinh từ MongoDB
    Tương đương với file hoc_sinh_10000.csv
    """
    print("Đang truy vấn dữ liệu học sinh từ MongoDB...")
    
    try:
        # Truy vấn dữ liệu học sinh
        student_records = db_client.fetch_data('student_data')
        
        if not student_records:
            print("Cảnh báo: Không tìm thấy dữ liệu học sinh trong MongoDB")
            # Tạo dữ liệu giả nếu cần thiết
            return create_synthetic_student_data()
        
        print(f"Đã tìm thấy {len(student_records)} bản ghi dữ liệu học sinh")
        
        # Chuyển đổi dữ liệu sang định dạng tương tự với file CSV
        students_data = []
        
        for student in student_records:
            # Xử lý điểm số
            scores = student.get('scores', {})
            
            # Tính toán điểm theo khối
            khoi_scores = student.get('totalScores', {})
            
            # Tạo bản ghi cho học sinh
            student_record = {
                'SBD_New': str(student.get('_id')),
                'Toan': scores.get('Toan', 0),
                'NguVan': scores.get('NguVan', 0),
                'VatLy': scores.get('VatLy', 0),
                'HoaHoc': scores.get('HoaHoc', 0),
                'SinhHoc': scores.get('SinhHoc', 0),
                'LichSu': scores.get('LichSu', 0),
                'DiaLy': scores.get('DiaLy', 0),
                'GDCD': scores.get('GDCD', 0),
                'NgoaiNgu': scores.get('NgoaiNgu', 0),
                'KhoiA': khoi_scores.get('A00', 0),
                'KhoiA1': khoi_scores.get('A01', 0),
                'KhoiB': khoi_scores.get('B00', 0),
                'KhoiC': khoi_scores.get('C00', 0),
                'KhoiD': khoi_scores.get('D01', 0),
            }
            
            students_data.append(student_record)
        
        # Chuyển đổi thành DataFrame
        return pd.DataFrame(students_data)
    
    except Exception as e:
        print(f"Lỗi khi truy vấn dữ liệu học sinh: {e}")
        return create_synthetic_student_data()

def create_synthetic_student_data(num_students=1000):
    """
    Tạo dữ liệu học sinh tổng hợp nếu không có dữ liệu thực
    """
    print(f"Tạo {num_students} bản ghi dữ liệu học sinh tổng hợp...")
    
    students_data = []
    
    for i in range(num_students):
        # Tạo điểm ngẫu nhiên cho các môn (thang điểm 0-10)
        toan = round(random.uniform(5, 10), 2)
        van = round(random.uniform(5, 10), 2)
        ly = round(random.uniform(5, 10), 2)
        hoa = round(random.uniform(5, 10), 2)
        sinh = round(random.uniform(5, 10), 2)
        su = round(random.uniform(5, 10), 2)
        dia = round(random.uniform(5, 10), 2)
        gdcd = round(random.uniform(5, 10), 2)
        anh = round(random.uniform(5, 10), 2)
        
        # Tính điểm theo khối
        khoi_a = toan + ly + hoa
        khoi_a1 = toan + ly + anh
        khoi_b = toan + hoa + sinh
        khoi_c = van + su + dia
        khoi_d = van + toan + anh
        
        # Tạo bản ghi cho học sinh
        student_record = {
            'SBD_New': f"SYN{i+1:05d}",
            'Toan': toan,
            'NguVan': van,
            'VatLy': ly,
            'HoaHoc': hoa,
            'SinhHoc': sinh,
            'LichSu': su,
            'DiaLy': dia,
            'GDCD': gdcd,
            'NgoaiNgu': anh,
            'KhoiA': khoi_a,
            'KhoiA1': khoi_a1,
            'KhoiB': khoi_b,
            'KhoiC': khoi_c,
            'KhoiD': khoi_d,
        }
        
        students_data.append(student_record)
    
    # Chuyển đổi thành DataFrame
    return pd.DataFrame(students_data)

def calculate_score_trend(historical_scores):
    """
    Tính xu hướng điểm chuẩn dựa trên dữ liệu lịch sử
    """
    if len(historical_scores) >= 2:
        years = np.array([year for year, _ in historical_scores])
        scores = np.array([score for _, score in historical_scores])
        slope, _ = np.polyfit(years, scores, 1)
        return round(slope, 2)
    else:
        return 0

def calculate_expected_score(mu, t, q, q0, score_trend, alpha=0.5, beta=1.0, gamma=0.7):
    """
    Tính điểm chuẩn dự kiến với trọng số cao hơn cho xu hướng điểm chuẩn
    mu: điểm chuẩn trung bình
    t: xu hướng thị trường
    q: chỉ tiêu năm dự đoán
    q0: chỉ tiêu trung bình của ngành
    score_trend: xu hướng điểm chuẩn qua các năm
    """
    return round(mu + alpha * t - beta * (q / q0 - 1) + gamma * score_trend, 2)

def create_training_data():
    """
    Tạo dữ liệu huấn luyện cho mô hình dự đoán
    """
    # Lấy dữ liệu từ MongoDB
    chitieu_df, diem_chuan_df = get_admission_data()
    hoc_sinh_df = get_student_data()
    
    if chitieu_df is None or hoc_sinh_df.empty:
        print("Lỗi: Không đủ dữ liệu để tạo bộ huấn luyện")
        # Tạo dữ liệu tổng hợp nếu không có dữ liệu thực
        training_data = create_synthetic_training_data()
    else:
        # TODO: Tiếp tục xử lý và tạo dữ liệu huấn luyện từ dữ liệu thực
        # Tạm thời sử dụng dữ liệu tổng hợp
        training_data = create_synthetic_training_data()
    
    # Lưu vào MongoDB
    save_training_data_to_mongodb(training_data)
    
    # Đồng thời lưu ra file CSV cho việc huấn luyện mô hình
    csv_path = os.path.join(MODEL_DIR, 'training_data.csv')
    pd.DataFrame(training_data).to_csv(csv_path, index=False)
    print(f"Đã lưu dữ liệu huấn luyện vào {csv_path}")
    
    return training_data

def create_synthetic_training_data(num_samples=10000):
    """
    Tạo dữ liệu huấn luyện tổng hợp để thử nghiệm
    """
    print(f"Tạo {num_samples} mẫu dữ liệu huấn luyện tổng hợp...")
    
    try:
        # Danh sách mã trường
        universities = db_client.fetch_data('universities', projection={'code': 1})
        school_codes = [school['code'] for school in universities]
        
        # Danh sách ngành học
        majors = db_client.fetch_data('majors', projection={'nameNormalized': 1})
        majors_list = [major['nameNormalized'] for major in majors]
        
        # Tổ hợp xét tuyển phổ biến
        combinations = ['A00', 'A01', 'B00', 'C00', 'D01']
        
        # Năm dự đoán
        target_year = 2025
        
        training_data = []
        
        for _ in range(num_samples):
            # Chọn ngẫu nhiên trường, ngành, tổ hợp
            school = random.choice(school_codes) if school_codes else 'NLS'
            major = random.choice(majors_list) if majors_list else 'cong nghe thong tin'
            combination = random.choice(combinations)
            
            # Tạo điểm ngẫu nhiên
            student_score = round(random.uniform(14, 29), 2)  # Điểm từ 14-29
            average_score = round(random.uniform(15, 26), 2)  # Điểm trung bình từ 15-26
            
            # Các thông số khác
            quota = round(random.uniform(50, 300), 2)  # Chỉ tiêu
            q0 = round(random.uniform(80, 200), 2)  # Chỉ tiêu tham chiếu
            market_trend = round(random.uniform(0.3, 0.9), 2)  # Xu hướng thị trường
            score_trend = round(random.uniform(-0.5, 0.5), 2)  # Xu hướng điểm chuẩn
            
            # Tính điểm chuẩn dự kiến
            expected_score = calculate_expected_score(
                average_score, market_trend, quota, q0, score_trend
            )
            
            # Tính xác suất trúng tuyển
            score_diff = student_score - expected_score
            k = 1.0  # Hệ số điều chỉnh
            probability = 1 / (1 + np.exp(-k * score_diff))
            probability = round(probability, 4)
            
            # Tạo mẫu dữ liệu
            sample = {
                'SBD': f"SYN{_+1:05d}",
                'Trường': school,
                'Ngành': major,
                'Tổ hợp': combination,
                'Năm': target_year,
                'Điểm học sinh': student_score,
                'Điểm chuẩn trung bình': average_score,
                'Điểm chuẩn dự kiến': expected_score,
                'Chỉ tiêu': quota,
                'q0': q0,
                'Market trend': market_trend,
                'Xu hướng điểm chuẩn': score_trend,
                'Xác suất trúng tuyển': probability
            }
            
            training_data.append(sample)
        
        return training_data
    
    except Exception as e:
        print(f"Lỗi khi tạo dữ liệu huấn luyện tổng hợp: {e}")
        # Tạo dữ liệu mặc định nếu có lỗi
        training_data = []
        
        for i in range(1000):  # Số lượng mẫu giảm xuống khi có lỗi
            sample = {
                'SBD': f"SYN{i+1:05d}",
                'Trường': 'NLS',
                'Ngành': 'cong nghe thong tin',
                'Tổ hợp': 'A00',
                'Năm': 2025,
                'Điểm học sinh': round(random.uniform(14, 29), 2),
                'Điểm chuẩn trung bình': round(random.uniform(15, 26), 2),
                'Điểm chuẩn dự kiến': round(random.uniform(15, 26), 2),
                'Chỉ tiêu': 100,
                'q0': 100,
                'Market trend': 0.5,
                'Xu hướng điểm chuẩn': 0,
                'Xác suất trúng tuyển': round(random.uniform(0, 1), 4)
            }
            training_data.append(sample)
        
        return training_data

def save_training_data_to_mongodb(training_data):
    """
    Lưu dữ liệu huấn luyện vào MongoDB
    """
    if not training_data:
        print("Không có dữ liệu huấn luyện để lưu")
        return False
    
    try:
        # Tạo bản ghi mới trong collection training_data
        training_record = {
            'modelType': 'admission_probability',
            'dataSource': 'synthetic',
            'dataVersion': '1.0',
            'records': training_data,
            'metadata': {
                'totalRecords': len(training_data),
                'createdAt': datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f"),
                'updatedAt': datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
            }
        }
        
        # Xóa dữ liệu cũ nếu có
        db_client.delete_many('training_data', {'modelType': 'admission_probability'})
        
        # Thêm bản ghi mới
        result = db_client.insert_one('training_data', training_record)
        
        print(f"Đã lưu dữ liệu huấn luyện vào MongoDB")
        
        # Cập nhật thông tin mô hình
        model_config = {
            'modelName': 'admission_probability',
            'version': '1.0.0',
            'parameters': {
                'input_features': [
                    'student_score', 'average_score', 'expected_score', 
                    'score_diff', 'quota', 'q0', 'market_trend', 'score_trend'
                ],
                'training_samples': len(training_data),
                'validation_accuracy': 1.0,  # Giá trị mô phỏng
                'training_date': datetime.now().isoformat()
            },
            'active': True,
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }
        
        # Cập nhật thông tin mô hình
        db_client.update_one(
            'model_configs',
            {'modelName': 'admission_probability'},
            {'$set': model_config}
        )
        
        return True
    
    except Exception as e:
        print(f"Lỗi khi lưu dữ liệu vào MongoDB: {e}")
        return False

if __name__ == "__main__":
    # Tạo dữ liệu huấn luyện
    create_training_data() 