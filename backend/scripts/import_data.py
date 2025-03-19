import pandas as pd
from pymongo import MongoClient
import json
from datetime import datetime

# Kết nối đến MongoDB
client = MongoClient('mongodb+srv://myuser:mypassword@cluster0.xi1lv.mongodb.net/test?retryWrites=true&w=majority')
db = client['test']

def import_majors():
    # Đọc file CSV
    df = pd.read_csv('data/major_data.csv')
    
    # Xử lý dữ liệu
    majors = []
    for _, row in df.iterrows():
        major = {
            'name': row['major_name'],
            'category': row['category'],
            'interests': row['interests'].split(','),
            'primarySubjectGroups': row['primary_subject_groups'].split(';'),
            'secondarySubjectGroups': row['secondary_subject_groups'].split(';'),
            'subjectsWeight': dict([tuple(item.split(':')) for item in row['subjects_weight'].split(';')]),
            'marketTrend': float(row['market_trend']),
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }
        majors.append(major)
    
    # Xóa dữ liệu cũ và import dữ liệu mới
    db.majors.delete_many({})
    db.majors.insert_many(majors)
    print(f"Imported {len(majors)} majors successfully")

def import_subject_combinations():
    # Đọc file CSV
    df = pd.read_csv('data/subject_combinations.csv')
    
    # Xử lý dữ liệu
    combinations = []
    for _, row in df.iterrows():
        combination = {
            'code': row['combination_code'],
            'subjects': row['subjects'].split(';'),
            'description': row['description'],
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }
        combinations.append(combination)
    
    # Xóa dữ liệu cũ và import dữ liệu mới
    db.subject_combinations.delete_many({})
    db.subject_combinations.insert_many(combinations)
    print(f"Imported {len(combinations)} subject combinations successfully")

def import_interests():
    # Đọc file CSV
    df = pd.read_csv('data/interests.csv')
    
    # Xử lý dữ liệu
    interests = []
    for _, row in df.iterrows():
        interest = {
            'id': int(row['interest_id']),
            'name': row['interest_name'],
            'group': row['interest_group'],
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }
        interests.append(interest)
    
    # Xóa dữ liệu cũ và import dữ liệu mới
    db.interests.delete_many({})
    db.interests.insert_many(interests)
    print(f"Imported {len(interests)} interests successfully")

if __name__ == "__main__":
    try:
        print("Starting data import...")
        import_majors()
        import_subject_combinations()
        import_interests()
        print("Data import completed successfully!")
    except Exception as e:
        print(f"Error during import: {str(e)}")
    finally:
        client.close() 