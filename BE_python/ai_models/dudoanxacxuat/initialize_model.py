import os
import tensorflow as tf
import numpy as np

# Thư mục chứa mô hình - sử dụng đường dẫn tuyệt đối
current_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(current_dir, 'models')

def check_model_exists():
    """Kiểm tra xem mô hình đã tồn tại chưa"""
    model_path = os.path.join(MODEL_DIR, 'admission_probability_model.h5')
    scaler_mean_path = os.path.join(MODEL_DIR, 'scaler_mean.npy')
    scaler_scale_path = os.path.join(MODEL_DIR, 'scaler_scale.npy')
    features_path = os.path.join(MODEL_DIR, 'features.txt')
    
    return (
        os.path.exists(model_path) and
        os.path.exists(scaler_mean_path) and
        os.path.exists(scaler_scale_path) and
        os.path.exists(features_path)
    )

def initialize_model():
    """Kiểm tra xem mô hình đã tồn tại chưa và hiển thị thông báo trạng thái"""
    # Đảm bảo thư mục models tồn tại
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
        print(f"Đã tạo thư mục {MODEL_DIR}")
    
    # Kiểm tra xem mô hình đã tồn tại chưa
    if check_model_exists():
        print("Mô hình dự đoán đã tồn tại, sẵn sàng sử dụng!")
        return True
    else:
        print("Lưu ý: Mô hình dự đoán chưa tồn tại. Xin vui lòng chạy neural_network_model.py để tạo mô hình!")
        # Không tự động tạo mô hình giả nữa, chỉ báo lỗi
        return False

if __name__ == "__main__":
    initialize_model() 