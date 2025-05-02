import os
from dotenv import load_dotenv

# Load biến môi trường từ file .env (nếu có)
load_dotenv()

# Cấu hình MongoDB
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'tuyen_sinh_thong_minh')

# Cấu hình API
API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('API_PORT', 5000))
DEBUG_MODE = os.getenv('DEBUG_MODE', 'True').lower() == 'true'

# Đường dẫn đến thư mục lưu trữ mô hình
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ai_models')

# Định nghĩa các collection
COLLECTIONS = {
    'subjects': 'subjects',
    'subject_combinations': 'subject_combinations',
    'interests': 'interests',
    'universities': 'universities',
    'majors': 'majors',
    'admission_criteria': 'admission_criteria',
    'student_data': 'student_data',
    'model_configs': 'model_configs',
    'training_data': 'training_data'
} 