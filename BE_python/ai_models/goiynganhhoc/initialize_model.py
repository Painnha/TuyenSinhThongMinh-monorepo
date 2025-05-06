import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
import sys

def initialize_model():
    """
    Khởi tạo mô hình đã được đào tạo và bộ chuẩn hóa scaler
    
    Returns:
        True nếu khởi tạo thành công, False nếu không
    """
    model_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(model_dir, 'model', 'major_recommendation_model.h5')
    scaler_mean_path = os.path.join(model_dir, 'model', 'scaler_mean.npy')
    scaler_scale_path = os.path.join(model_dir, 'model', 'scaler_scale.npy')
    
    # Kiểm tra xem các file mô hình và scaler đã tồn tại chưa
    if os.path.exists(model_path) and os.path.exists(scaler_mean_path) and os.path.exists(scaler_scale_path):
        print("Mô hình gợi ý ngành học đã tồn tại, sẵn sàng sử dụng!")
        return True
    else:
        print(f"Không tìm thấy mô hình gợi ý ngành học tại: {model_path}")
        print("Cần đào tạo hoặc tải mô hình trước khi sử dụng.")
        return False 