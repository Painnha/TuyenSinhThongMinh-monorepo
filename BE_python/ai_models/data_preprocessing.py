import numpy as np
import pandas as pd
from pymongo import MongoClient
from bson import ObjectId

class DataPreprocessor:
    def __init__(self, db_client):
        """Khởi tạo DataPreprocessor với kết nối MongoDB"""
        self.db_client = db_client
        
        # Lấy dữ liệu từ MongoDB
        self.interests_data = self.db_client.fetch_data('interests')
        self.subject_combinations_data = self.db_client.fetch_data('subject_combinations')
        self.majors_data = self.db_client.fetch_data('majors')
        
        # Tạo các mapping cần thiết
        self.interest_to_id = {data['name']: str(data['_id']) for data in self.interests_data}
        self.id_to_interest = {str(data['_id']): data['name'] for data in self.interests_data}
        
        self.subject_comb_to_id = {data['code']: str(data['_id']) for data in self.subject_combinations_data}
        self.id_to_subject_comb = {str(data['_id']): data['code'] for data in self.subject_combinations_data}
        
        self.major_to_id = {data['name']: str(data['_id']) for data in self.majors_data}
        self.id_to_major = {str(data['_id']): data['name'] for data in self.majors_data}
        
        # Định nghĩa giá trị ưu tiên
        self.area_priority_map = {'KV1': 0.75, 'KV2': 0.5, 'KV3': 0.25}
        self.subject_priority_map = {f"{i:02d}": 0.1 * i for i in range(1, 8)}
        
        # Danh sách các môn học
        self.subjects = ['Toan', 'NguVan', 'VatLy', 'HoaHoc', 'SinhHoc', 'LichSu', 'DiaLy', 'GDCD', 'NgoaiNgu']
    
    def preprocess_student_data(self, student_data):
        """
        Tiền xử lý dữ liệu học sinh
        
        Args:
            student_data: Dictionary chứa thông tin học sinh:
                - scores: Dict điểm số các môn
                - priority: Dict khu vực ưu tiên và đối tượng ưu tiên
                - interests: List sở thích (tối đa 3)
                - tohopthi: String 'TN' hoặc 'XH'
                
        Returns:
            Numpy array đặc trưng đã xử lý
        """
        # Xử lý điểm số (9 môn)
        scores = np.zeros(9)
        for i, subject in enumerate(self.subjects):
            if subject in student_data.get('scores', {}):
                if student_data['scores'][subject] == '':
                    scores[i] = 0.0
                else:
                    scores[i] = float(student_data['scores'][subject]) / 10.0  # Chuẩn hóa về [0,1]
        
        # Xử lý tổ hợp thi
        tohopthi = np.zeros(2)  # TN, XH
        if 'tohopthi' in student_data:
            if student_data['tohopthi'] == 'TN':
                tohopthi[0] = 1.0
            elif student_data['tohopthi'] == 'XH':
                tohopthi[1] = 1.0
        
        # Xử lý sở thích (one-hot encoding)
        interests = np.zeros(len(self.interest_to_id))
        for interest in student_data.get('interests', []):
            if interest in self.interest_to_id:
                interest_idx = list(self.interest_to_id.keys()).index(interest)
                interests[interest_idx] = 1.0
        
        # Xử lý tổ hợp môn (one-hot encoding)
        subject_groups = np.zeros(len(self.subject_comb_to_id))
        for group in student_data.get('subject_groups', []):
            if group in self.subject_comb_to_id:
                group_idx = list(self.subject_comb_to_id.keys()).index(group)
                subject_groups[group_idx] = 1.0
        
        # Kết hợp tất cả đặc trưng
        features = np.concatenate([
            scores,          # 9 đặc trưng
            tohopthi,        # 2 đặc trưng
            interests,       # N đặc trưng (số lượng sở thích trong DB)
            subject_groups   # M đặc trưng (số lượng tổ hợp môn trong DB)
        ])
        
        return features
    
    def get_major_by_id(self, major_id):
        """Lấy tên ngành dựa trên ID"""
        return self.id_to_major.get(str(major_id))
    
    def get_major_info(self, major_name):
        """Lấy thông tin ngành học"""
        major_data = next((m for m in self.majors_data if m['name'] == major_name), None)
        if not major_data:
            return {}
        
        # Chuẩn hóa dữ liệu để trả về client
        major_info = {
            'name': major_data.get('name', ''),
            'code': major_data.get('code', ''),
            'category': major_data.get('category', ''),
            'description': major_data.get('description', ''),
            'interests': [],
            'market_trends': []
        }
        
        # Thêm thông tin sở thích
        if 'interests' in major_data and isinstance(major_data['interests'], list):
            major_info['interests'] = [{
                'name': interest.get('name', ''),
                'weight': interest.get('weight', 1)
            } for interest in major_data['interests']]
        
        # Thêm thông tin xu hướng thị trường
        if 'marketTrends' in major_data and isinstance(major_data['marketTrends'], list):
            major_info['market_trends'] = [{
                'year': trend.get('year', 2024),
                'score': trend.get('score', 0.5)
            } for trend in major_data['marketTrends']]
        
        return major_info
    
    def get_market_trend_weights(self):
        """
        Lấy trọng số xu hướng thị trường cho mỗi ngành
        
        Returns:
            Dictionary ánh xạ từ major ID đến trọng số xu hướng thị trường
        """
        trend_weights = {}
        
        for major in self.majors_data:
            major_id = str(major['_id'])
            
            # Lấy xu hướng thị trường mới nhất
            if 'marketTrends' in major and isinstance(major['marketTrends'], list) and len(major['marketTrends']) > 0:
                # Sắp xếp theo năm giảm dần và lấy năm mới nhất
                sorted_trends = sorted(major['marketTrends'], key=lambda x: x.get('year', 0), reverse=True)
                trend_weights[major_id] = sorted_trends[0].get('score', 0.5)
            else:
                # Mặc định nếu không có dữ liệu
                trend_weights[major_id] = 0.5
                
        return trend_weights
    
    def create_training_data_from_mongodb(self):
        """
        Tạo dữ liệu huấn luyện từ MongoDB
        
        Returns:
            X_train, y_train (numpy arrays) để huấn luyện mô hình
        """
        # Lấy dữ liệu huấn luyện từ collection training_data
        training_collection = self.db_client.get_collection('training_data')
        training_data = list(training_collection.find({'modelType': 'major_recommendation'}))
        
        if not training_data:
            raise ValueError("Không tìm thấy dữ liệu huấn luyện cho mô hình gợi ý ngành học")
        
        # Lấy tất cả records
        all_records = []
        for data in training_data:
            if 'records' in data and isinstance(data['records'], list):
                all_records.extend(data['records'])
        
        if not all_records:
            raise ValueError("Không có bản ghi nào trong dữ liệu huấn luyện")
        
        # Khởi tạo mảng
        X = []
        y = []
        
        for record in all_records:
            # Xử lý đặc trưng đầu vào
            scores = np.zeros(9)
            for i, subject in enumerate(self.subjects):
                if subject in record and record[subject] is not None:
                    if record[subject] == '':
                        scores[i] = 0.0
                    else:
                        scores[i] = float(record[subject]) / 10.0
            
            # Xử lý tohopthi
            tohopthi = np.zeros(2)
            if 'Tohopthi' in record:
                if record['Tohopthi'] == 'TN':
                    tohopthi[0] = 1.0
                elif record['Tohopthi'] == 'XH':
                    tohopthi[1] = 1.0
            
            # Xử lý sở thích
            interests = np.zeros(len(self.interest_to_id))
            if 'Interests' in record and isinstance(record['Interests'], list):
                for interest in record['Interests']:
                    if interest in self.interest_to_id:
                        interest_idx = list(self.interest_to_id.keys()).index(interest)
                        interests[interest_idx] = 1.0
            
            # Xử lý tổ hợp môn
            subject_groups = np.zeros(len(self.subject_comb_to_id))
            # Tìm các trường Subject_Group_1, Subject_Group_2, Subject_Group_3
            for i in range(1, 4):
                field = f'Subject_Group_{i}'
                if field in record and record[field]:
                    group = record[field]
                    if group in self.subject_comb_to_id:
                        group_idx = list(self.subject_comb_to_id.keys()).index(group)
                        subject_groups[group_idx] = 1.0
            
            # Kết hợp đặc trưng
            features = np.concatenate([scores, tohopthi, interests, subject_groups])
            X.append(features)
            
            # Xử lý nhãn (ngành học)
            major_scores = np.zeros(len(self.major_to_id))
            # Tìm các trường Major_1/Score_1, Major_2/Score_2, Major_3/Score_3
            for i in range(1, 4):
                major_field = f'Major_{i}'
                score_field = f'Score_{i}'
                if major_field in record and score_field in record:
                    major_name = record[major_field]
                    if major_name in self.major_to_id:
                        major_idx = list(self.major_to_id.keys()).index(major_name)
                        major_scores[major_idx] = float(record[score_field])
            
            y.append(major_scores)
        
        return np.array(X), np.array(y) 