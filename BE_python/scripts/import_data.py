#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script nhập dữ liệu từ CSV vào MongoDB
"""
import os
import sys
import pandas as pd
from datetime import datetime
import argparse

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_utils import db_client

def import_subjects(file_path):
    """Nhập dữ liệu môn học từ CSV"""
    try:
        # Đọc CSV
        df = pd.read_csv(file_path)
        print(f"Đọc được {len(df)} bản ghi từ {file_path}")
        
        # Chuyển DataFrame thành danh sách dict
        records = df.to_dict('records')
        
        # Thêm các trường metadata
        for record in records:
            record['createdAt'] = datetime.now()
            record['updatedAt'] = datetime.now()
        
        # Xóa dữ liệu cũ nếu có
        db_client.delete_many('subjects', {})
        
        # Thêm dữ liệu mới
        result = db_client.insert_many('subjects', records)
        print(f"Đã thêm {len(result.inserted_ids)} bản ghi vào collection subjects")
        
        return True
    except Exception as e:
        print(f"Lỗi khi nhập dữ liệu môn học: {e}")
        return False

def import_subject_combinations(file_path):
    """Nhập dữ liệu tổ hợp môn từ CSV"""
    try:
        # Đọc CSV
        df = pd.read_csv(file_path)
        print(f"Đọc được {len(df)} bản ghi từ {file_path}")
        
        # Chuyển DataFrame thành danh sách dict
        records = df.to_dict('records')
        
        # Chuyển đổi chuỗi subjects thành list
        for record in records:
            if 'subjects' in record and isinstance(record['subjects'], str):
                record['subjects'] = record['subjects'].split(',')
            
            # Thêm các trường metadata
            record['createdAt'] = datetime.now()
            record['updatedAt'] = datetime.now()
        
        # Xóa dữ liệu cũ nếu có
        db_client.delete_many('subject_combinations', {})
        
        # Thêm dữ liệu mới
        result = db_client.insert_many('subject_combinations', records)
        print(f"Đã thêm {len(result.inserted_ids)} bản ghi vào collection subject_combinations")
        
        return True
    except Exception as e:
        print(f"Lỗi khi nhập dữ liệu tổ hợp môn: {e}")
        return False

def import_interests(file_path):
    """Nhập dữ liệu sở thích từ CSV"""
    try:
        # Đọc CSV
        df = pd.read_csv(file_path)
        print(f"Đọc được {len(df)} bản ghi từ {file_path}")
        
        # Chuyển DataFrame thành danh sách dict
        records = df.to_dict('records')
        
        # Thêm các trường metadata
        for record in records:
            record['createdAt'] = datetime.now()
            record['updatedAt'] = datetime.now()
        
        # Xóa dữ liệu cũ nếu có
        db_client.delete_many('interests', {})
        
        # Thêm dữ liệu mới
        result = db_client.insert_many('interests', records)
        print(f"Đã thêm {len(result.inserted_ids)} bản ghi vào collection interests")
        
        return True
    except Exception as e:
        print(f"Lỗi khi nhập dữ liệu sở thích: {e}")
        return False

def import_universities(file_path):
    """Nhập dữ liệu trường đại học từ CSV"""
    try:
        # Đọc CSV
        df = pd.read_csv(file_path)
        print(f"Đọc được {len(df)} bản ghi từ {file_path}")
        
        # Chuyển DataFrame thành danh sách dict
        records = df.to_dict('records')
        
        # Xử lý cấu trúc dữ liệu
        for record in records:
            # Tạo cấu trúc location
            if 'city' in record and 'region' in record:
                record['location'] = {
                    'city': record.pop('city', ''),
                    'region': record.pop('region', '')
                }
            
            # Thêm các trường metadata
            record['createdAt'] = datetime.now()
            record['updatedAt'] = datetime.now()
        
        # Xóa dữ liệu cũ nếu có
        db_client.delete_many('universities', {})
        
        # Thêm dữ liệu mới
        result = db_client.insert_many('universities', records)
        print(f"Đã thêm {len(result.inserted_ids)} bản ghi vào collection universities")
        
        return True
    except Exception as e:
        print(f"Lỗi khi nhập dữ liệu trường đại học: {e}")
        return False

def import_majors(file_path, market_trend_file=None):
    """Nhập dữ liệu ngành học từ CSV"""
    try:
        # Đọc CSV ngành học
        df = pd.read_csv(file_path)
        print(f"Đọc được {len(df)} bản ghi từ {file_path}")
        
        # Đọc CSV xu hướng thị trường nếu có
        market_trends = {}
        if market_trend_file and os.path.exists(market_trend_file):
            market_df = pd.read_csv(market_trend_file)
            print(f"Đọc được {len(market_df)} bản ghi xu hướng thị trường từ {market_trend_file}")
            
            # Tạo mapping từ tên ngành đến xu hướng thị trường
            for _, row in market_df.iterrows():
                major_name = row['Ngành'].strip().lower()
                market_trends[major_name] = {
                    'market_trend': row.get('market_trend', 0.5),
                    'interests': row.get('interests', '').split(',') if isinstance(row.get('interests', ''), str) else []
                }
        
        # Chuyển DataFrame thành danh sách dict
        records = df.to_dict('records')
        
        # Xử lý cấu trúc dữ liệu
        for record in records:
            # Thêm nameNormalized để tìm kiếm không dấu
            if 'name' in record:
                record['nameNormalized'] = record['name'].lower()
            
            # Thêm thông tin xu hướng thị trường nếu có
            major_name = record.get('name', '').strip().lower()
            if major_name in market_trends:
                # Thêm xu hướng thị trường
                record['marketTrends'] = [
                    {
                        'year': datetime.now().year,
                        'score': market_trends[major_name]['market_trend']
                    }
                ]
                
                # Thêm sở thích liên quan
                interests_list = market_trends[major_name]['interests']
                record['interests'] = []
                
                # Tìm interest_id từ collection interests
                for interest_name in interests_list:
                    interest_name = interest_name.strip()
                    interest = db_client.get_collection('interests').find_one({'name': interest_name})
                    if interest:
                        record['interests'].append({
                            'interestId': interest['_id'],
                            'name': interest_name,
                            'weight': 1
                        })
            
            # Thêm các trường metadata
            record['metadata'] = {
                'createdAt': datetime.now(),
                'updatedAt': datetime.now()
            }
        
        # Xóa dữ liệu cũ nếu có
        db_client.delete_many('majors', {})
        
        # Thêm dữ liệu mới
        result = db_client.insert_many('majors', records)
        print(f"Đã thêm {len(result.inserted_ids)} bản ghi vào collection majors")
        
        return True
    except Exception as e:
        print(f"Lỗi khi nhập dữ liệu ngành học: {e}")
        return False

def import_admission_criteria(file_path):
    """Nhập dữ liệu tiêu chí tuyển sinh từ CSV"""
    try:
        # Đọc CSV
        df = pd.read_csv(file_path)
        print(f"Đọc được {len(df)} bản ghi từ {file_path}")
        
        # Chuyển đổi tên cột nếu cần
        if 'Trường đại học' in df.columns and 'universityName' not in df.columns:
            df.rename(columns={'Trường đại học': 'universityName'}, inplace=True)
        
        if 'Ngành' in df.columns and 'majorName' not in df.columns:
            df.rename(columns={'Ngành': 'majorName'}, inplace=True)
        
        if 'Tổ hợp' in df.columns and 'combination' not in df.columns:
            df.rename(columns={'Tổ hợp': 'combination'}, inplace=True)
        
        if 'Điểm chuẩn' in df.columns and 'minScore' not in df.columns:
            df.rename(columns={'Điểm chuẩn': 'minScore'}, inplace=True)
        
        if 'Năm' in df.columns and 'year' not in df.columns:
            df.rename(columns={'Năm': 'year'}, inplace=True)
        
        # Nhóm dữ liệu theo trường và ngành
        criteria_dict = {}
        
        for _, row in df.iterrows():
            university_name = row['universityName']
            major_name = row['majorName']
            
            # Tạo key cho dictionary
            key = f"{university_name}_{major_name}"
            
            # Tìm universityId và majorId
            university = db_client.get_collection('universities').find_one({'name': university_name})
            major = db_client.get_collection('majors').find_one({'name': major_name})
            
            universityId = university['_id'] if university else None
            majorId = major['_id'] if major else None
            
            # Thêm vào dictionary nếu chưa có
            if key not in criteria_dict:
                criteria_dict[key] = {
                    'universityId': universityId,
                    'universityCode': university.get('code', '') if university else '',
                    'universityName': university_name,
                    'majorId': majorId,
                    'majorName': major_name,
                    'quota': []
                }
            
            # Thêm dữ liệu quota cho năm
            year = int(row.get('year', datetime.now().year))
            min_score = float(row.get('minScore', 0))
            total = int(row.get('total', 0))
            combination = row.get('combination', '')
            
            # Tìm quota cho năm hiện tại
            year_quota = next((q for q in criteria_dict[key]['quota'] if q.get('year') == year), None)
            
            if year_quota:
                # Cập nhật quota nếu đã có
                if combination:
                    year_quota['combinations'] = year_quota.get('combinations', []) + [combination]
                if min_score:
                    year_quota['minScore'] = min_score
            else:
                # Thêm quota mới
                quota_entry = {
                    'year': year,
                    'type': 'THPT',
                    'total': total
                }
                
                if combination:
                    quota_entry['combinations'] = [combination]
                
                if min_score:
                    quota_entry['minScore'] = min_score
                
                criteria_dict[key]['quota'].append(quota_entry)
            
            # Thêm các trường metadata
            criteria_dict[key]['metadata'] = {
                'source': 'Bộ GD&ĐT',
                'verifiedAt': datetime.now(),
                'createdAt': datetime.now(),
                'updatedAt': datetime.now()
            }
        
        # Chuyển dictionary thành list để import
        records = list(criteria_dict.values())
        
        # Xóa dữ liệu cũ nếu có
        db_client.delete_many('admission_criteria', {})
        
        # Thêm dữ liệu mới
        result = db_client.insert_many('admission_criteria', records)
        print(f"Đã thêm {len(result.inserted_ids)} bản ghi vào collection admission_criteria")
        
        return True
    except Exception as e:
        print(f"Lỗi khi nhập dữ liệu tiêu chí tuyển sinh: {e}")
        return False

def import_training_data(file_path, model_type):
    """Nhập dữ liệu huấn luyện từ CSV"""
    try:
        # Đọc CSV
        df = pd.read_csv(file_path)
        print(f"Đọc được {len(df)} bản ghi từ {file_path}")
        
        # Chuyển DataFrame thành danh sách dict
        records = df.to_dict('records')
        
        # Tạo document để import
        document = {
            'modelType': model_type,
            'dataSource': 'synthetic',
            'dataVersion': '1.0',
            'records': records,
            'metadata': {
                'totalRecords': len(records),
                'createdAt': datetime.now(),
                'updatedAt': datetime.now()
            }
        }
        
        # Xóa dữ liệu cũ nếu có
        db_client.delete_many('training_data', {'modelType': model_type})
        
        # Thêm dữ liệu mới
        result = db_client.insert_one('training_data', document)
        print(f"Đã thêm dữ liệu huấn luyện cho mô hình {model_type}")
        
        return True
    except Exception as e:
        print(f"Lỗi khi nhập dữ liệu huấn luyện: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Nhập dữ liệu từ CSV vào MongoDB')
    parser.add_argument('--all', action='store_true', help='Nhập tất cả dữ liệu')
    parser.add_argument('--subjects', help='Đường dẫn đến file CSV môn học')
    parser.add_argument('--combinations', help='Đường dẫn đến file CSV tổ hợp môn')
    parser.add_argument('--interests', help='Đường dẫn đến file CSV sở thích')
    parser.add_argument('--universities', help='Đường dẫn đến file CSV trường đại học')
    parser.add_argument('--majors', help='Đường dẫn đến file CSV ngành học')
    parser.add_argument('--market-trends', help='Đường dẫn đến file CSV xu hướng thị trường')
    parser.add_argument('--criteria', help='Đường dẫn đến file CSV tiêu chí tuyển sinh')
    parser.add_argument('--training-major', help='Đường dẫn đến file CSV dữ liệu huấn luyện mô hình gợi ý ngành')
    parser.add_argument('--training-admission', help='Đường dẫn đến file CSV dữ liệu huấn luyện mô hình dự đoán xác suất')
    
    args = parser.parse_args()
    
    # Nếu --all được chỉ định, nhập tất cả dữ liệu từ thư mục data
    if args.all:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        
        # Nhập dữ liệu môn học
        subjects_file = os.path.join(data_dir, 'subjects.csv')
        if os.path.exists(subjects_file):
            import_subjects(subjects_file)
        
        # Nhập dữ liệu tổ hợp môn
        combinations_file = os.path.join(data_dir, 'subject_combinations.csv')
        if os.path.exists(combinations_file):
            import_subject_combinations(combinations_file)
        
        # Nhập dữ liệu sở thích
        interests_file = os.path.join(data_dir, 'interests.csv')
        if os.path.exists(interests_file):
            import_interests(interests_file)
        
        # Nhập dữ liệu trường đại học
        universities_file = os.path.join(data_dir, 'universities.csv')
        if os.path.exists(universities_file):
            import_universities(universities_file)
        
        # Nhập dữ liệu ngành học
        majors_file = os.path.join(data_dir, 'majors.csv')
        market_trends_file = os.path.join(data_dir, 'market_trend.csv')
        if os.path.exists(majors_file):
            import_majors(majors_file, market_trends_file)
        
        # Nhập dữ liệu tiêu chí tuyển sinh
        criteria_file = os.path.join(data_dir, 'admission_criteria.csv')
        if os.path.exists(criteria_file):
            import_admission_criteria(criteria_file)
        
        # Nhập dữ liệu huấn luyện mô hình gợi ý ngành
        training_major_file = os.path.join(data_dir, 'training_major.csv')
        if os.path.exists(training_major_file):
            import_training_data(training_major_file, 'major_recommendation')
        
        # Nhập dữ liệu huấn luyện mô hình dự đoán xác suất
        training_admission_file = os.path.join(data_dir, 'training_admission.csv')
        if os.path.exists(training_admission_file):
            import_training_data(training_admission_file, 'admission_probability')
    else:
        # Nhập từng loại dữ liệu theo tham số đầu vào
        if args.subjects:
            import_subjects(args.subjects)
        
        if args.combinations:
            import_subject_combinations(args.combinations)
        
        if args.interests:
            import_interests(args.interests)
        
        if args.universities:
            import_universities(args.universities)
        
        if args.majors:
            import_majors(args.majors, args.market_trends)
        
        if args.criteria:
            import_admission_criteria(args.criteria)
        
        if args.training_major:
            import_training_data(args.training_major, 'major_recommendation')
        
        if args.training_admission:
            import_training_data(args.training_admission, 'admission_probability')

if __name__ == '__main__':
    main() 