import numpy as np
import pandas as pd
import random
from sklearn.neural_network import MLPRegressor
from scipy.stats import beta, norm

def generate_synthetic_data(num_samples=100, method='bayesian', interests_df=None, majors_df=None, subject_combinations_df=None):
    """
    Tạo dữ liệu học sinh giả định và các ngành phù hợp.
    
    Parameters:
        num_samples (int): Số lượng học sinh giả định cần tạo
        method (str): Phương pháp tạo dữ liệu ('bayesian' hoặc 'neural')
        interests_df (pd.DataFrame): DataFrame chứa thông tin về sở thích
        majors_df (pd.DataFrame): DataFrame chứa thông tin về ngành học
        subject_combinations_df (pd.DataFrame): DataFrame chứa thông tin về tổ hợp môn
        
    Returns:
        pd.DataFrame: DataFrame chứa dữ liệu giả định
    """
    if method == 'bayesian':
        return generate_data_bayesian(num_samples, interests_df, majors_df, subject_combinations_df)
    else:
        return generate_data_neural(num_samples, interests_df, majors_df, subject_combinations_df)
    
def generate_data_bayesian(num_samples, interests_df, majors_df, subject_combinations_df):
    """
    Tạo dữ liệu giả định sử dụng phương pháp Bayesian
    """
    # Khởi tạo DataFrame kết quả
    columns = ['Student_ID', 'Major1', 'Major2', 'Major3', 'Subject_groups', 
               'Priority_Area', 'Priority_Subject', 'Interests',
               'TOA', 'VAN', 'ANH', 'LY', 'HOA', 'SU', 'DIA', 'SINH', 'GDCD', 'TIN', 'CN']
    synthetic_data = pd.DataFrame(columns=columns)
    
    # Các thông tin cần thiết
    interest_names = interests_df['interest_name'].tolist()
    subject_groups = subject_combinations_df['combination_code'].tolist()
    major_names = majors_df['major_name'].tolist()
    
    # Lấy thông tin về tổ hợp môn
    subject_map = {}
    for _, row in subject_combinations_df.iterrows():
        subjects = row['subjects'].split(';')
        subject_map[row['combination_code']] = subjects
    
    # Khởi tạo prior distributions cho các môn học
    toa_dist = beta(7, 3)  # Phân phối beta cho điểm Toán (thiên về điểm cao)
    van_dist = beta(6, 4)  # Phân phối beta cho điểm Văn
    other_dist = beta(5, 5)  # Phân phối beta cho các môn còn lại
    
    for i in range(num_samples):
        student = {}
        student['Student_ID'] = f'ST{i+1:04d}'
        
        # Sinh điểm Toán và Văn (bắt buộc)
        student['TOA'] = round(toa_dist.rvs() * 10, 1)
        student['VAN'] = round(van_dist.rvs() * 10, 1)
        
        # Chọn ngẫu nhiên 2 môn khác với điểm khác 0
        optional_subjects = ['ANH', 'LY', 'HOA', 'SU', 'DIA', 'SINH', 'GDCD', 'TIN', 'CN']
        chosen_subjects = random.sample(optional_subjects, 2)
        
        # Khởi tạo điểm 0 cho tất cả các môn không bắt buộc
        for subject in optional_subjects:
            student[subject] = 0.0
            
        # Cập nhật điểm cho 2 môn được chọn
        for subject in chosen_subjects:
            student[subject] = round(other_dist.rvs() * 10, 1)
        
        # Xác định khu vực ưu tiên và đối tượng ưu tiên
        if random.random() < 0.8:  # 80% học sinh thuộc KV2 và đối tượng 05
            student['Priority_Area'] = 'KV2'
            student['Priority_Subject'] = '05'
        else:
            student['Priority_Area'] = random.choice(['KV1', 'KV2', 'KV3'])
            student['Priority_Subject'] = random.choice(['01', '02', '03', '04', '05', '06', '07'])
        
        # Chọn ngẫu nhiên 1-3 sở thích
        num_interests = random.randint(1, 3)
        student['Interests'] = ','.join(random.sample(interest_names, num_interests))
        
        # Chọn ngẫu nhiên 1-2 tổ hợp thi
        num_subject_groups = random.randint(1, 2)
        student['Subject_groups'] = ','.join(random.sample(subject_groups, num_subject_groups))
        
        # Tính điểm cho mỗi ngành và chọn 3 ngành phù hợp nhất
        major_scores = calculate_major_scores(student, majors_df, subject_combinations_df)
        top_3_majors = sorted(major_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        
        student['Major1'] = top_3_majors[0][0] if len(top_3_majors) > 0 else ''
        student['Major2'] = top_3_majors[1][0] if len(top_3_majors) > 1 else ''
        student['Major3'] = top_3_majors[2][0] if len(top_3_majors) > 2 else ''
        
        # Thêm vào DataFrame kết quả
        synthetic_data = pd.concat([synthetic_data, pd.DataFrame([student])], ignore_index=True)
    
    return synthetic_data

def generate_data_neural(num_samples, interests_df, majors_df, subject_combinations_df):
    """
    Tạo dữ liệu giả định sử dụng Neural Network
    """
    # Khởi tạo mô hình neural network để tạo dữ liệu có tương quan
    mlp = MLPRegressor(hidden_layer_sizes=(20, 10), random_state=42)
    
    # Khởi tạo DataFrame kết quả
    columns = ['Student_ID', 'Major1', 'Major2', 'Major3', 'Subject_groups', 
               'Priority_Area', 'Priority_Subject', 'Interests',
               'TOA', 'VAN', 'ANH', 'LY', 'HOA', 'SU', 'DIA', 'SINH', 'GDCD', 'TIN', 'CN']
    synthetic_data = pd.DataFrame(columns=columns)
    
    # Các thông tin cần thiết
    interest_names = interests_df['interest_name'].tolist()
    subject_groups = subject_combinations_df['combination_code'].tolist()
    
    # Tạo dữ liệu ngẫu nhiên ban đầu cho mô hình neural
    X = np.random.normal(size=(num_samples, 5))  # 5 feature ngẫu nhiên làm input
    
    # Huấn luyện mô hình để tạo ra điểm có tương quan
    y_toa = 7 + 0.5 * X[:, 0] + 0.3 * X[:, 1] + np.random.normal(0, 0.5, num_samples)
    y_van = 6 + 0.4 * X[:, 1] + 0.3 * X[:, 2] + np.random.normal(0, 0.6, num_samples)
    
    # Chuẩn hóa điểm về thang 0-10
    y_toa = np.clip(y_toa, 0, 10)
    y_van = np.clip(y_van, 0, 10)
    
    # Huấn luyện mô hình
    mlp.fit(X, np.column_stack((y_toa, y_van)))
    
    for i in range(num_samples):
        student = {}
        student['Student_ID'] = f'ST{i+1:04d}'
        
        # Tạo vector đặc trưng để sinh điểm
        features = np.random.normal(size=(1, 5))
        
        # Dự đoán điểm Toán và Văn có tương quan
        predictions = mlp.predict(features)[0]
        student['TOA'] = round(np.clip(predictions[0], 0, 10), 1)
        student['VAN'] = round(np.clip(predictions[1], 0, 10), 1)
        
        # Chọn ngẫu nhiên 2 môn khác với điểm khác 0
        optional_subjects = ['ANH', 'LY', 'HOA', 'SU', 'DIA', 'SINH', 'GDCD', 'TIN', 'CN']
        
        # Sinh các môn khác dựa trên tương quan với Toán và Văn
        for subject in optional_subjects:
            student[subject] = 0.0  # Mặc định là 0
        
        # Chọn 2 môn dựa trên sở thích (tương quan với điểm Toán/Văn)
        if student['TOA'] > student['VAN']:
            # Nếu giỏi Toán, có xu hướng chọn Lý, Hóa, Anh, Tin
            options = ['LY', 'HOA', 'ANH', 'TIN']
            weights = [0.4, 0.3, 0.2, 0.1]
        else:
            # Nếu giỏi Văn, có xu hướng chọn Anh, Sử, Địa, GDCD
            options = ['ANH', 'SU', 'DIA', 'GDCD']
            weights = [0.4, 0.3, 0.2, 0.1]
        
        # Chọn 2 môn dựa trên xác suất
        chosen_subjects = np.random.choice(options, size=2, replace=False, p=weights)
        
        # Điểm các môn được chọn có tương quan với điểm Toán/Văn
        for subject in chosen_subjects:
            if subject in ['LY', 'HOA', 'TIN', 'CN']:
                # Có tương quan với Toán
                base = student['TOA']
                variation = np.random.normal(0, 1)
            else:
                # Có tương quan với Văn
                base = student['VAN']
                variation = np.random.normal(0, 1)
                
            student[subject] = round(np.clip(base + variation, 0, 10), 1)
        
        # Xác định khu vực ưu tiên và đối tượng ưu tiên
        if random.random() < 0.8:  # 80% học sinh thuộc KV2 và đối tượng 05
            student['Priority_Area'] = 'KV2'
            student['Priority_Subject'] = '05'
        else:
            student['Priority_Area'] = random.choice(['KV1', 'KV2', 'KV3'])
            student['Priority_Subject'] = random.choice(['01', '02', '03', '04', '05', '06', '07'])
        
        # Chọn ngẫu nhiên 1-3 sở thích (có tương quan với điểm)
        tech_interests = ['Lập trình', 'Máy tính', 'Công nghệ', 'Trò chơi điện tử', 'Phân tích dữ liệu']
        art_interests = ['Nghệ thuật', 'Sáng tạo', 'Thiết kế', 'Văn học', 'Đọc sách']
        
        if student['TOA'] > 8:
            # Học sinh giỏi Toán có xu hướng thích công nghệ
            potential_interests = tech_interests + random.sample(interest_names, 5)
        elif student['VAN'] > 8:
            # Học sinh giỏi Văn có xu hướng thích nghệ thuật
            potential_interests = art_interests + random.sample(interest_names, 5)
        else:
            potential_interests = interest_names
            
        num_interests = random.randint(1, 3)
        student['Interests'] = ','.join(random.sample(potential_interests, num_interests))
        
        # Chọn ngẫu nhiên 1-2 tổ hợp thi (dựa trên điểm và môn học)
        science_groups = ['A00', 'A01', 'B00', 'D07']  # Tổ hợp khoa học tự nhiên
        social_groups = ['C00', 'D01', 'D14', 'D15']  # Tổ hợp khoa học xã hội
        
        if student['TOA'] > 7 and (student['LY'] > 7 or student['HOA'] > 7):
            potential_groups = science_groups
        elif student['VAN'] > 7 and (student['SU'] > 7 or student['DIA'] > 7):
            potential_groups = social_groups
        else:
            potential_groups = subject_groups
            
        num_subject_groups = random.randint(1, 2)
        student['Subject_groups'] = ','.join(random.sample(potential_groups, num_subject_groups))
        
        # Tính điểm cho mỗi ngành và chọn 3 ngành phù hợp nhất
        major_scores = calculate_major_scores(student, majors_df, subject_combinations_df)
        top_3_majors = sorted(major_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        
        student['Major1'] = top_3_majors[0][0] if len(top_3_majors) > 0 else ''
        student['Major2'] = top_3_majors[1][0] if len(top_3_majors) > 1 else ''
        student['Major3'] = top_3_majors[2][0] if len(top_3_majors) > 2 else ''
        
        # Thêm vào DataFrame kết quả
        synthetic_data = pd.concat([synthetic_data, pd.DataFrame([student])], ignore_index=True)
    
    return synthetic_data

def calculate_major_scores(student, majors_df, subject_combinations_df):
    """
    Tính điểm tổng hợp Sij cho mỗi ngành học với một học sinh cụ thể
    """
    # Trọng số các thành phần
    w1, w2, w3, w4 = 0.6, 0.2, 0.18, 0.02
    
    # Thông tin học sinh
    student_interests = student['Interests'].split(',')
    student_subjects = {
        'TOA': student['TOA'], 
        'VAN': student['VAN'],
        'ANH': student['ANH'],
        'LY': student['LY'],
        'HOA': student['HOA'],
        'SU': student['SU'],
        'DIA': student['DIA'],
        'SINH': student['SINH'],
        'GDCD': student['GDCD'],
        'TIN': student['TIN'],
        'CN': student['CN']
    }
    
    # Tính điểm ưu tiên
    priority_area = student['Priority_Area']
    priority_subject = student['Priority_Subject']
    
    area_scores = {'KV1': 0.75, 'KV2': 0.5, 'KV3': 0.0}
    subject_scores = {
        '01': 2.0, '02': 1.5, '03': 1.0, 
        '04': 0.5, '05': 0.0, '06': 1.0, '07': 0.5
    }
    
    area_score = area_scores.get(priority_area, 0.0)
    subject_score = subject_scores.get(priority_subject, 0.0)
    priority_score = (area_score + subject_score) / 3  # Chuẩn hóa về 0-1
    
    # Tính điểm Sij cho mỗi ngành
    major_scores = {}
    
    for _, major in majors_df.iterrows():
        # 1. Tính điểm tổ hợp chuẩn hóa
        primary_groups = major['primary_subject_groups'].split(';')
        best_group_score = 0
        
        for group_code in primary_groups:
            # Tìm thông tin về tổ hợp môn
            group_info = subject_combinations_df[subject_combinations_df['combination_code'] == group_code]
            if len(group_info) == 0:
                continue
                
            subjects_in_group = group_info.iloc[0]['subjects'].split(';')
            
            # Tính toán trọng số môn học từ thông tin ngành
            subject_weights = {}
            for weight_info in major['subjects_weight'].split(';'):
                parts = weight_info.split(':')
                subject_name = parts[0]
                weight = float(parts[1])
                subject_weights[subject_name] = weight
            
            # Tính điểm tổ hợp
            total_score = 0
            total_weight = 0
            
            for subject_code in subjects_in_group:
                # Map mã môn sang tên môn trong student_subjects
                subject_mapping = {
                    'TOA': 'TOA', 'VAN': 'VAN', 'ANH': 'ANH', 'LY': 'LY', 
                    'HOA': 'HOA', 'SU': 'SU', 'DIA': 'DIA', 'SINH': 'SINH',
                    'GDCD': 'GDCD', 'TIN': 'TIN', 'CN': 'CN'
                }
                
                subject_name = subject_mapping.get(subject_code, subject_code)
                subject_score = student_subjects.get(subject_name, 0)
                subject_weight = subject_weights.get(subject_name, 1.0)
                
                total_score += subject_score * subject_weight
                total_weight += subject_weight
            
            group_score = total_score / total_weight / 10 if total_weight > 0 else 0
            best_group_score = max(best_group_score, group_score)
        
        # 2. Tính khớp sở thích
        major_interests = major['interests'].split(',')
        matching_interests = set(student_interests) & set(major_interests)
        
        if len(matching_interests) == 0:
            interest_match = 0.0
        elif len(matching_interests) == 1:
            interest_match = 0.5
        elif len(matching_interests) == 2:
            interest_match = 0.75
        else:
            interest_match = 1.0
        
        # 3. Lấy xu hướng thị trường
        market_trend = float(major['market_trend'])
        
        # 4. Tính điểm tổng hợp Sij
        major_score = w1 * best_group_score + w2 * interest_match + w3 * market_trend + w4 * priority_score
        major_scores[major['major_name']] = major_score
    
    return major_scores 