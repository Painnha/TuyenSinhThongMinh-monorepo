import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import os

class DataPreprocessor:
    def __init__(self, interest_file, subject_combination_file, diem_chuan_file=None, market_trend_file=None):
        # Load data
        self.interests_df = pd.read_csv(interest_file)
        self.subject_combinations_df = pd.read_csv(subject_combination_file)
        
        # Tạo dữ liệu major từ hai file mới
        self.majors_df = self.create_major_data(diem_chuan_file, market_trend_file)
        
        # Create mappings
        self.interest_to_id = {name: i for i, name in enumerate(self.interests_df['interest_name'])}
        self.subject_comb_to_id = {code: i for i, code in enumerate(self.subject_combinations_df['combination_code'])}
        self.major_to_id = {name: i for i, name in enumerate(self.majors_df['major_name'])}
        self.id_to_major = {i: name for name, i in self.major_to_id.items()}
        
        # Define area priority values
        self.area_priority_map = {'KV1': 0.75, 'KV2': 0.5, 'KV3': 0.25}
        self.subject_priority_map = {f"{i:02d}": 0.1 * i for i in range(1, 8)}
        
        # New subject names based on training_final.csv
        self.subjects = ['Toan', 'NguVan', 'VatLy', 'HoaHoc', 'SinhHoc', 'LichSu', 'DiaLy', 'GDCD', 'NgoaiNgu']
        
    def create_major_data(self, diem_chuan_file, market_trend_file):
        """Tạo dữ liệu ngành từ DiemChuan.csv và market_trend.csv"""
        # Tạo DataFrame mặc định nếu không có file
        majors_df = pd.DataFrame(columns=['major_name', 'category', 'market_trend', 'primary_subject_groups', 
                                         'secondary_subject_groups', 'interests'])
        
        # Nếu có file điểm chuẩn, đọc dữ liệu
        if diem_chuan_file and os.path.exists(diem_chuan_file):
            try:
                diem_chuan_df = pd.read_csv(diem_chuan_file)
                
                # Tạo danh sách các ngành duy nhất
                unique_majors = diem_chuan_df['Ngành'].str.strip().str.lower().unique()
                
                # Tạo dữ liệu tổ hợp môn cho từng ngành
                major_subject_groups = {}
                for major in unique_majors:
                    # Lấy tất cả tổ hợp môn cho ngành
                    subject_groups = diem_chuan_df[diem_chuan_df['Ngành'].str.strip().str.lower() == major]['Tổ hợp'].unique()
                    if len(subject_groups) > 0:
                        primary_groups = subject_groups[:min(3, len(subject_groups))]
                        secondary_groups = subject_groups[3:] if len(subject_groups) > 3 else []
                        
                        major_subject_groups[major] = {
                            'primary_subject_groups': ','.join(primary_groups),
                            'secondary_subject_groups': ','.join(secondary_groups)
                        }
                
                # Khởi tạo DataFrame với các ngành
                majors_df = pd.DataFrame({
                    'major_name': unique_majors,
                    'category': 'Không xác định',  # Mặc định
                    'market_trend': 10.0,  # Mặc định
                    'primary_subject_groups': [major_subject_groups.get(m, {}).get('primary_subject_groups', '') for m in unique_majors],
                    'secondary_subject_groups': [major_subject_groups.get(m, {}).get('secondary_subject_groups', '') for m in unique_majors],
                    'interests': ''  # Mặc định
                })
                
                # Phân loại ngành dựa trên tên
                categories = {
                    'công nghệ': 'Công nghệ',
                    'kỹ thuật': 'Kỹ thuật',
                    'xây dựng': 'Kỹ thuật',
                    'kinh tế': 'Kinh tế',
                    'kinh doanh': 'Kinh tế',
                    'marketing': 'Kinh tế',
                    'quản trị': 'Kinh tế',
                    'ngôn ngữ': 'Ngôn ngữ',
                    'y': 'Y học',
                    'dược': 'Y học',
                    'sư phạm': 'Giáo dục',
                    'giáo dục': 'Giáo dục',
                    'luật': 'Luật',
                    'khoa học': 'Khoa học'
                }
                
                # Gán category cho từng ngành
                for idx, major in enumerate(majors_df['major_name']):
                    for key, category in categories.items():
                        if key in major:
                            majors_df.loc[idx, 'category'] = category
                            break
                
            except Exception as e:
                print(f"Lỗi khi đọc file điểm chuẩn: {e}")
        
        # Cập nhật market_trend nếu có file
        if market_trend_file and os.path.exists(market_trend_file):
            try:
                market_df = pd.read_csv(market_trend_file)
                
                # Chuẩn hóa tên ngành
                market_df['Ngành'] = market_df['Ngành'].str.strip().str.lower()
                
                # Tạo dict mapping từ tên ngành đến market_trend và interests
                market_data = {}
                for _, row in market_df.iterrows():
                    market_data[row['Ngành']] = {
                        'market_trend': row['market_trend'],
                        'interests': row['interests']
                    }
                
                # Cập nhật dữ liệu major_df
                for idx, major in enumerate(majors_df['major_name']):
                    if major in market_data:
                        majors_df.loc[idx, 'market_trend'] = market_data[major]['market_trend']
                        majors_df.loc[idx, 'interests'] = market_data[major]['interests']
                
            except Exception as e:
                print(f"Lỗi khi đọc file market trend: {e}")
        
        return majors_df
        
    def preprocess_student_data(self, student_data):
        """
        Preprocess a student's input data
        
        Args:
            student_data: Dictionary containing:
                - scores: Dict of subject scores (Toan, NguVan, etc.)
                - interests: List of student interests (max 3)
                - subject_groups: List of desired subject combinations (max 2)
                
        Returns:
            Numpy array of preprocessed features
        """
        # Process scores (9 subjects)
        scores = np.zeros(9)
        for i, subject in enumerate(self.subjects):
            if subject in student_data['scores']:
                scores[i] = student_data['scores'][subject] / 10.0  # Normalize to [0,1]
            
        # Process tohopthi
        tohopthi = np.zeros(2)  # TN, XH
        if 'tohopthi' in student_data:
            if student_data['tohopthi'] == 'TN':
                tohopthi[0] = 1.0
            elif student_data['tohopthi'] == 'XH':
                tohopthi[1] = 1.0
                
        # Process interests (one-hot encoding)
        interests = np.zeros(len(self.interest_to_id))
        for interest in student_data['interests']:
            if interest in self.interest_to_id:
                interests[self.interest_to_id[interest]] = 1.0
                
        # Process subject combinations (one-hot encoding)
        subject_groups = np.zeros(len(self.subject_comb_to_id))
        for group in student_data['subject_groups']:
            if group in self.subject_comb_to_id:
                subject_groups[self.subject_comb_to_id[group]] = 1.0
                
        # Combine all features
        features = np.concatenate([
            scores,  # 9 features
            tohopthi,  # 2 features
            interests,  # 43 features
            subject_groups  # 49 features
        ])
        
        return features
    
    def preprocess_training_data(self, training_file):
        """Preprocess training data based on new format"""
        training_df = pd.read_csv(training_file)
        
        # In ra tên cột để kiểm tra
        print("Columns in training data:", training_df.columns.tolist())
        
        # Initialize arrays
        X = []
        y = []
        
        for _, row in training_df.iterrows():
            # Process scores
            scores = np.zeros(9)
            for i, subject in enumerate(self.subjects):
                if subject in row and not pd.isna(row[subject]):
                    scores[i] = float(row[subject]) / 10.0  # Normalize to [0,1]
            
            # Process tohopthi
            tohopthi = np.zeros(2)  # TN, XH
            if 'Tohopthi' in row:
                if row['Tohopthi'] == 'TN':
                    tohopthi[0] = 1.0
                elif row['Tohopthi'] == 'XH':
                    tohopthi[1] = 1.0
            
            # Process interests
            interests = np.zeros(len(self.interest_to_id))
            if 'Interests' in row and isinstance(row['Interests'], str):
                student_interests = row['Interests'].split(',')
                for interest in student_interests:
                    interest = interest.strip()
                    if interest in self.interest_to_id:
                        interests[self.interest_to_id[interest]] = 1.0
            
            # Process subject combinations
            subject_groups = np.zeros(len(self.subject_comb_to_id))
            
            # Process subject group preferences from new data format
            for i in range(1, 4):  # Check all 3 potential major choices
                subject_group_col = f'Subject_Group_{i}'
                if subject_group_col in row and not pd.isna(row[subject_group_col]):
                    group = row[subject_group_col]
                    if group in self.subject_comb_to_id:
                        subject_groups[self.subject_comb_to_id[group]] = 1.0
            
            # Combine features
            features = np.concatenate([
                scores,
                tohopthi,
                interests,
                subject_groups
            ])
            
            X.append(features)
            
            # Target processing - major preferences and scores
            major_scores = np.zeros(len(self.major_to_id))
            
            # Process from new format (Major_1, Score_1, Major_2, Score_2, Major_3, Score_3)
            for i in range(1, 4):
                major_col = f'Major_{i}'
                score_col = f'Score_{i}'
                if major_col in row and score_col in row and not pd.isna(row[major_col]) and not pd.isna(row[score_col]):
                    major = row[major_col].lower().strip()
                    if major in self.major_to_id:
                        major_scores[self.major_to_id[major]] = float(row[score_col])
            
            y.append(major_scores)
        
        return np.array(X), np.array(y)
    
    def get_market_trend_weights(self):
        """
        Get market trend weights for each major
        
        Returns:
            Dictionary mapping major IDs to market trend weights
        """
        trend_weights = {}
        for _, row in self.majors_df.iterrows():
            major_id = self.major_to_id.get(row['major_name'])
            if major_id is not None:
                trend_weights[major_id] = float(row['market_trend'])
        
        return trend_weights
    
    def get_major_by_id(self, major_id):
        """Get major name by ID"""
        return self.id_to_major.get(major_id)
    
    def get_major_info(self, major_name):
        """Get major information"""
        major_info = self.majors_df[self.majors_df['major_name'] == major_name].iloc[0].to_dict() if major_name in self.majors_df['major_name'].values else {}
        return major_info 