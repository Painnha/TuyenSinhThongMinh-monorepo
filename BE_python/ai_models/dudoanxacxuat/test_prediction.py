#!/usr/bin/env python
"""
Script để test mô hình dự đoán xác suất đậu đại học

Sử dụng:
    python test_prediction.py --input input_sample.json
    hoặc
    python test_prediction.py --inline '{"university_code": "BKA", "major_name": "cong nghe thong tin", "combination": "A00", "student_score": 25.5}'

Output:
    Kết quả dự đoán dưới dạng JSON
"""

import os
import sys
import json
import argparse
from datetime import datetime
import tensorflow as tf
import numpy as np
import re
from unidecode import unidecode
from dotenv import load_dotenv

# Tải biến môi trường
load_dotenv()

# Thêm đường dẫn gốc vào sys.path để có thể import
current_dir = os.path.dirname(os.path.abspath(__file__))
be_python_dir = os.path.abspath(os.path.join(current_dir, "../../"))
project_root = os.path.abspath(os.path.join(current_dir, "../../../"))
sys.path.insert(0, be_python_dir)
sys.path.insert(0, project_root)

# Import sau khi thêm đường dẫn gốc
from BE_python.config.config import MONGO_URI, MONGO_DB_NAME, COLLECTIONS
from BE_python.utils.db_utils import MongoDBClient

# In đường dẫn để debug
print(f"Current directory: {current_dir}")
print(f"BE_python directory: {be_python_dir}")
print(f"Project root: {project_root}")
print(f"sys.path: {sys.path}")

# Đường dẫn đến thư mục models
MODEL_DIR = os.path.join(current_dir, 'models')

# Tạo thư mục models nếu chưa tồn tại
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)
    print(f"Đã tạo thư mục models: {MODEL_DIR}")

# Định nghĩa bổ sung cho collection không có trong config
BENCHMARK_COLLECTION = 'benchmark_scores'

try:
    # Sử dụng MongoDBClient thay vì tạo kết nối trực tiếp
    db_client = MongoDBClient()
    db = db_client.db
    
    # Kiểm tra kết nối MongoDB
    db_info = db_client.client.server_info()
    print(f"Đã kết nối thành công đến MongoDB. Phiên bản: {db_info.get('version')}")
    print(f"Database: {MONGO_DB_NAME}")
    
    # Liệt kê các collection
    collections = db.list_collection_names()
    print(f"Tên tất cả các collection: {', '.join(collections)}")
    
    # Kiểm tra dữ liệu trong một số collection
    # Sử dụng tên collection từ config
    uni_collection = db_client.get_collection('universities')
    uni_count = uni_collection.count_documents({})
    print(f"Số lượng trường đại học: {uni_count}")
    
    major_collection = db_client.get_collection('majors')
    major_count = major_collection.count_documents({})
    print(f"Số lượng ngành học: {major_count}")
    
    # Kiểm tra collection benchmark_scores
    # Lưu ý: Collection này bây giờ đã được định nghĩa trong config.py
    try:
        benchmark_collection = db_client.get_collection('benchmark_scores')
        benchmark_count = benchmark_collection.count_documents({})
        print(f"Số lượng điểm chuẩn: {benchmark_count}")
        benchmark_collection_name = 'benchmark_scores'
    except ValueError:
        # Nếu collection không được định nghĩa trong config
        benchmark_collection_name = BENCHMARK_COLLECTION
        print(f"Collection benchmark_scores không được định nghĩa trong config.py")
        if benchmark_collection_name in collections:
            benchmark_count = db[benchmark_collection_name].count_documents({})
            print(f"Nhưng tìm thấy collection {benchmark_collection_name} trong database")
            print(f"Số lượng điểm chuẩn: {benchmark_count}")
        else:
            print(f"Không tìm thấy collection {benchmark_collection_name}")
            print(f"Các collection hiện có: {collections}")
            
            # Cập nhật COLLECTIONS nếu cần thiết
            print("Kiểm tra xem có collection nào phù hợp không...")
            for collection in collections:
                if 'benchmark' in collection.lower() or 'diem' in collection.lower() or 'score' in collection.lower():
                    benchmark_collection_name = collection
                    print(f"Tìm thấy collection phù hợp: {benchmark_collection_name}")
                    break
    
    # Kiểm tra YDS có tồn tại không sử dụng get_collection
    uni_collection = db_client.get_collection('universities')
    yds = uni_collection.find_one({'code': 'YDS'})
    if yds:
        print(f"Tìm thấy trường YDS: {yds.get('name')}")
    else:
        # Tìm kiếm không phân biệt chữ hoa/thường
        yds = uni_collection.find_one({'code': {'$regex': '^YDS$', '$options': 'i'}})
        if yds:
            print(f"Tìm thấy trường YDS (không phân biệt chữ hoa/thường): {yds.get('name')}")
        else:
            # Tìm với các tên field khác
            alt_fields = ['maTruong', 'university_code', 'ma']
            for field in alt_fields:
                yds = uni_collection.find_one({field: 'YDS'})
                if yds:
                    print(f"Tìm thấy trường YDS với field '{field}': {yds.get('name')}")
                    break
            
            if not yds:
                print("Không tìm thấy trường YDS")
    
    # Kiểm tra ngành y khoa có tồn tại không
    major_collection = db_client.get_collection('majors')
    y_khoa = major_collection.find_one({'nameNormalized': 'y khoa'})
    if y_khoa:
        print(f"Tìm thấy ngành Y Khoa: {y_khoa.get('name')}")
    else:
        print("Không tìm thấy ngành Y Khoa theo nameNormalized='y khoa'")
        
    # Tìm kiếm tương đối
    y_khoa_regex = list(major_collection.find({'name': {'$regex': 'y khoa', '$options': 'i'}}))
    if y_khoa_regex:
        print(f"Tìm thấy {len(y_khoa_regex)} ngành có tên chứa 'y khoa'")
        for major in y_khoa_regex:
            print(f"  - {major.get('name')} (nameNormalized: {major.get('nameNormalized')})")
    else:
        print("Không tìm thấy ngành nào có tên chứa 'y khoa'")
    
    # Kiểm tra điểm chuẩn YDS y khoa
    if benchmark_collection_name in collections:
        print(f"Tìm thấy collection điểm chuẩn: {benchmark_collection_name}")
        
        # Thử truy vấn theo cấu trúc thực tế từ dữ liệu mẫu
        try:
            query = {
                'Mã trường': 'YDS',
                'Ngành': {'$regex': 'y khoa', '$options': 'i'}
            }
            benchmark_yds = list(db[benchmark_collection_name].find(query))
            if benchmark_yds:
                print(f"Tìm thấy {len(benchmark_yds)} điểm chuẩn của YDS ngành y khoa")
                for score in benchmark_yds[:3]:  # Hiển thị tối đa 3 điểm
                    print(f"  - Năm {score.get('Năm')}: {score.get('Điểm chuẩn')} ({score.get('Tổ hợp')})")
            else:
                print(f"Không tìm thấy điểm chuẩn với query: {query}")
                # Thử query khác
                query2 = {'$or': [
                    {'Mã trường': 'YDS'},
                    {'ma_truong': 'YDS'},
                    {'university_code': 'YDS'}
                ]}
                all_scores = list(db[benchmark_collection_name].find(query2))
                if all_scores:
                    print(f"Tìm thấy {len(all_scores)} điểm chuẩn của YDS với query rộng hơn")
                    print(f"Mẫu: {all_scores[0]}")
        except Exception as e:
            print(f"Lỗi khi truy vấn dữ liệu benchmark: {e}")
    else:
        print(f"CẢNH BÁO: Không tìm thấy collection {benchmark_collection_name}")
        # Tìm collection phù hợp
        for collection in collections:
            if 'benchmark' in collection.lower() or 'diem' in collection.lower():
                benchmark_collection_name = collection
                print(f"Sử dụng collection thay thế: {benchmark_collection_name}")
                break
except Exception as e:
    print(f"Lỗi khi kiểm tra collection: {e}")
    db = None

# Import hàm dự đoán từ module predict_admission
try:
    from predict_admission import predict_from_mongodb
except ImportError:
    print("Không thể import predict_from_mongodb từ predict_admission")

def normalize_text(text):
    """
    Chuẩn hóa văn bản: bỏ dấu, chuyển thành chữ thường, bỏ các ký tự đặc biệt
    """
    if not text:
        return ""
    
    # Chuyển về chữ thường
    text = text.lower().strip()
    
    # Loại bỏ dấu
    if 'unidecode' in globals():  # Kiểm tra có thư viện unidecode không
        try:
            text = unidecode(text)
        except:
            # Nếu unidecode lỗi, thử xử lý thủ công
            vietnamese_chars = 'àáâãäåạảấầẩẫậắằẳẵặăđèéêëẹẻẽềếểễệìíîïịỉĩòóôõöøọỏốồổỗộớờởỡợùúûüụủũưứừửữựỳýỷỹỵ'
            latin_chars      = 'aaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiiiooooooooooooooooouuuuuuuuuuuuyyyy'
            for i in range(len(vietnamese_chars)):
                text = text.replace(vietnamese_chars[i], latin_chars[i//6])
    
    # Thay thế các ký tự đặc biệt và khoảng trắng liên tiếp bằng 1 khoảng trắng
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    
    # Loại bỏ khoảng trắng ở đầu và cuối chuỗi
    text = text.strip()
    
    return text

def find_similar_major(major_name):
    """
    Tìm ngành học tương tự trong database
    """
    normalized_input = normalize_text(major_name).lower()
    print(f"Tìm ngành học với tên đã chuẩn hóa: '{normalized_input}'")
    
    if db is None:
        return None
    
    # Thử tìm chính xác trước
    major = db.majors.find_one({'nameNormalized': normalized_input})
    if major:
        print(f"Tìm thấy ngành chính xác: {major.get('name')}")
        return major
    
    # Thử tìm theo regex
    majors_regex = list(db.majors.find({
        '$or': [
            {'nameNormalized': {'$regex': normalized_input, '$options': 'i'}},
            {'name': {'$regex': major_name, '$options': 'i'}}
        ]
    }))
    
    if majors_regex:
        print(f"Tìm thấy {len(majors_regex)} ngành theo regex:")
        best_match = None
        max_similarity = 0
        
        for major in majors_regex:
            major_name_norm = normalize_text(major.get('name', '')).lower()
            # Tính điểm tương đồng đơn giản: % các từ trùng nhau
            input_words = set(normalized_input.split())
            major_words = set(major_name_norm.split())
            
            # Số từ trùng / tổng số từ
            common_words = input_words.intersection(major_words)
            similarity = len(common_words) / max(len(input_words), len(major_words))
            
            print(f"  - {major.get('name')} (nameNormalized: {major.get('nameNormalized')}) - Độ tương đồng: {similarity:.2f}")
            
            if similarity > max_similarity:
                max_similarity = similarity
                best_match = major
        
        if max_similarity >= 0.3:  # Ngưỡng tương đồng tối thiểu là 30%
            print(f"Chọn ngành tương tự nhất: {best_match.get('name')} (độ tương đồng: {max_similarity:.2f})")
            return best_match
    
    # Nếu không tìm thấy, thử một cách khác: so sánh từng ngành
    try:
        all_majors = list(db.majors.find())
        print(f"Tìm trong {len(all_majors)} ngành...")
        
        best_match = None
        max_similarity = 0
        
        for major in all_majors:
            major_name_norm = normalize_text(major.get('name', '')).lower()
            # Tính điểm tương đồng đơn giản: % các từ trùng nhau
            input_words = set(normalized_input.split())
            major_words = set(major_name_norm.split())
            
            # Số từ trùng / tổng số từ
            common_words = input_words.intersection(major_words)
            total_words = input_words.union(major_words)
            similarity = len(common_words) / len(total_words) if total_words else 0
            
            if similarity > max_similarity:
                max_similarity = similarity
                best_match = major
        
        if max_similarity >= 0.3:  # Ngưỡng tương đồng tối thiểu là 30%
            print(f"Chọn ngành tương tự nhất: {best_match.get('name')} (độ tương đồng: {max_similarity:.2f})")
            return best_match
    except Exception as e:
        print(f"Lỗi khi tìm kiếm tương đồng: {e}")
    
    print("Không tìm thấy ngành phù hợp")
    return None

def load_model_and_scaler():
    """
    Tải mô hình và scaler đã lưu từ thư mục hiện tại
    """
    model_path = os.path.join(MODEL_DIR, 'admission_probability_model.h5')
    
    if not os.path.exists(model_path):
        print(f"Lỗi: Không tìm thấy mô hình tại {model_path}")
        print("Vui lòng chạy neural_network_model.py trước để huấn luyện mô hình")
        return None, None, None
    
    try:
        # Tải mô hình
        model = tf.keras.models.load_model(model_path)
        
        # Tải scaler
        scaler_mean = np.load(os.path.join(MODEL_DIR, 'scaler_mean.npy'))
        scaler_scale = np.load(os.path.join(MODEL_DIR, 'scaler_scale.npy'))
        
        # Tải danh sách đặc trưng
        with open(os.path.join(MODEL_DIR, 'features.txt'), 'r', encoding='utf-8') as f:
            features = f.read().splitlines()
        
        print("Đã tải mô hình và scaler thành công!")
        return model, (scaler_mean, scaler_scale), features
    
    except Exception as e:
        print(f"Lỗi khi tải mô hình: {e}")
        return None, None, None

def calculate_expected_score(mu, t, q, q0, score_trend, alpha=0.5, beta=1.0, gamma=0.7):
    """
    Tính điểm chuẩn dự kiến
    mu: điểm chuẩn trung bình
    t: xu hướng thị trường
    q: chỉ tiêu năm dự đoán
    q0: chỉ tiêu trung bình của ngành
    score_trend: xu hướng điểm chuẩn qua các năm
    """
    return round(mu + alpha * t - beta * (q / q0 - 1) + gamma * score_trend, 2)

def predict_single_student(
    student_score, 
    average_score, 
    expected_score, 
    quota, 
    q0, 
    market_trend, 
    score_trend,
    model, 
    scaler
):
    """
    Dự đoán xác suất trúng tuyển cho một học sinh
    """
    # Tính toán chênh lệch điểm
    score_diff = student_score - expected_score
    
    # Tạo dữ liệu đầu vào
    input_data = np.array([[
        student_score, average_score, expected_score, 
        score_diff, quota, q0, market_trend, score_trend
    ]])
    
    # Áp dụng chuẩn hóa
    scaler_mean, scaler_scale = scaler
    input_scaled = (input_data - scaler_mean) / scaler_scale
    
    # Dự đoán
    probability = model.predict(input_scaled, verbose=0)[0][0]
    
    return probability

def find_similar_university(university_code):
    """
    Tìm trường đại học tương tự trong database
    """
    print(f"Tìm trường đại học với mã: '{university_code}'")
    
    if db is None:
        return None
    
    # Thử tìm chính xác trước
    university = db.universities.find_one({'code': university_code})
    if university:
        print(f"Tìm thấy trường chính xác: {university.get('name')}")
        return university
    
    # Tìm không phân biệt chữ hoa/thường
    university = db.universities.find_one({'code': {'$regex': f'^{university_code}$', '$options': 'i'}})
    if university:
        print(f"Tìm thấy trường (không phân biệt chữ hoa/thường): {university.get('name')}")
        return university
    
    # Nếu vẫn không tìm thấy, tìm ngay cả khi code chỉ là một phần
    university = db.universities.find_one({'code': {'$regex': university_code, '$options': 'i'}})
    if university:
        print(f"Tìm thấy trường (mã chứa chuỗi): {university.get('name')} ({university.get('code')})")
        return university
    
    # Nếu vẫn không tìm thấy, thử tìm theo tên nếu unviersity_code có vẻ như một tên
    if len(university_code) > 3:  # Nếu dài hơn 3 ký tự, có thể là tên
        university = db.universities.find_one({'name': {'$regex': university_code, '$options': 'i'}})
        if university:
            print(f"Tìm thấy trường (theo tên): {university.get('name')}")
            return university
    
    print(f"Không tìm thấy trường {university_code}")
    return None

def custom_predict_admission(university_code, major_name, combination, student_score, model, scaler, features):
    """
    Dự đoán xác suất trúng tuyển với khả năng tìm ngành học linh hoạt hơn
    """
    try:
        # Nếu không có kết nối database, sử dụng các giá trị mô phỏng
        if db is None:
            print("Không có kết nối MongoDB, sử dụng dữ liệu mô phỏng")
            average_score = student_score - 1
            quota = 100
            q0 = 100
            market_trend = 0.5
            score_trend = 0
            expected_score = calculate_expected_score(average_score, market_trend, quota, q0, score_trend)
            
            probability = predict_single_student(
                student_score=student_score,
                average_score=average_score,
                expected_score=expected_score,
                quota=quota,
                q0=q0,
                market_trend=market_trend,
                score_trend=score_trend,
                model=model,
                scaler=scaler
            )
            
            # In tất cả tham số đầu vào cho mô hình
            print("\n=== THAM SỐ ĐẦU VÀO CHO MÔ HÌNH ===")
            print(f"Tham số người dùng:")
            print(f"- Mã trường (university_code): {university_code}")
            print(f"- Tên ngành (major_name): {major_name}")
            print(f"- Tổ hợp môn (combination): {combination}")
            print(f"- Điểm học sinh (student_score): {student_score}")
            
            print(f"\nTham số hệ thống (mô phỏng):")
            print(f"- Điểm chuẩn trung bình (average_score): {average_score}")
            print(f"- Điểm chuẩn dự kiến (expected_score): {expected_score}")
            print(f"- Chênh lệch điểm (score_diff): {student_score - expected_score}")
            print(f"- Chỉ tiêu tuyển sinh (quota): {quota}")
            print(f"- Chỉ tiêu trung bình (q0): {q0}")
            print(f"- Xu hướng thị trường (market_trend): {market_trend}")
            print(f"- Xu hướng điểm chuẩn (score_trend): {score_trend}")
            
            prediction = {
                'universityCode': university_code,
                'universityName': 'Đại học (giả lập)',
                'majorName': f'Ngành {major_name} (giả lập)',
                'combination': combination,
                'studentScore': student_score,
                'expectedScore': expected_score,
                'scoreDiff': student_score - expected_score,
                'quota': quota,
                'marketTrend': market_trend,
                'admissionProbability': float(probability),
                'admissionPercentage': f"{float(probability)*100:.2f}%",
                'predictionDate': datetime.now().isoformat(),
                'note': "Dữ liệu mô phỏng do không có kết nối MongoDB"
            }
            
            return prediction
        
        # Tìm thông tin ngành học với tìm kiếm linh hoạt
        major = find_similar_major(major_name)
        if not major:
            print(f"Không tìm thấy thông tin về ngành {major_name}")
            # Thử dùng dữ liệu mô phỏng
            average_score = student_score - 1
            quota = 100
            q0 = 100
            market_trend = 0.5
            score_trend = 0
            expected_score = calculate_expected_score(average_score, market_trend, quota, q0, score_trend)
            
            probability = predict_single_student(
                student_score=student_score,
                average_score=average_score,
                expected_score=expected_score,
                quota=quota,
                q0=q0,
                market_trend=market_trend,
                score_trend=score_trend,
                model=model,
                scaler=scaler
            )
            
            # In tất cả tham số đầu vào cho mô hình
            print("\n=== THAM SỐ ĐẦU VÀO CHO MÔ HÌNH (MÔ PHỎNG) ===")
            print(f"Tham số người dùng:")
            print(f"- Mã trường (university_code): {university_code}")
            print(f"- Tên ngành (major_name): {major_name}")
            print(f"- Tổ hợp môn (combination): {combination}")
            print(f"- Điểm học sinh (student_score): {student_score}")
            
            print(f"\nTham số hệ thống (mô phỏng):")
            print(f"- Điểm chuẩn trung bình (average_score): {average_score}")
            print(f"- Điểm chuẩn dự kiến (expected_score): {expected_score}")
            print(f"- Chênh lệch điểm (score_diff): {student_score - expected_score}")
            print(f"- Chỉ tiêu tuyển sinh (quota): {quota}")
            print(f"- Chỉ tiêu trung bình (q0): {q0}")
            print(f"- Xu hướng thị trường (market_trend): {market_trend}")
            print(f"- Xu hướng điểm chuẩn (score_trend): {score_trend}")
            
            prediction = {
                'universityCode': university_code,
                'universityName': 'Đại học (giả lập)',
                'majorName': f'Ngành {major_name} (giả lập)',
                'combination': combination,
                'studentScore': student_score,
                'expectedScore': expected_score,
                'scoreDiff': student_score - expected_score,
                'quota': quota,
                'marketTrend': market_trend,
                'admissionProbability': float(probability),
                'admissionPercentage': f"{float(probability)*100:.2f}%",
                'predictionDate': datetime.now().isoformat(),
                'note': "Dữ liệu mô phỏng do không tìm thấy ngành học"
            }
            
            return prediction
            
        # Lấy xu hướng thị trường (market trend) của ngành
        current_year = datetime.now().year
        market_trend = 0.5  # Giá trị mặc định
        for trend in major.get('marketTrends', []):
            if trend.get('year') == current_year:
                market_trend = trend.get('score', 0.5)
                break
        
        # Tìm thông tin trường đại học
        university = find_similar_university(university_code)
        if not university:
            print(f"Không tìm thấy thông tin về trường {university_code}")
            university = {'name': f'Đại học {university_code} (giả lập)'}
            university_code_for_query = university_code
        else:
            university_code_for_query = university.get('code', university_code)
        
        # Chuẩn bị tìm điểm chuẩn
        collections = db.list_collection_names()
        
        # Sử dụng tên collection chính xác
        benchmark_collection_name = 'benchmark_scores'
        if benchmark_collection_name not in collections:
            # Tìm collection phù hợp nếu không tìm thấy
            for collection in collections:
                if 'benchmark' in collection.lower() or 'diem' in collection.lower():
                    benchmark_collection_name = collection
                    print(f"Sử dụng collection thay thế: {benchmark_collection_name}")
                    break
        
        # Chuẩn hóa tên ngành và tổ hợp
        normalized_major_name = normalize_text(major.get('name', major_name)).lower()
        
        # Lấy thông tin điểm chuẩn
        benchmark_collection = db[benchmark_collection_name]
        
        # Truy vấn theo cấu trúc thực tế từ database
        benchmark_query = {
            'Mã trường': university_code_for_query,
            'Ngành': {'$regex': f'{normalized_major_name}', '$options': 'i'}
        }
        
        # Thêm tổ hợp nếu có
        if combination:
            benchmark_query['Tổ hợp'] = combination
        
        print(f"Truy vấn benchmark: {benchmark_query}")
        benchmark_scores = list(benchmark_collection.find(benchmark_query).sort('Năm', -1))
        
        print(f"Tìm thấy {len(benchmark_scores)} điểm chuẩn trong lịch sử")
        
        if not benchmark_scores:
            # Thử tìm không kèm tổ hợp
            if 'Tổ hợp' in benchmark_query:
                del benchmark_query['Tổ hợp']
                benchmark_scores = list(benchmark_collection.find(benchmark_query).sort('Năm', -1))
                print(f"Tìm thấy {len(benchmark_scores)} điểm chuẩn không kèm tổ hợp")
            
            # Nếu vẫn không tìm thấy, thử tìm với các field khác
            if not benchmark_scores:
                alternative_queries = [
                    {'Mã trường': university_code_for_query},
                    {'ma_truong': university_code_for_query},
                    {'university_code': university_code_for_query}
                ]
                
                for query in alternative_queries:
                    temp_scores = list(benchmark_collection.find(query).sort('Năm', -1))
                    if temp_scores:
                        print(f"Tìm thấy {len(temp_scores)} điểm chuẩn với query: {query}")
                        benchmark_scores = temp_scores
                        break
        
        # Phân tích điểm chuẩn
        if benchmark_scores:
            # Tính điểm chuẩn trung bình từ dữ liệu lịch sử
            scores = [score.get('Điểm chuẩn') for score in benchmark_scores if score.get('Điểm chuẩn')]
            
            if scores:
                average_score = sum(scores) / len(scores)
                print(f"Điểm chuẩn trung bình từ lịch sử: {average_score}")
                
                # Tính xu hướng điểm chuẩn nếu có ít nhất 2 năm dữ liệu
                if len(scores) >= 2:
                    # Tính xu hướng tăng/giảm
                    yearly_changes = []
                    
                    # Sắp xếp theo năm giảm dần
                    sorted_scores = sorted(benchmark_scores, 
                                          key=lambda x: x.get('Năm', 0), 
                                          reverse=True)
                    
                    for i in range(len(sorted_scores) - 1):
                        if (sorted_scores[i].get('Điểm chuẩn') and 
                            sorted_scores[i+1].get('Điểm chuẩn')):
                            yearly_changes.append(
                                sorted_scores[i].get('Điểm chuẩn') - 
                                sorted_scores[i+1].get('Điểm chuẩn')
                            )
                    
                    if yearly_changes:
                        avg_change = sum(yearly_changes) / len(yearly_changes)
                        # Chuẩn hóa xu hướng vào khoảng [-1, 1]
                        score_trend = min(1, max(-1, avg_change))
                        print(f"Xu hướng điểm chuẩn từ lịch sử: {score_trend}")
                    else:
                        score_trend = 0
                else:
                    score_trend = 0
            else:
                # Không có điểm chuẩn hợp lệ
                average_score = student_score - 1
                score_trend = 0
        else:
            # Không tìm thấy điểm chuẩn
            average_score = student_score - 1
            score_trend = 0
        
        # Tìm thông tin tuyển sinh
        admission_criteria = None
        if major.get('_id') is not None:
            admission_criteria = db.admission_criteria.find_one({
                'universityCode': university_code,
                'majorId': major['_id']
            })
        
        if not admission_criteria:
            print(f"Không tìm thấy thông tin tuyển sinh cho ngành {major.get('name')} tại trường {university_code}")
            
            # Sử dụng giá trị mặc định cho chỉ tiêu
            quota = 100  # Chỉ tiêu mặc định
            q0 = 100  # Chỉ tiêu trung bình mặc định
        else:
            # Lấy chỉ tiêu tuyển sinh cho năm hiện tại hoặc năm gần nhất
            quota_list = admission_criteria.get('quota', [])
            quota_years = sorted([q.get('year') for q in quota_list if q.get('year') is not None], reverse=True)
            
            quota = None
            if quota_years:
                target_year = current_year if current_year in quota_years else quota_years[0]
                for q in quota_list:
                    if q.get('year') == target_year:
                        quota_value = q.get('total')
                        # Xử lý giá trị chỉ tiêu
                        if isinstance(quota_value, str):
                            if '-' in quota_value:
                                low, high = map(int, quota_value.split('-'))
                                quota = (low + high) / 2
                            elif quota_value.isdigit():
                                quota = int(quota_value)
                        elif isinstance(quota_value, (int, float)):
                            quota = float(quota_value)
                        break
            
            if quota is None:
                print("Không thể xác định chỉ tiêu tuyển sinh")
                quota = 100  # Giá trị mặc định
            
            # Tính toán q0 (chỉ tiêu trung bình) nếu có
            similar_criteria = list(db.admission_criteria.find({
                'majorId': major['_id']
            }))
            
            q0 = quota  # Mặc định
            if similar_criteria:
                all_quotas = []
                for criteria in similar_criteria:
                    for q in criteria.get('quota', []):
                        if q.get('year') == current_year and q.get('total'):
                            quota_value = q.get('total')
                            if isinstance(quota_value, str):
                                if '-' in quota_value:
                                    low, high = map(int, quota_value.split('-'))
                                    all_quotas.append((low + high) / 2)
                                elif quota_value.isdigit():
                                    all_quotas.append(int(quota_value))
                            elif isinstance(quota_value, (int, float)):
                                all_quotas.append(float(quota_value))
                
                if all_quotas:
                    q0 = sum(all_quotas) / len(all_quotas)
        
        # Tính điểm chuẩn dự kiến
        expected_score = calculate_expected_score(average_score, market_trend, quota, q0, score_trend)
        
        # Dự đoán xác suất
        probability = predict_single_student(
            student_score=student_score,
            average_score=average_score,
            expected_score=expected_score,
            quota=quota,
            q0=q0,
            market_trend=market_trend,
            score_trend=score_trend,
            model=model,
            scaler=scaler
        )
        
        # In tất cả tham số đầu vào cho mô hình
        print("\n=== THAM SỐ ĐẦU VÀO CHO MÔ HÌNH ===")
        print(f"Tham số người dùng:")
        print(f"- Mã trường (university_code): {university_code}")
        print(f"- Tên ngành (major_name): {major_name}")
        print(f"- Tổ hợp môn (combination): {combination}")
        print(f"- Điểm học sinh (student_score): {student_score}")
        
        print(f"\nTham số hệ thống:")
        print(f"- Điểm chuẩn trung bình (average_score): {average_score}")
        print(f"- Điểm chuẩn dự kiến (expected_score): {expected_score}")
        print(f"- Chênh lệch điểm (score_diff): {student_score - expected_score}")
        print(f"- Chỉ tiêu tuyển sinh (quota): {quota}")
        print(f"- Chỉ tiêu trung bình (q0): {q0}")
        print(f"- Xu hướng thị trường (market_trend): {market_trend}")
        print(f"- Xu hướng điểm chuẩn (score_trend): {score_trend}")
        
        # Tạo kết quả dự đoán
        prediction = {
            'universityCode': university_code,
            'universityName': university.get('name', ''),
            'majorName': major.get('name', ''),
            'combination': combination,
            'studentScore': student_score,
            'expectedScore': expected_score,
            'scoreDiff': student_score - expected_score,
            'quota': quota,
            'marketTrend': market_trend,
            'admissionProbability': float(probability),
            'admissionPercentage': f"{float(probability)*100:.2f}%",
            'predictionDate': datetime.now().isoformat()
        }
        
        return prediction
    
    except Exception as e:
        print(f"Lỗi khi dự đoán: {e}")
        import traceback
        traceback.print_exc()
        return None

def predict_from_json(input_data):
    """
    Dự đoán xác suất đậu đại học từ dữ liệu JSON
    
    Args:
        input_data: Dict chứa dữ liệu đầu vào
        
    Returns:
        Dict chứa kết quả dự đoán
    """
    # Kiểm tra các trường bắt buộc
    required_fields = ['university_code', 'major_name', 'combination', 'student_score']
    
    for field in required_fields:
        if field not in input_data:
            return {
                'success': False,
                'message': f'Thiếu trường {field} trong dữ liệu đầu vào'
            }
    
    # Tải mô hình
    model, scaler, features = load_model_and_scaler()
    if model is None:
        return {
            'success': False,
            'message': 'Không thể tải mô hình, hãy đảm bảo mô hình đã được huấn luyện'
        }
    
    # Trích xuất các tham số
    university_code = input_data['university_code']
    major_name = input_data['major_name']
    combination = input_data['combination']
    
    try:
        student_score = float(input_data['student_score'])
    except (ValueError, TypeError):
        return {
            'success': False,
            'message': 'Điểm học sinh không hợp lệ, phải là số'
        }
    
    # Dự đoán xác suất sử dụng hàm cải tiến
    prediction = custom_predict_admission(
        university_code, major_name, combination, student_score,
        model, scaler, features
    )
    
    if prediction is None:
        return {
            'success': False,
            'message': 'Không thể dự đoán với thông tin đã cung cấp'
        }
    
    # Tạo kết quả chi tiết
    result = {
        'success': True,
        'request': {
            'university_code': university_code,
            'major_name': major_name,
            'combination': combination,
            'student_score': student_score
        },
        'prediction': {
            'university_name': prediction['universityName'],
            'expected_score': prediction['expectedScore'],
            'score_difference': prediction['scoreDiff'],
            'admission_probability': prediction['admissionProbability'],
            'admission_percentage': prediction['admissionPercentage'],
            'market_trend': prediction['marketTrend'],
            'assessment': get_assessment(prediction['admissionProbability'])
        },
        'metadata': {
            'timestamp': datetime.now().isoformat(),
            'model_version': '1.0.0'
        }
    }
    
    # Thêm ghi chú nếu có
    if 'note' in prediction:
        result['prediction']['note'] = prediction['note']
    
    return result

def get_assessment(probability):
    """
    Trả về đánh giá dựa trên xác suất
    """
    if probability >= 0.8:
        return "Khả năng trúng tuyển rất cao"
    elif probability >= 0.6:
        return "Khả năng trúng tuyển cao"
    elif probability >= 0.4:
        return "Khả năng trúng tuyển trung bình"
    elif probability >= 0.2:
        return "Khả năng trúng tuyển thấp"
    else:
        return "Khả năng trúng tuyển rất thấp"

def main():
    """
    Hàm chính để chạy script
    """
    parser = argparse.ArgumentParser(description='Test mô hình dự đoán xác suất đậu đại học')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--input', help='Đường dẫn tới file JSON đầu vào')
    group.add_argument('--inline', help='Chuỗi JSON đầu vào')
    parser.add_argument('--output', help='Đường dẫn tới file JSON đầu ra (mặc định: output.json)')
    
    args = parser.parse_args()
    
    # Đọc dữ liệu đầu vào
    try:
        if args.input:
            with open(args.input, 'r', encoding='utf-8') as f:
                input_data = json.load(f)
        else:
            input_data = json.loads(args.inline)
    except json.JSONDecodeError:
        print("Lỗi: Dữ liệu JSON không hợp lệ")
        sys.exit(1)
    except FileNotFoundError:
        print(f"Lỗi: Không tìm thấy file {args.input}")
        sys.exit(1)
    
    # Dự đoán
    result = predict_from_json(input_data)
    
    # Xuất kết quả
    output_file = args.output if args.output else 'output.json'
    
    # In ra console
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # Lưu vào file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\nĐã lưu kết quả vào file {output_file}")

if __name__ == "__main__":
    main() 