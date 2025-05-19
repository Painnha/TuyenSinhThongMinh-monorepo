import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam, SGD
from sklearn.preprocessing import StandardScaler
import os
import sys

# Thêm đường dẫn gốc vào sys.path để có thể import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

# Thư mục lưu mô hình - sử dụng đường dẫn tuyệt đối
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

def build_model(input_dim):
    """
    Xây dựng mô hình mạng nơ-ron
    """
    model = Sequential([
        # Mô hình đơn giản hơn nhiều, không có BatchNorm
        Dense(16, activation='relu', input_shape=(input_dim,), 
              kernel_initializer='glorot_uniform'),
        Dropout(0.5),  
        
        Dense(8, activation='relu',
              kernel_initializer='glorot_uniform'),
        
        Dense(1, activation='sigmoid')
    ])
    
   
    model.compile(
        optimizer=SGD(learning_rate=0.01),
        loss='mean_squared_error',
        metrics=['mean_absolute_error', 'mean_squared_error']
    )
    
    return model

def load_prediction_model():
    """
    Tải mô hình đã được huấn luyện
    """
    model_path = os.path.join(MODEL_DIR, 'admission_probability_model.h5')
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Không tìm thấy file mô hình tại {model_path}")
    
    # Tải mô hình
    model = load_model(model_path)
    
    # Tải scaler
    scaler_mean_path = os.path.join(MODEL_DIR, 'scaler_mean.npy')
    scaler_scale_path = os.path.join(MODEL_DIR, 'scaler_scale.npy')
    
    if not os.path.exists(scaler_mean_path) or not os.path.exists(scaler_scale_path):
        raise FileNotFoundError("Không tìm thấy file scaler")
    
    scaler = StandardScaler()
    scaler.mean_ = np.load(scaler_mean_path)
    scaler.scale_ = np.load(scaler_scale_path)
    
    # Tải danh sách đặc trưng
    features_path = os.path.join(MODEL_DIR, 'features.txt')
    if not os.path.exists(features_path):
        raise FileNotFoundError("Không tìm thấy file features.txt")
    
    with open(features_path, 'r', encoding='utf-8') as f:
        features = [line.strip() for line in f.readlines()]
    
    return model, scaler, features

def predict_admission_probability(student_data):
    """
    Dự đoán xác suất trúng tuyển dựa trên dữ liệu đầu vào
    
    Args:
        student_data: dict hoặc DataFrame chứa thông tin của học sinh
            Phải có các trường: 'Điểm học sinh', 'Điểm chuẩn trung bình', 'Điểm chuẩn dự kiến', 
            'Chỉ tiêu', 'q0', 'Market trend', 'Xu hướng điểm chuẩn'
    
    Returns:
        float: Xác suất trúng tuyển (0-1)
    """
    try:
        # Tải mô hình, scaler và features
        model, scaler, features = load_prediction_model()
        
        # Chuyển đổi dữ liệu đầu vào
        if isinstance(student_data, dict):
            input_df = pd.DataFrame([student_data])
        else:
            input_df = student_data
        
        # Tính chênh lệch điểm nếu chưa có
        if 'Chênh lệch điểm' not in input_df.columns:
            input_df['Chênh lệch điểm'] = input_df['Điểm học sinh'] - input_df['Điểm chuẩn dự kiến']
        
        # Kiểm tra đầy đủ thông tin
        for feature in features:
            if feature not in input_df.columns:
                raise ValueError(f"Dữ liệu đầu vào thiếu trường '{feature}'")
        
        # Chuẩn hóa đặc trưng
        X = input_df[features].values
        X_scaled = scaler.transform(X)
        
        # Dự đoán
        probabilities = model.predict(X_scaled).flatten()
        
        # Trả về kết quả
        if len(probabilities) == 1:
            return float(probabilities[0])
        else:
            return probabilities.tolist()
    except Exception as e:
        print(f"Lỗi khi dự đoán: {e}")
        raise 