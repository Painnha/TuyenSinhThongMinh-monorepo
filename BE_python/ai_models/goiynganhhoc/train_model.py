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
    """
    Cân bằng dataset để tránh overfitting do dữ liệu không cân bằng
    
    Args:
        X: Ma trận đặc trưng
        y: Ma trận nhãn
        threshold: Ngưỡng để lọc bỏ mẫu không có nhãn
        
    Returns:
        X, y đã được cân bằng
    """
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
    """
    Tạo dữ liệu huấn luyện giả khi không có dữ liệu thực
    
    Args:
        X: Ma trận đặc trưng gốc
        y: Ma trận nhãn gốc
        
    Returns:
        X_synthetic, y_synthetic: Dữ liệu giả
    """
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
    num_interests = num_features - 11 - (num_features - num_interests)
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

def calculate_class_weights(y_train):
    """
    Tính toán class weights cho từng ngành dựa trên tỷ lệ mất cân bằng
    
    Args:
        y_train: Ma trận nhãn
        
    Returns:
        Dictionary chứa class weights cho mỗi ngành
    """
    print("Tính toán class weights cho từng ngành học...")
    class_weights = {}
    
    for i in range(y_train.shape[1]):
        # Đếm số mẫu dương/âm cho ngành này
        pos_count = np.sum(y_train[:, i] > 0)
        neg_count = len(y_train) - pos_count
        
        if pos_count > 0:
            # Tính trọng số: càng ít mẫu dương, trọng số càng cao
            weight = neg_count / pos_count
            # Giới hạn weight để tránh quá cao
            weight = min(weight, 50.0)  # Giới hạn tối đa là 50
            
            # Áp dụng trọng số cho binary crossentropy
            class_weights[f'output_{i}'] = {0: 1.0, 1: weight}
        else:
            # Nếu không có mẫu dương, sử dụng trọng số mặc định
            class_weights[f'output_{i}'] = {0: 1.0, 1: 1.0}
    
    # In vài trọng số để kiểm tra - chỉ in ra 5 ngành đầu tiên để tránh spam đầu ra
    sample_weights = {key: class_weights[key] for key in list(class_weights.keys())[:5]}
    print(f"Class weights cho 5 ngành đầu tiên: {sample_weights}")
    print(f"Tổng số ngành có class weight > 1: {sum(1 for k, v in class_weights.items() if v[1] > 1)}")
    print(f"Tổng số ngành có class weight = 50 (max): {sum(1 for k, v in class_weights.items() if v[1] == 50)}")
    
    return class_weights

def prepare_multi_output_data(y_train, y_test):
    """
    Chuẩn bị dữ liệu đầu ra cho mô hình đa đầu ra
    
    Args:
        y_train: Ma trận nhãn tập huấn luyện
        y_test: Ma trận nhãn tập kiểm tra
        
    Returns:
        y_train_dict, y_test_dict: Dictionary chứa dữ liệu đầu ra cho mô hình đa đầu ra
    """
    print("Chuẩn bị dữ liệu cho mô hình đa đầu ra...")
    
    # Chuẩn bị dữ liệu huấn luyện đầu ra
    y_train_dict = {}
    for i in range(y_train.shape[1]):
        y_train_dict[f'output_{i}'] = (y_train[:, i] > 0).astype(float).reshape(-1, 1)
    
    # Tương tự cho tập kiểm tra
    y_test_dict = {}
    for i in range(y_test.shape[1]):
        y_test_dict[f'output_{i}'] = (y_test[:, i] > 0).astype(float).reshape(-1, 1)
    
    return y_train_dict, y_test_dict

def plot_training_history(history, save_path=None):
    """
    Vẽ biểu đồ lịch sử huấn luyện
    
    Args:
        history: Đối tượng History từ model.fit()
        save_path: Đường dẫn để lưu biểu đồ (nếu có)
    """
    plt.figure(figsize=(10, 6))
    
    # Chỉ vẽ loss
    plt.plot(history.history['loss'], label='Training Loss')
    if 'val_loss' in history.history:
        plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Loss Over Epochs')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path)
        print(f"Đã lưu biểu đồ huấn luyện tại: {save_path}")
    else:
        plt.show()

def save_model_mappings(preprocessor, version):
    """
    Lưu các mapping đã sử dụng khi train vào collection model_mappings
    
    Args:
        preprocessor: DataPreprocessor đã sử dụng
        version: Phiên bản của mô hình
    """
    # Chuyển đổi các key số nguyên thành string
    id_to_major_str = {str(k): v for k, v in preprocessor.id_to_major.items()}
    
    # Tạo dictionary với các mapping
    mappings = {
        "model_name": "major_recommendation",
        "version": version,
        "mappings": {
            "version": version,
            "id_to_major": id_to_major_str,
            "interest_to_id": preprocessor.interest_to_id,
            "subject_comb_to_id": preprocessor.subject_comb_to_id,
            "scores_order": preprocessor.subjects,
            "created_at": datetime.datetime.now().isoformat()
        },
        "active": True,
        "created_at": datetime.datetime.now()
    }
    
    # Kiểm tra xem đã có mapping cho mô hình chưa
    existing_mapping = db_client.fetch_data(
        'model_mappings', 
        query={"model_name": "major_recommendation", "active": True}
    )
    
    if existing_mapping:
        # Cập nhật mapping hiện có - đặt active=False cho các phiên bản cũ
        db_client.update_many(
            'model_mappings',
            {"model_name": "major_recommendation"},
            {"$set": {"active": False}}
        )
        
        # Thêm mapping mới
        db_client.insert_one('model_mappings', mappings)
        print(f"Đã cập nhật mapping và đặt phiên bản cũ thành không hoạt động")
    else:
        # Tạo mapping mới
        db_client.insert_one('model_mappings', mappings)
        print(f"Đã tạo mapping mới trong collection model_mappings")
    
    # Lưu mapping vào file JSON trong thư mục model
    mappings_path = os.path.join(MODEL_PATH, 'mappings.json')
    with open(mappings_path, 'w', encoding='utf-8') as f:
        json.dump(mappings['mappings'], f, ensure_ascii=False, indent=2, cls=NpEncoder)
    
    print(f"Đã lưu mapping vào file {mappings_path}")
    
    return mappings

def train_model(use_multi_output=True):
    """
    Huấn luyện mô hình gợi ý ngành học
    
    Args:
        use_multi_output: Có sử dụng kiến trúc đa đầu ra hay không
        
    Returns:
        model: Mô hình đã được huấn luyện
        history: Lịch sử huấn luyện
        preprocessor: DataPreprocessor đã sử dụng
        X_test_scaled: Dữ liệu kiểm tra đã được chuẩn hóa
        y_test: Nhãn kiểm tra
    """
    # Tạo version với timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    model_version = f"1.0.0_{timestamp}"
    
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
    print(f"Kích thước dữ liệu: {len(X)} mẫu")
    
    # Giới hạn số lượng mẫu nếu cần
    max_samples = 10000  # Số lượng mẫu tối đa
    if len(X) > max_samples:
        print(f"Giới hạn số lượng mẫu xuống {max_samples}...")
        indices = np.arange(len(X))
        np.random.seed(42)
        np.random.shuffle(indices)
        indices = indices[:max_samples]
        X = X[indices]
        y = y[indices]
    
    # Cân bằng dataset để tránh overfitting
    X, y = balance_dataset(X, y)
    print(f"Kích thước sau khi cân bằng: {X.shape}")
    
    # Chia tập train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Kích thước tập train: {len(X_train)}")
    print(f"Kích thước tập test: {len(X_test)}")
    
    # Chuẩn hóa dữ liệu
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Tạo mô hình
    input_dim = X_train.shape[1]
    output_dim = y_train.shape[1]
    print(f"Đang khởi tạo mô hình với {input_dim} đặc trưng và {output_dim} ngành học")
    
    model = MajorRecommendationModel(
        input_dim=input_dim,
        output_dim=output_dim,
        use_multi_output=use_multi_output
    )
    
    # Callbacks cho huấn luyện
    early_stopping = tf.keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=5,
        restore_best_weights=True,
        verbose=1
    )
    
    reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=3,
        min_lr=0.00001,
        verbose=1
    )
    
    callbacks = [early_stopping, reduce_lr]
    
    # Huấn luyện mô hình - phương pháp khác nhau tùy theo kiến trúc
    if use_multi_output:
        print("Sử dụng kiến trúc đa đầu ra với trọng số tùy chỉnh cho từng ngành")
        
        # Tính class weights cho từng ngành
        class_weights = calculate_class_weights(y_train)
        
        # Chuẩn bị dữ liệu cho mô hình đa đầu ra
        y_train_dict, y_test_dict = prepare_multi_output_data(y_train, y_test)
        
        # Compile mô hình với class weights
        model.compile_model(class_weights=class_weights)
        
        # Huấn luyện mô hình
        history = model.train(
            X_train_scaled,
            y_train_dict,
            X_val=X_test_scaled,
            y_val=y_test_dict,
            epochs=50,
            batch_size=32,
            callbacks=callbacks,
            verbose=2
        )
    else:
        print("Sử dụng kiến trúc đơn đầu ra truyền thống")
        
        # Compile mô hình
        model.compile_model()
        
        # Huấn luyện mô hình
        history = model.train(
            X_train_scaled,
            y_train,
            X_val=X_test_scaled,
            y_val=y_test,
            epochs=50,
            batch_size=32,
            callbacks=callbacks,
            verbose=2
        )
    
    # Vẽ và lưu biểu đồ lịch sử huấn luyện
    history_path = os.path.join(MODEL_PATH, 'training_history.png')
    plot_training_history(history, save_path=history_path)
    
    # Lưu mô hình
    
    model_path = os.path.join(MODEL_PATH, f'major_recommendation_model.h5')
    print(f"Đang lưu mô hình tại: {model_path}")
    model.save(model_path)
    model_path = os.path.join(MODEL_PATH, f'major_recommendation_model_{timestamp}.h5')
    model.save(model_path)
    # Lưu scaler
    np.save(os.path.join(MODEL_PATH, 'scaler_mean.npy'), scaler.mean_)
    np.save(os.path.join(MODEL_PATH, 'scaler_scale.npy'), scaler.scale_)
    
    # Lưu mapping dictionary và lưu vào MongoDB
    save_model_mappings(preprocessor, model_version)
    
    # Cập nhật cấu hình mô hình trong MongoDB
    model_config = {
        "modelName": "major_recommendation",
        "version": model_version,
        "parameters": {
            "input_dim": input_dim,
            "output_dim": output_dim,
            "num_interests": len(preprocessor.interest_to_id),
            "training_samples": len(X_train),
            "training_date": datetime.datetime.now().isoformat(),
            "architecture_type": "multi_output" if use_multi_output else "single_output"
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
    
    # Kiểm tra xem đã có cấu hình cho mô hình chưa
    existing_config = db_client.fetch_data(
        'model_configs', 
        query={"modelName": "major_recommendation", "active": True}
    )
    
    if existing_config:
        # Đặt tất cả các cấu hình hiện có thành không hoạt động
        db_client.update_many(
            'model_configs',
            {"modelName": "major_recommendation"},
            {"$set": {"active": False}}
        )
        
        # Tạo cấu hình mới
        db_client.insert_one('model_configs', model_config)
        print("Đã tạo cấu hình mô hình mới và đặt phiên bản cũ thành không hoạt động")
    else:
        # Tạo cấu hình mới
        db_client.insert_one('model_configs', model_config)
        print("Đã tạo cấu hình mô hình mới trong MongoDB")
    
    print("Hoàn tất huấn luyện mô hình!")
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
    # Sử dụng mô hình đa đầu ra theo mặc định
    train_model(use_multi_output=True)