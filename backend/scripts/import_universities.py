import pandas as pd
from pymongo import MongoClient
import os
from datetime import datetime

# Kết nối MongoDB Atlas
client = MongoClient('mongodb+srv://myuser:mypassword@cluster0.xi1lv.mongodb.net/test?retryWrites=true&w=majority')
db = client['test']
university_collection = db['universities']

def import_sample_data():
    sample_universities = [
        {
            'code': 'QHL',
            'name': 'Khoa Luật (ĐHQG Hà Nội)',
            'type': 'Đại học',
            'admissionMethods': ['Xét điểm thi THPT'],
            'benchmarks': [
                {
                    'year': 2024,
                    'majorCode': '7380101',
                    'majorName': 'Luật',
                    'method': 'Xét điểm thi THPT',
                    'subjectGroup': 'D01',
                    'score': 25.4,
                    'note': ''
                }
            ]
        },
        {
            'code': 'BKA',
            'name': 'Đại học Bách Khoa Hà Nội',
            'type': 'Đại học',
            'admissionMethods': ['Xét điểm thi THPT'],
            'benchmarks': []
        },
        {
            'code': 'QHE',
            'name': 'Đại học Kinh tế (ĐHQG Hà Nội)',
            'type': 'Đại học',
            'admissionMethods': ['Xét điểm thi THPT'],
            'benchmarks': []
        }
    ]
    
    try:
        # Xóa dữ liệu cũ
        university_collection.delete_many({})
        
        # Import dữ liệu mẫu
        university_collection.insert_many(sample_universities)
        print(f"Đã import thành công {len(sample_universities)} trường mẫu")
        
        # Tạo indexes
        university_collection.create_index('code', unique=True)
        university_collection.create_index('name')
        university_collection.create_index([('benchmarks.majorCode', 1)])
        university_collection.create_index([('benchmarks.year', 1)])
        
    except Exception as e:
        print(f"Lỗi khi import dữ liệu mẫu: {str(e)}")

def import_universities():
    csv_path = 'data/universities.csv'
    
    # Nếu không có file CSV, import dữ liệu mẫu
    if not os.path.exists(csv_path):
        print("Không tìm thấy file CSV, importing dữ liệu mẫu...")
        return import_sample_data()
    
    # Đọc file CSV
    df = pd.read_csv(csv_path)
    
    # Nhóm dữ liệu theo trường
    schools = df.groupby(['SchoolName', 'SchoolID'])
    
    universities = []
    
    for (school_name, school_id), group in schools:
        # Tạo document cho mỗi trường
        university = {
            'code': school_id,
            'name': school_name,
            'type': 'Đại học',  # Mặc định là Đại học
            'admissionMethods': ['Xét điểm thi THPT'],  # Có thể cập nhật sau
            'benchmarks': []
        }
        
        # Thêm điểm chuẩn cho từng ngành
        for _, row in group.iterrows():
            benchmark = {
                'year': 2024,  # Năm mặc định là 2024
                'majorCode': row['MajorID'],
                'majorName': row['Major'],
                'method': row['Type'],
                'subjectGroup': row['SubjectGroup'],
                'score': float(row['Benchmark_2024']) if pd.notna(row['Benchmark_2024']) else None,
                'note': row['Note'] if pd.notna(row['Note']) else ''
            }
            university['benchmarks'].append(benchmark)
        
        universities.append(university)
    
    try:
        # Xóa dữ liệu cũ (nếu có)
        university_collection.delete_many({})
        
        # Import dữ liệu mới
        if universities:
            university_collection.insert_many(universities)
            print(f"Đã import thành công {len(universities)} trường")
        
        # Tạo indexes
        university_collection.create_index('code', unique=True)
        university_collection.create_index('name')
        university_collection.create_index([('benchmarks.majorCode', 1)])
        university_collection.create_index([('benchmarks.year', 1)])
        
    except Exception as e:
        print(f"Lỗi khi import dữ liệu: {str(e)}")

if __name__ == "__main__":
    import_universities() 