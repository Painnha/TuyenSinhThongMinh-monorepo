import os
import sys
import numpy as np
import tensorflow as tf
import pandas as pd
import json
import datetime
from sklearn.model_selection import train_test_split
from bson import ObjectId
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from tensorflow import keras

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.db_utils import db_client
from ai_models.goiynganhhoc.data_preprocessing import DataPreprocessor
# Sử dụng mô hình từ neural_network.py
from ai_models.goiynganhhoc.neural_network import MajorRecommendationModel

# Đường dẫn để lưu mô hình
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, 'model')

class NpEncoder(json.JSONEncoder):
    """Hỗ trợ encode numpy types sang JSON"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, ObjectId):
            return str(obj)
        return super(NpEncoder, self).default(obj)

def balance_dataset(X, y, threshold=0.5):
    """Cân bằng dataset để tránh overfitting do dữ liệu không cân bằng"""
    print("Đang cân bằng dataset...")
    
    # Tìm các mẫu có ít nhất một nhãn > 0
    valid_samples = np.sum(y > 0, axis=1) > 0
    
    if np.mean(valid_samples) < threshold:
        print(f"Cảnh báo: {np.sum(~valid_samples)} mẫu không có nhãn (chiếm {(1-np.mean(valid_samples))*100:.2f}%)")
        
        # Nếu không có mẫu hợp lệ nào, cần tạo dữ liệu giả
        if np.sum(valid_samples) == 0:
            print("Không tìm thấy mẫu hợp lệ nào! Đang tạo dữ liệu huấn luyện giả...")
            return create_synthetic_data(X, y)
        
        # Chỉ giữ lại các mẫu có ít nhất một nhãn
        X = X[valid_samples]
        y = y[valid_samples]
        print(f"Sau khi lọc: {X.shape[0]} mẫu")
    
    # Kiểm tra số lượng mẫu cho mỗi ngành
    major_counts = np.sum(y > 0, axis=0)
    
    # In ra thông tin về phân bố ngành
    print(f"Số lượng ngành có ít nhất 1 mẫu: {np.sum(major_counts > 0)}/{y.shape[1]}")
    print(f"Trung bình số mẫu mỗi ngành: {np.mean(major_counts[major_counts>0]):.2f}")
    print(f"Ngành có nhiều mẫu nhất: {np.max(major_counts)} mẫu")
    
    if np.sum(major_counts > 0) > 0:
        print(f"Ngành có ít mẫu nhất (trong số có mẫu): {np.min(major_counts[major_counts>0])} mẫu")
    
    return X, y

def create_synthetic_data(X, y):
    """Tạo dữ liệu huấn luyện giả khi không có dữ liệu thực"""
    print("Tạo dữ liệu tổng hợp để huấn luyện mô hình...")
    
    num_samples = 1000  # Số lượng mẫu giả
    num_features = X.shape[1]
    num_majors = y.shape[1]
    
    # Tạo ma trận đặc trưng ngẫu nhiên
    X_synthetic = np.zeros((num_samples, num_features))
    
    # Tạo điểm số môn học ngẫu nhiên (9 đặc trưng đầu tiên)
    X_synthetic[:, :9] = np.random.uniform(0.5, 1.0, size=(num_samples, 9))
    
    # Tạo khối thi ngẫu nhiên (2 đặc trưng tiếp theo)
    khoi_thi = np.random.choice([0, 1], size=(num_samples, 2))
    X_synthetic[:, 9:11] = khoi_thi
    
    # Tạo sở thích ngẫu nhiên (mỗi mẫu có 1-3 sở thích)
    num_interests = num_features - 11 - (y.shape[1] - num_majors)
    for i in range(num_samples):
        num_interests_per_sample = np.random.randint(1, 4)  # Mỗi học sinh có 1-3 sở thích
        interest_indices = np.random.choice(num_interests, size=num_interests_per_sample, replace=False)
        X_synthetic[i, 11:11+num_interests][interest_indices] = 1
    
    # Tạo tổ hợp môn ngẫu nhiên (mỗi mẫu có 1-2 tổ hợp)
    num_subject_groups = num_features - 11 - num_interests
    for i in range(num_samples):
        num_groups_per_sample = np.random.randint(1, 3)  # Mỗi học sinh chọn 1-2 tổ hợp
        group_indices = np.random.choice(num_subject_groups, size=num_groups_per_sample, replace=False)
        X_synthetic[i, 11+num_interests:][group_indices] = 1
    
    # Tạo ma trận nhãn, mỗi mẫu phù hợp với 1-3 ngành
    y_synthetic = np.zeros((num_samples, num_majors))
    for i in range(num_samples):
        num_majors_per_sample = np.random.randint(1, 4)  # Mỗi học sinh phù hợp với 1-3 ngành
        major_indices = np.random.choice(num_majors, size=num_majors_per_sample, replace=False)
        # Tạo điểm số giảm dần cho các ngành phù hợp
        scores = np.linspace(0.8, 0.5, num=num_majors_per_sample)
        y_synthetic[i, major_indices] = scores
    
    print(f"Đã tạo {num_samples} mẫu dữ liệu giả với {num_features} đặc trưng và {num_majors} ngành học")
    
    return X_synthetic, y_synthetic

def plot_training_history(history, save_path=None):
    """Vẽ biểu đồ lịch sử huấn luyện"""
    plt.figure(figsize=(12, 4))
    
    # Vẽ loss
    plt.subplot(1, 2, 1)
    plt.plot(history.history['loss'], label='Training Loss')
    if 'val_loss' in history.history:
        plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Loss Over Epochs')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    
    # Vẽ metrics
    plt.subplot(1, 2, 2)
    plt.plot(history.history['mae'], label='Training MAE')
    if 'val_mae' in history.history:
        plt.plot(history.history['val_mae'], label='Validation MAE')
    plt.title('Mean Absolute Error Over Epochs')
    plt.xlabel('Epoch')
    plt.ylabel('MAE')
    plt.legend()
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path)
        print(f"Đã lưu biểu đồ huấn luyện tại: {save_path}")
    else:
        plt.show()

def train_model():
    """Huấn luyện mô hình gợi ý ngành học với MajorRecommendationModel từ neural_network.py"""
    # Khởi tạo preprocessor
    print("Đang tải dữ liệu từ MongoDB...")
    preprocessor = DataPreprocessor()
    
    # In thông tin về kích thước đặc trưng
    print(f"Số lượng sở thích: {len(preprocessor.interest_to_id)}")
    print(f"Số lượng tổ hợp môn: {len(preprocessor.subject_comb_to_id)}")
    print(f"Số lượng ngành học: {len(preprocessor.major_to_id)}")
    
    # Tiền xử lý dữ liệu
    print("Đang tiền xử lý dữ liệu huấn luyện...")
    X, y = preprocessor.preprocess_training_data()
    
    # Cân bằng dataset để tránh overfitting
    X, y = balance_dataset(X, y)
    
    # In thông tin về kích thước dữ liệu
    print(f"Kích thước X: {X.shape}")
    print(f"Kích thước y: {y.shape}")
    
    # Chia dữ liệu thành tập huấn luyện và tập kiểm tra với tỷ lệ 20% cho tập kiểm tra
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Chuẩn hóa dữ liệu
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Lưu thông số chuẩn hóa
    scaler_mean = scaler.mean_
    scaler_scale = scaler.scale_
    
    # Tạo mô hình sử dụng MajorRecommendationModel từ neural_network.py
    model = MajorRecommendationModel(input_dim=X_train.shape[1], output_dim=y_train.shape[1])
    
    # Huấn luyện
    print("Đang huấn luyện mô hình...")
    history = model.train(
        X_train_scaled, y_train,
        X_val=X_test_scaled, y_val=y_test,
        epochs=50,
        batch_size=32
    )
    
    # Vẽ và lưu biểu đồ lịch sử huấn luyện
    history_path = os.path.join(MODEL_DIR, 'training_history.png')
    plot_training_history(history, save_path=history_path)
    
    # Lưu mô hình và scaler
    if not os.path.exists(MODEL_PATH):
        os.makedirs(MODEL_PATH)
    
    model.save(os.path.join(MODEL_PATH, "major_recommendation_model.h5"))
    np.save(os.path.join(MODEL_PATH, "scaler_mean.npy"), scaler_mean)
    np.save(os.path.join(MODEL_PATH, "scaler_scale.npy"), scaler_scale)
    
    # Cập nhật thông tin cấu hình mô hình vào MongoDB
    model_config = {
        "modelName": "major_recommendation",
        "version": "1.2.0",  # Cập nhật phiên bản
        "parameters": {
            "input_dim": X_train.shape[1],
            "output_dim": y_train.shape[1],
            "num_interests": len(preprocessor.interest_to_id),
            "training_samples": len(X_train),
            "training_date": datetime.datetime.now().isoformat()
        },
        "featureMapping": {
            "subjects": preprocessor.subjects,
            "priorityAreas": preprocessor.area_priority_map,
            "prioritySubjects": preprocessor.subject_priority_map
        },
        "active": True,
        "createdAt": datetime.datetime.now(),
        "updatedAt": datetime.datetime.now()
    }
    
    # Kiểm tra xem đã có cấu hình cho mô hình major_recommendation chưa
    existing_config = db_client.fetch_data(
        'model_configs', 
        query={"modelName": "major_recommendation", "active": True}
    )
    
    if existing_config:
        # Cập nhật cấu hình hiện có
        db_client.update_one(
            'model_configs',
            {"modelName": "major_recommendation", "active": True},
            {"$set": {
                "parameters": model_config["parameters"],
                "version": model_config["version"],
                "updatedAt": model_config["updatedAt"]
            }}
        )
        print("Đã cập nhật cấu hình mô hình trong MongoDB")
    else:
        # Tạo cấu hình mới
        db_client.insert_one('model_configs', model_config)
        print("Đã tạo cấu hình mô hình mới trong MongoDB")
    
    print("Huấn luyện mô hình hoàn tất!")
    return model, history, preprocessor, X_test_scaled, y_test

def test_major_recommendation(model, preprocessor, student_data=None):
    """Kiểm tra gợi ý ngành học cho sinh viên mẫu"""
    if student_data is None:
        # Tạo dữ liệu học sinh mẫu để test
        student_data = {
            "scores": {
                "Toan": 8.5,
                "NguVan": 7.0,
                "VatLy": 8.0,
                "HoaHoc": 7.5,
                "SinhHoc": 0.0,
                "LichSu": 0.0,
                "DiaLy": 0.0,
                "GDCD": 0.0,
                "NgoaiNgu": 9.0
            },
            "interests": ["Thiết kế", "Sáng tạo", "Công nghệ"],
            "subject_groups": ["A00", "A01"],
            "tohopthi": "TN"
        }
    
    # Tiền xử lý dữ liệu học sinh
    student_features = preprocessor.preprocess_student_data(student_data)
    student_features = np.expand_dims(student_features, axis=0)  # Thêm batch dimension
    
    # Dự đoán 
    recommendations = model.predict(student_features, top_k=5)
    
    # In kết quả
    print("\n=== Gợi ý ngành học ===")
    for idx, score in recommendations:
        major_name = preprocessor.get_major_by_id(idx)
        print(f"- {major_name}: {score:.2f}")
        
    return recommendations

if __name__ == "__main__":
    # Huấn luyện mô hình 
    model, history, preprocessor, X_test, y_test = train_model()
    
    # Test mô hình với dữ liệu mẫu
    test_major_recommendation(model, preprocessor)