import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import os
import sys
import datetime
from bson import ObjectId

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.db_utils import db_client

class DataPreprocessor:
    def __init__(self):
        """
        Khởi tạo DataPreprocessor sử dụng MongoDB thay vì file CSV
        """
        # Lấy dữ liệu từ MongoDB
        self.interests = db_client.fetch_data('interests')
        self.subject_combinations = db_client.fetch_data('subject_combinations')
        self.majors = db_client.fetch_data('majors')
        
        # Tạo mapping để dễ sử dụng
        self.interest_to_id = {interest['name']: i for i, interest in enumerate(self.interests)}
        self.subject_comb_to_id = {comb['code']: i for i, comb in enumerate(self.subject_combinations)}
        
        # Tạo danh sách tên ngành (major name) cho model
        # Tạo cả mapping chuẩn hóa không dấu và không phân biệt hoa thường
        self.major_to_id = {}
        self.id_to_major = {}
        
        for i, major in enumerate(self.majors):
            name = major['name']
            self.major_to_id[name] = i
            self.id_to_major[i] = name
            
            # Thêm cả phiên bản lower case để dễ matching
            self.major_to_id[name.lower()] = i
            
            # Thêm mapping normalized name nếu có
            if 'nameNormalized' in major:
                self.major_to_id[major['nameNormalized']] = i
        
        # In ra thông tin mapping
        print(f"Đã tạo mapping cho {len(self.id_to_major)} ngành học")
        print(f"Tổng số khóa trong major_to_id: {len(self.major_to_id)}")
        
        # Tạo thêm mapping normalized bằng phương thức tự xây dựng
        self._create_normalized_mappings()
        
        # Định nghĩa giá trị ưu tiên khu vực và đối tượng
        self.area_priority_map = {'KV1': 0.75, 'KV2': 0.5, 'KV3': 0.25}
        self.subject_priority_map = {f"{i:02d}": 0.1 * i for i in range(1, 8)}
        
        # Danh sách các môn học
        self.subjects = ['Toan', 'NguVan', 'VatLy', 'HoaHoc', 'SinhHoc', 'LichSu', 'DiaLy', 'GDCD', 'NgoaiNgu']
    
    def _create_normalized_mappings(self):
        """Tạo thêm các mapping chuẩn hóa cho ngành học"""
        # Xác định một list các từ thay thế và ký tự đặc biệt để xử lý
        replace_dict = {
            'và': 'and',
            'quốc tế': 'quoc te',
            'kỹ thuật': 'ky thuat',
            'công nghệ': 'cong nghe',
            'khoa học': 'khoa hoc',
            'dữ liệu': 'du lieu',
            'trí tuệ': 'tri tue',
            'nhân tạo': 'nhan tao',
            'kinh tế': 'kinh te',
            'quản trị': 'quan tri',
            'quản lý': 'quan ly',
            'thông tin': 'thong tin',
            'lữ hành': 'lu hanh',
            'môi trường': 'moi truong',
            'điện tử': 'dien tu',
            'tài chính': 'tai chinh',
            'ngân hàng': 'ngan hang'
        }
        
        # Duyệt qua tất cả majors và tạo thêm các phiên bản normalized
        for major_id, major_name in self.id_to_major.items():
            # Tạo phiên bản lowercase và bỏ dấu gạch ngang
            normalized = major_name.lower().replace('-', ' ')
            
            # Thay thế các từ đặc biệt
            for original, replacement in replace_dict.items():
                normalized = normalized.replace(original, replacement)
            
            # Bỏ khoảng trắng đầu cuối
            normalized = normalized.strip()
            
            # Thêm vào mapping
            if normalized not in self.major_to_id:
                self.major_to_id[normalized] = major_id
        
        print(f"Sau khi normalized: Tổng số khóa trong major_to_id: {len(self.major_to_id)}")
        
        # Tạo các phiên bản không có dấu cách
        additional_mappings = {}
        for name, idx in self.major_to_id.items():
            no_space = name.replace(' ', '')
            if no_space not in self.major_to_id:
                additional_mappings[no_space] = idx
        
        # Cập nhật mapping với các phiên bản không có dấu cách
        self.major_to_id.update(additional_mappings)
        print(f"Sau khi thêm no-space versions: Tổng số khóa trong major_to_id: {len(self.major_to_id)}")
        
        # In ra một số mapping để kiểm tra
        print("Một số mapping mẫu:")
        sample_keys = list(self.major_to_id.keys())[:5]
        for key in sample_keys:
            print(f"  {key} -> {self.id_to_major[self.major_to_id[key]]}")
    
    def preprocess_student_data(self, student_data):
        """
        Tiền xử lý dữ liệu của một học sinh
        
        Args:
            student_data: Dictionary chứa:
                - scores: Dict điểm số các môn (Toan, NguVan, etc.)
                - interests: Danh sách sở thích (tối đa 3)
                - subject_groups: Danh sách tổ hợp môn mong muốn (tối đa 2)
                
        Returns:
            Mảng numpy chứa đặc trưng đã tiền xử lý
        """
        # Xử lý điểm số (9 môn)
        scores = np.zeros(9)
        for i, subject in enumerate(self.subjects):
            if subject in student_data['scores']:
                scores[i] = student_data['scores'][subject] / 10.0  # Chuẩn hóa về [0,1]
            
        # Xử lý khối thi (TN, XH)
        tohopthi = np.zeros(2)  # TN, XH
        if 'tohopthi' in student_data:
            if student_data['tohopthi'] == 'TN':
                tohopthi[0] = 1.0
            elif student_data['tohopthi'] == 'XH':
                tohopthi[1] = 1.0
                
        # Xử lý sở thích (one-hot encoding)
        interests = np.zeros(len(self.interest_to_id))
        for interest in student_data['interests']:
            if interest in self.interest_to_id:
                interests[self.interest_to_id[interest]] = 1.0
                
        # Xử lý tổ hợp môn (one-hot encoding)
        subject_groups = np.zeros(len(self.subject_comb_to_id))
        for group in student_data['subject_groups']:
            if group in self.subject_comb_to_id:
                subject_groups[self.subject_comb_to_id[group]] = 1.0
                
        # Gộp tất cả đặc trưng
        features = np.concatenate([
            scores,  # 9 đặc trưng
            tohopthi,  # 2 đặc trưng
            interests,  # n đặc trưng (số lượng sở thích)
            subject_groups  # m đặc trưng (số lượng tổ hợp môn)
        ])
        
        return features
    
    def preprocess_training_data(self):
        """
        Tiền xử lý dữ liệu huấn luyện lấy từ MongoDB
        
        Returns:
            X, y: Mảng numpy của đặc trưng đầu vào và nhãn đầu ra
        """
        # Lấy dữ liệu huấn luyện từ MongoDB
        training_data = db_client.fetch_data(
            'training_data', 
            query={'modelType': 'major_recommendation'}
        )
        
        # Kiểm tra xem có dữ liệu không
        if not training_data or len(training_data) == 0:
            raise ValueError("Không tìm thấy dữ liệu huấn luyện trong MongoDB")
            
        # Lấy bản ghi đầu tiên (giả sử chỉ có một document)
        records = training_data[0]['records']
        
        # Khởi tạo mảng
        X = []
        y = []
        
        # Debug: Kiểm tra số lượng sở thích
        print(f"DEBUG: Số lượng sở thích trong mô hình: {len(self.interest_to_id)}")
        print(f"DEBUG: Một số sở thích đầu tiên: {list(self.interest_to_id.keys())[:5]}")
        
        for record in records:
            # Xử lý điểm số
            scores = np.zeros(9)
            for i, subject in enumerate(self.subjects):
                if subject in record and record[subject] != "":
                    scores[i] = float(record[subject]) / 10.0  # Chuẩn hóa về [0,1]
            
            # Xử lý khối thi (TN hoặc XH)
            tohopthi = np.zeros(2)  # TN, XH
            if 'Tohopthi' in record:
                if record['Tohopthi'] == 'TN':
                    tohopthi[0] = 1.0
                elif record['Tohopthi'] == 'XH':
                    tohopthi[1] = 1.0
            
            # Xử lý sở thích - CẢI TIẾN: Kiểm tra nhiều định dạng có thể có
            interests = np.zeros(len(self.interest_to_id))
            if 'Interests' in record:
                if isinstance(record['Interests'], str):
                    # Xử lý trường hợp Interests là chuỗi
                    student_interests = record['Interests'].split(',')
                    for interest in student_interests:
                        interest = interest.strip()
                        if interest in self.interest_to_id:
                            interests[self.interest_to_id[interest]] = 1.0
                        else:
                            print(f"DEBUG: Không tìm thấy sở thích '{interest}' trong mapping")
                elif isinstance(record['Interests'], list):
                    # Xử lý trường hợp Interests là danh sách
                    for interest in record['Interests']:
                        if isinstance(interest, str) and interest in self.interest_to_id:
                            interests[self.interest_to_id[interest]] = 1.0
                        elif isinstance(interest, dict) and 'name' in interest and interest['name'] in self.interest_to_id:
                            interests[self.interest_to_id[interest['name']]] = 1.0
            
            # DEBUG: Kiểm tra nếu vector sở thích toàn 0
            if np.sum(interests) == 0:
                print(f"DEBUG: Record có vector sở thích toàn 0: {record.get('Interests', 'Không có')}")
                # Nếu không có sở thích, thử áp dụng các sở thích từ ngành đã chọn
                if 'Major_1' in record and record['Major_1']:
                    major_name = record['Major_1'].lower().strip()
                    # Tìm các sở thích liên quan đến ngành này từ dữ liệu majors
                    for major in self.majors:
                        if major['name'] == major_name and 'interests' in major:
                            for interest_obj in major['interests']:
                                if 'name' in interest_obj and interest_obj['name'] in self.interest_to_id:
                                    interests[self.interest_to_id[interest_obj['name']]] = 1.0
            
            # Xử lý tổ hợp môn
            subject_groups = np.zeros(len(self.subject_comb_to_id))
            
            # Xử lý tổ hợp môn từ định dạng mới
            for i in range(1, 4):  # Kiểm tra tất cả 3 lựa chọn ngành tiềm năng
                subject_group_col = f'Subject_Group_{i}'
                if subject_group_col in record and record[subject_group_col] != "":
                    group = record[subject_group_col]
                    if group in self.subject_comb_to_id:
                        subject_groups[self.subject_comb_to_id[group]] = 1.0
            
            # Gộp đặc trưng
            features = np.concatenate([
                scores,
                tohopthi,
                interests,
                subject_groups
            ])
            
            X.append(features)
            
            # Xử lý mục tiêu - ngành học ưu tiên và điểm số
            major_scores = np.zeros(len(self.major_to_id))
            
            # Xử lý từ định dạng mới (Major_1, Score_1, Major_2, Score_2, Major_3, Score_3)
            for i in range(1, 4):
                major_col = f'Major_{i}'
                score_col = f'Score_{i}'
                if major_col in record and score_col in record and record[major_col] and record[score_col]:
                    major = record[major_col].lower().strip()
                    if major in self.major_to_id:
                        major_scores[self.major_to_id[major]] = float(record[score_col])
                    else:
                        print(f"DEBUG: Không tìm thấy ngành '{major}' trong mapping")
            
            y.append(major_scores)
        
        # DEBUG: Kiểm tra số lượng mẫu và phân phối đặc trưng
        X_array = np.array(X)
        y_array = np.array(y)
        print(f"DEBUG: Số lượng mẫu huấn luyện: {len(X_array)}")
        print(f"DEBUG: Số lượng features: {X_array.shape[1]}")
        print(f"DEBUG: Số lượng ngành: {y_array.shape[1]}")
        
        # Kiểm tra phân phối của đặc trưng sở thích
        print(f"DEBUG: Tỷ lệ mẫu có ít nhất một sở thích: {np.mean(np.sum(X_array[:, 11:11+len(self.interest_to_id)], axis=1) > 0) * 100:.2f}%")
        
        return X_array, y_array
    
    def get_market_trend_weights(self):
        """
        Lấy trọng số xu hướng thị trường cho mỗi ngành
        
        Returns:
            Dictionary mapping từ major IDs đến trọng số xu hướng thị trường
        """
        trend_weights = {}
        
        # Lấy năm hiện tại
        current_year = datetime.datetime.now().year
        
        for major in self.majors:
            major_id = self.major_to_id.get(major['name'])
            if major_id is not None:
                # Tìm xu hướng của năm hiện tại
                market_trend = 0.5  # Giá trị mặc định
                if 'marketTrends' in major:
                    for trend in major['marketTrends']:
                        if trend['year'] == current_year:
                            market_trend = trend['score']
                            break
                trend_weights[major_id] = market_trend
        
        return trend_weights
    
    def get_major_by_id(self, major_id):
        """Lấy tên ngành theo ID"""
        return self.id_to_major.get(major_id)
    
    def get_major_info(self, major_name):
        """Lấy thông tin ngành"""
        major_info = None
        for major in self.majors:
            if major['name'] == major_name:
                major_info = major
                break
                
        return major_info or {} 