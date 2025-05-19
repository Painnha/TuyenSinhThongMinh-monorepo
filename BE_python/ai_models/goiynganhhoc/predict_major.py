import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
import os
import sys
import json
from pymongo import MongoClient

# Thêm đường dẫn để import cần thiết
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(parent_dir)

# Import DataPreprocessor từ data_preprocessing.py
from ai_models.goiynganhhoc.data_preprocessing import DataPreprocessor

# Kết nối MongoDB - sử dụng từ biến môi trường
def connect_to_mongodb():
    MONGODB_URI = os.getenv('MONGO_URI')
    MONGODB_NAME = os.getenv('MONGO_DB_NAME')
    
    print(f"MongoDB Configuration in predict_major.py: URI={MONGODB_URI}, DB={MONGODB_NAME}")
    
    try:
        client = MongoClient(MONGODB_URI)
        db = client[MONGODB_NAME]
        # Test connection
        db.list_collection_names()
        print("MongoDB connection successful!")
        return db
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

# Định nghĩa hàm loss tùy chỉnh giống như trong train_model
def weighted_binary_crossentropy(class_weight):
    def loss(y_true, y_pred):
        # Apply class weight to the binary crossentropy
        weight_vector = y_true * class_weight[1] + (1 - y_true) * class_weight[0]
        base_loss = tf.keras.losses.binary_crossentropy(y_true, y_pred)
        weighted_loss = base_loss * weight_vector
        return tf.reduce_mean(weighted_loss)
    return loss

# Định nghĩa hàm loss mặc định cho custom_objects
def loss(y_true, y_pred):
    # Phiên bản đơn giản
    return tf.keras.losses.binary_crossentropy(y_true, y_pred)

def load_model_and_scaler():
    """
    Tải mô hình dự đoán và bộ scaler
    
    Returns:
        model: Mô hình đã được huấn luyện
        scaler: Tuple (scaler_mean, scaler_scale)
        features_info: Thông tin về các đặc trưng
    """
    model_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(model_dir, 'model', 'major_recommendation_model.h5')
    scaler_mean_path = os.path.join(model_dir, 'model', 'scaler_mean.npy')
    scaler_scale_path = os.path.join(model_dir, 'model', 'scaler_scale.npy')
    
    # Kiểm tra file mô hình
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Không tìm thấy mô hình tại: {model_path}")
    
    # Kiểm tra file scaler
    if not os.path.exists(scaler_mean_path) or not os.path.exists(scaler_scale_path):
        raise FileNotFoundError(f"Không tìm thấy file scaler")
    
    # Tạo một bản sao của mô hình không chứa loss function
    try:
        # Sử dụng custom_object_scope để load model
        with tf.keras.utils.custom_object_scope({
            'weighted_binary_crossentropy': weighted_binary_crossentropy,
            'loss': loss
        }):
            model = load_model(model_path)
            print("Model loaded with compile=True")
    except Exception as e:
        print(f"Lỗi khi load model: {e}")
        
        # Thử phương án thay thế: tải model mà không compile
        try:
            print("Thử tải model mà không compile...")
            model = load_model(model_path, compile=False)
            print("Load model thành công!")
        except Exception as e2:
            print(f"Lỗi khi load model không compile: {e2}")
            raise e2
    
    # Thêm phương thức predict_combined vào model
    def predict_combined(X):
        try:
            # Thử dùng predict trực tiếp với nhiều đầu ra
            raw_preds = model.predict(X, verbose=0)
            if isinstance(raw_preds, list):
                # Mô hình có nhiều đầu ra
                preds = np.zeros((X.shape[0], len(raw_preds)))
                for i, pred in enumerate(raw_preds):
                    preds[:, i] = pred.reshape(-1)
                return preds
            else:
                # Mô hình có một đầu ra
                return raw_preds
        except Exception as e:
            print(f"Lỗi dự đoán: {e}, thử phương pháp khác...")
            # Thử cách khác nếu cách trên không hoạt động
            num_outputs = len(model.outputs)
            preds = np.zeros((X.shape[0], num_outputs))
            
            # Lấy kết quả từng đầu ra
            for i in range(num_outputs):
                output_layer = model.get_layer(f'output_{i}')
                temp_model = tf.keras.Model(inputs=model.inputs, outputs=output_layer.output)
                preds[:, i] = temp_model.predict(X, verbose=0).reshape(-1)
            
            return preds
    
    # Gắn phương thức vào model
    model.predict_combined = predict_combined
    
    # Tải scaler
    scaler_mean = np.load(scaler_mean_path)
    scaler_scale = np.load(scaler_scale_path)
    scaler = (scaler_mean, scaler_scale)
    
    # Tạo thông tin đặc trưng
    features_info = {
        "scaler_mean": scaler_mean.tolist(),
        "scaler_scale": scaler_scale.tolist(),
        "model_loaded": True
    }
    
    return model, scaler, features_info

def preprocess_student_data(student_data, db=None):
    """
    Tiền xử lý dữ liệu học sinh và chuẩn bị cho dự đoán
    
    Args:
        student_data: Dictionary chứa thông tin học sinh
        db: Database connection (optional)
        
    Returns:
        features: Đặc trưng đã tiền xử lý
        metadata: Metadata cho dự đoán
    """
    print("Bắt đầu tiền xử lý dữ liệu học sinh...")
    print(f"Input data: {json.dumps(student_data, indent=2)}")
    
    # Kết nối MongoDB nếu cần
    if db is None:
        db = connect_to_mongodb()
    
    # Khởi tạo DataPreprocessor
    try:
        preprocessor = DataPreprocessor()
        print("DataPreprocessor khởi tạo thành công")
    except Exception as e:
        print(f"Lỗi khi khởi tạo DataPreprocessor: {e}")
        raise e
    
    # Tiền xử lý dữ liệu học sinh
    try:
        features = preprocessor.preprocess_student_data(student_data)
        print(f"Preprocess features shape: {features.shape}")
    except Exception as e:
        print(f"Lỗi khi tiền xử lý dữ liệu: {e}")
        raise e
    
    # Tìm tổ hợp môn tối ưu
    best_combination, total_score = find_best_combination_score(student_data)
    
    # Tạo metadata
    metadata = {
        "preprocessor": preprocessor,
        "best_combination": best_combination,
        "total_score": total_score,
        "student_data": student_data
    }
    
    return features, metadata

def find_best_combination_score(student_data):
    """Tìm tổ hợp môn và điểm cao nhất của học sinh"""
    combinations = {
        'A00': ['Toan', 'VatLy', 'HoaHoc'],
        'A01': ['Toan', 'VatLy', 'NgoaiNgu'],
        'B00': ['Toan', 'HoaHoc', 'SinhHoc'],
        'C00': ['NguVan', 'LichSu', 'DiaLy'],
        'D01': ['Toan', 'NguVan', 'NgoaiNgu']
    }
    
    scores = student_data.get('scores', {})
    best_score = 0
    best_combo = None
    
    for combo_code, subjects in combinations.items():
        total = 0
        valid = True
        
        for subject in subjects:
            if subject in scores and scores[subject] is not None:
                total += float(scores[subject])
            else:
                valid = False
                break
                
        if valid and total > best_score:
            best_score = total
            best_combo = combo_code
    
    # Thêm điểm ưu tiên nếu có
    priority_score = 0
    if 'priority' in student_data:
        # Điểm ưu tiên khu vực (0.25-0.75)
        area_priority = {
            'KV1': 0.75,
            'KV2': 0.5,
            'KV3': 0.25
        }
        # Điểm ưu tiên đối tượng (0-2)
        subject_priority = {
            '01': 2.0,
            '02': 1.5,
            '03': 1.0,
            '04': 0.5,
            '05': 0.5,
            '06': 0.5,
            '07': 0.5,
            '00': 0.0
        }
        
        if 'area' in student_data['priority']:
            priority_score += area_priority.get(student_data['priority']['area'], 0)
        
        if 'subject' in student_data['priority']:
            priority_score += subject_priority.get(student_data['priority']['subject'], 0)
    
    return best_combo, best_score + priority_score

def predict_recommended_majors(model, scaler, features, metadata, top_k=5):
    """
    Dự đoán ngành học phù hợp cho học sinh
    
    Args:
        model: Mô hình đã huấn luyện
        scaler: Bộ scaler để chuẩn hóa đầu vào
        features: Đặc trưng đã tiền xử lý
        metadata: Metadata cho dự đoán
        top_k: Số lượng ngành gợi ý
        
    Returns:
        List các ngành phù hợp nhất cùng chi tiết
    """
    print("Đang thực hiện dự đoán...")
    
    # Lấy preprocessor từ metadata
    preprocessor = metadata["preprocessor"]
    
    # Chuẩn hóa đặc trưng
    scaler_mean, scaler_scale = scaler
    features_scaled = (features.reshape(1, -1) - scaler_mean) / scaler_scale
    
    # Dự đoán bằng phương thức predict_combined
    try:
        predictions = model.predict_combined(features_scaled)[0]
        print(f"Prediction shape: {predictions.shape}")
    except Exception as e:
        print(f"Lỗi khi dự đoán: {e}")
        raise e
    
    # Lấy top-k ngành có xác suất cao nhất
    top_indices = np.argsort(predictions)[::-1][:top_k]
    
    # Tạo danh sách kết quả
    recommendations = []
    
    # Lấy thông tin từ metadata
    best_combination = metadata.get("best_combination")
    total_score = metadata.get("total_score")
    student_data = metadata.get("student_data", {})
    
    print(f"Đang tạo kết quả cho {len(top_indices)} ngành...")
    
    # Danh sách các ngành học phổ biến để thay thế
    popular_majors = {
        "Ngành 10": "Công nghệ thông tin",
        "Ngành 9": "Kỹ thuật phần mềm",
        "Ngành 14": "Khoa học máy tính",
        "Ngành 12": "Kỹ thuật điện tử",
        "Ngành 11": "Quản trị kinh doanh",
        "Ngành 7": "Tài chính - Ngân hàng",
        "Ngành 8": "Marketing",
        "Ngành 6": "Kế toán",
        "Ngành 5": "Logistics và Quản lý chuỗi cung ứng",
        "Ngành 4": "Du lịch - Khách sạn",
        "Ngành 3": "Ngôn ngữ Anh",
        "Ngành 2": "Công nghệ sinh học",
        "Ngành 1": "Y khoa",
        "Ngành 0": "Dược học",
        "Ngành 13": "Xây dựng"
    }
    
    # Danh sách mô tả ngành
    major_descriptions = {
        "Công nghệ thông tin": "Ngành học nghiên cứu về các hệ thống xử lý thông tin, đặc biệt là các hệ thống phần mềm và phần cứng máy tính. Sinh viên được học về lập trình, cơ sở dữ liệu, mạng máy tính, trí tuệ nhân tạo và an ninh mạng.",
        "Kỹ thuật phần mềm": "Ngành học tập trung vào quy trình phát triển phần mềm chất lượng cao, bao gồm các phương pháp phân tích, thiết kế, lập trình, kiểm thử và bảo trì phần mềm.",
        "Khoa học máy tính": "Ngành học chuyên sâu về các nguyên lý và lý thuyết của khoa học máy tính, thuật toán, kiến trúc máy tính và trí tuệ nhân tạo.",
        "Kỹ thuật điện tử": "Nghiên cứu về thiết kế và phát triển các thiết bị điện tử, mạch tích hợp, hệ thống nhúng và robot.",
        "Quản trị kinh doanh": "Ngành học trang bị kiến thức quản lý và điều hành doanh nghiệp, bao gồm marketing, tài chính, nhân sự và chiến lược kinh doanh.",
        "Tài chính - Ngân hàng": "Đào tạo chuyên gia trong lĩnh vực tài chính, ngân hàng, chứng khoán và quản lý đầu tư.",
        "Marketing": "Ngành học về khoa học thị trường, nghiên cứu khách hàng, quảng cáo và xây dựng thương hiệu.",
        "Kế toán": "Đào tạo về ghi chép, phân tích và báo cáo tài chính của doanh nghiệp và tổ chức.",
        "Logistics và Quản lý chuỗi cung ứng": "Ngành học về quy trình quản lý dòng lưu chuyển hàng hóa, dịch vụ và thông tin từ điểm xuất phát đến điểm tiêu thụ.",
        "Du lịch - Khách sạn": "Đào tạo chuyên gia trong lĩnh vực dịch vụ du lịch, quản lý khách sạn và tổ chức sự kiện.",
        "Ngôn ngữ Anh": "Ngành học về ngôn ngữ và văn hóa Anh, đào tạo kỹ năng biên phiên dịch, giảng dạy và giao tiếp quốc tế.",
        "Công nghệ sinh học": "Ngành học ứng dụng các quy trình sinh học vào sản xuất, y tế, nông nghiệp và bảo vệ môi trường.",
        "Y khoa": "Đào tạo bác sĩ với kiến thức toàn diện về y học, chẩn đoán, điều trị và phòng ngừa bệnh.",
        "Dược học": "Nghiên cứu về các dược chất, phát triển thuốc và chăm sóc dược cho bệnh nhân.",
        "Xây dựng": "Ngành học về thiết kế, thi công và quản lý các công trình xây dựng dân dụng và công nghiệp."
    }
    
    # Danh sách danh mục ngành
    major_categories = {
        "Công nghệ thông tin": "Công nghệ thông tin",
        "Kỹ thuật phần mềm": "Công nghệ thông tin",
        "Khoa học máy tính": "Công nghệ thông tin",
        "Kỹ thuật điện tử": "Kỹ thuật",
        "Quản trị kinh doanh": "Kinh tế - Quản trị",
        "Tài chính - Ngân hàng": "Kinh tế - Quản trị",
        "Marketing": "Kinh tế - Quản trị",
        "Kế toán": "Kinh tế - Quản trị",
        "Logistics và Quản lý chuỗi cung ứng": "Kinh tế - Quản trị",
        "Du lịch - Khách sạn": "Du lịch - Nhà hàng - Khách sạn",
        "Ngôn ngữ Anh": "Ngôn ngữ - Văn hóa",
        "Công nghệ sinh học": "Khoa học sự sống",
        "Y khoa": "Y tế - Sức khỏe",
        "Dược học": "Y tế - Sức khỏe",
        "Xây dựng": "Kỹ thuật"
    }
    
    # Thông tin các trường đại học
    universities_by_major = {
        "Công nghệ thông tin": [
            {"university_name": "ĐH Bách Khoa Hà Nội", "benchmark_score": 26.0, "combination": "A00"},
            {"university_name": "ĐH Công nghệ - ĐHQGHN", "benchmark_score": 25.75, "combination": "A01"},
            {"university_name": "ĐH FPT", "benchmark_score": 24.0, "combination": "A00"}
        ],
        "Kỹ thuật phần mềm": [
            {"university_name": "ĐH Bách Khoa Hà Nội", "benchmark_score": 25.8, "combination": "A00"},
            {"university_name": "ĐH FPT", "benchmark_score": 23.5, "combination": "A01"},
            {"university_name": "ĐH Công nghệ Thông tin - ĐHQG TP.HCM", "benchmark_score": 25.5, "combination": "A00"}
        ],
        "Khoa học máy tính": [
            {"university_name": "ĐH Công nghệ - ĐHQGHN", "benchmark_score": 26.5, "combination": "A00"},
            {"university_name": "ĐH Khoa học Tự nhiên - ĐHQGHN", "benchmark_score": 25.0, "combination": "A01"}
        ],
        "Kỹ thuật điện tử": [
            {"university_name": "ĐH Bách Khoa Hà Nội", "benchmark_score": 24.5, "combination": "A00"},
            {"university_name": "ĐH Bách Khoa - ĐHQG TP.HCM", "benchmark_score": 24.0, "combination": "A01"}
        ],
        "Quản trị kinh doanh": [
            {"university_name": "ĐH Kinh tế - ĐHQGHN", "benchmark_score": 25.0, "combination": "A00"},
            {"university_name": "ĐH Ngoại thương", "benchmark_score": 25.5, "combination": "A01"},
            {"university_name": "ĐH Kinh tế TP.HCM", "benchmark_score": 24.5, "combination": "D01"}
        ]
    }
    
    # Tạo recommendations cho mỗi ngành
    for i, idx in enumerate(top_indices):
        # Lấy tên ngành từ preprocessor
        major_name = preprocessor.get_major_by_id(idx)
        confidence = float(predictions[idx])
        
        # Làm tròn confidence để tránh quá nhỏ
        confidence = max(confidence, 0.25)  # Đảm bảo tối thiểu 25%
        
        # Thay thế tên ngành nếu là "Ngành X"
        if major_name in popular_majors:
            major_name = popular_majors[major_name]
        
        # Lấy thêm thông tin ngành
        major_info = preprocessor.get_major_info(major_name)
        
        # Nếu không có thông tin ngành từ DB, dùng thông tin hardcode
        category = major_info.get('category', major_categories.get(major_name, 'Chưa phân loại'))
        description = major_info.get('description', major_descriptions.get(major_name, 'Chưa có mô tả chi tiết'))
        
        # Tìm sở thích phù hợp với ngành
        matching_interests = []
        if 'interests' in major_info:
            for interest_obj in major_info['interests']:
                if isinstance(interest_obj, dict) and 'name' in interest_obj:
                    interest_name = interest_obj['name']
                    if interest_name in student_data.get('interests', []):
                        matching_interests.append(interest_name)
        
        # Tạo safety level dựa trên điểm
        if 'subject_groups' in major_info:
            benchmark_score = 0
            for group in major_info.get('subject_groups', []):
                if group.get('combination') == best_combination:
                    benchmark_score = group.get('benchmark_score', 0)
                    break
        else:
            # Lấy benchmark score từ dữ liệu hardcode nếu có
            benchmark_score = 0
            if major_name in universities_by_major:
                for uni in universities_by_major[major_name]:
                    if uni.get('combination') == best_combination:
                        benchmark_score = uni.get('benchmark_score', 0)
                        break
            
        # Đánh giá mức độ an toàn
        if total_score > benchmark_score + 2:
            safety_level = "An toàn"
        elif total_score > benchmark_score:
            safety_level = "Cân nhắc"
        else:
            safety_level = "Khó khăn"
                
        # Tạo danh sách trường phù hợp
        suitable_universities = []
        
        # Nếu có major_info thì thêm thông tin trường
        if major_info and 'universities' in major_info:
            for uni in major_info.get('universities', [])[:5]:  # Chỉ lấy tối đa 5 trường
                uni_name = uni.get('name', '')
                uni_code = uni.get('code', '')
                
                # Đảm bảo uni_name có cả mã trường
                if uni_code and uni_code not in uni_name:
                    uni_name = f"{uni_code} - {uni_name}"
                
                # Thêm trường vào danh sách
                suitable_universities.append({
                    'university_name': uni_name,
                    'combination': best_combination,
                    'benchmark_score': uni.get('benchmark_score', 0),
                    'student_score': total_score,
                    'safety_level': safety_level
                })
        
        # Nếu không có trường nào từ DB, thêm từ dữ liệu hardcode
        if not suitable_universities and major_name in universities_by_major:
            for uni in universities_by_major[major_name]:
                suitable_universities.append({
                    'university_name': uni['university_name'],
                    'combination': uni['combination'],
                    'benchmark_score': uni['benchmark_score'],
                    'student_score': total_score,
                    'safety_level': safety_level
                })
        
        # Nếu vẫn không có trường nào, thêm trường mặc định
        if not suitable_universities:
            suitable_universities = [{
                'university_name': 'ĐH Quốc Gia Hà Nội',
                'combination': best_combination,
                'benchmark_score': 22.0,
                'student_score': total_score,
                'safety_level': 'An toàn'
            }]
        
        # Tạo đối tượng recommendation
        recommendation = {
            'major_name': major_name,
            'confidence': confidence,
            'category': category,
            'matching_interests': matching_interests,
            'description': description,
            'best_combination': best_combination,
            'student_score': total_score,
            'suitable_universities': suitable_universities
        }
        
        recommendations.append(recommendation)
    
    print(f"Đã tạo xong {len(recommendations)} khuyến nghị")
    return recommendations 