import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import os
import sys
from datetime import datetime

# Thêm đường dẫn gốc vào sys.path để có thể import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
# Import MongoDBClient từ utils
from BE_python.utils.db_utils import db_client

# Thư mục lưu mô hình - sử dụng đường dẫn tuyệt đối
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

def load_training_data():
    """
    Tải dữ liệu huấn luyện từ MongoDB hoặc file CSV
    """
    print("Đang tải dữ liệu huấn luyện...")
    
    # Thử tải từ file CSV trước
    csv_path = os.path.join(MODEL_DIR, 'training_data.csv')
    if os.path.exists(csv_path):
        print(f"Đang đọc dữ liệu huấn luyện từ file {csv_path}")
        return pd.read_csv(csv_path)
    
    # Nếu không có file CSV, tìm trong MongoDB
    print("Không tìm thấy file CSV, đang truy vấn MongoDB...")
    try:
        # Sử dụng db_client để truy vấn MongoDB
        training_record = db_client.fetch_data('training_data', 
            query={'modelType': 'admission_probability'},
            limit=1
        )
        
        if not training_record or len(training_record) == 0 or 'records' not in training_record[0]:
            print("Không tìm thấy dữ liệu huấn luyện trong MongoDB.")
            return None
        
        print(f"Đã tìm thấy {len(training_record[0]['records'])} bản ghi dữ liệu huấn luyện trong MongoDB")
        return pd.DataFrame(training_record[0]['records'])
    except Exception as e:
        print(f"Lỗi khi truy vấn MongoDB: {e}")
        return None

def preprocess_data(df):
    """
    Tiền xử lý dữ liệu huấn luyện
    """
    # Xóa các dòng có giá trị NaN trong các cột quan trọng
    df = df.dropna(subset=[
        'Điểm học sinh', 'Điểm chuẩn trung bình', 'Điểm chuẩn dự kiến', 
        'Chỉ tiêu', 'q0', 'Market trend', 'Xu hướng điểm chuẩn', 
        'Xác suất trúng tuyển'
    ])
    
    # Tính chênh lệch điểm nếu chưa có
    if 'Chênh lệch điểm' not in df.columns:
        df['Chênh lệch điểm'] = df['Điểm học sinh'] - df['Điểm chuẩn dự kiến']
    
    # Chọn các đặc trưng (features) và nhãn (label)
    features = [
        'Điểm học sinh', 'Điểm chuẩn trung bình', 'Điểm chuẩn dự kiến', 
        'Chênh lệch điểm', 'Chỉ tiêu', 'q0', 'Market trend', 'Xu hướng điểm chuẩn'
    ]
    label = 'Xác suất trúng tuyển'
    
    X = df[features].values
    y = df[label].values
    
    # Chuẩn hóa đặc trưng
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Chia dữ liệu thành tập huấn luyện và tập kiểm tra
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    return X_train, X_test, y_train, y_test, scaler, features

def build_model(input_dim):
    """
    Xây dựng mô hình mạng nơ-ron
    """
    model = Sequential([
        Dense(64, activation='relu', input_shape=(input_dim,)),
        BatchNormalization(),
        Dropout(0.3),
        
        Dense(32, activation='relu'),
        BatchNormalization(),
        Dropout(0.2),
        
        Dense(16, activation='relu'),
        BatchNormalization(),
        Dropout(0.1),
        
        Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['mean_absolute_error', 'mean_squared_error']
    )
    
    return model

def train_model(X_train, y_train, X_test, y_test):
    """
    Huấn luyện mô hình
    """
    input_dim = X_train.shape[1]
    model = build_model(input_dim)
    
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience=20,
        restore_best_weights=True
    )
    
    model_checkpoint = ModelCheckpoint(
        filepath=os.path.join(MODEL_DIR, 'best_model.h5'),
        monitor='val_loss',
        save_best_only=True
    )
    
    history = model.fit(
        X_train, y_train,
        epochs=100,
        batch_size=32,
        validation_data=(X_test, y_test),
        callbacks=[early_stopping, model_checkpoint],
        verbose=1
    )
    
    return model, history

def evaluate_model(model, X_test, y_test):
    """
    Đánh giá hiệu suất mô hình
    """
    results = model.evaluate(X_test, y_test)
    print(f"Test Loss: {results[0]}")
    print(f"Test MAE: {results[1]}")
    print(f"Test MSE: {results[2]}")
    
    # Dự đoán trên tập kiểm tra
    y_pred = model.predict(X_test)
    
    # Tính các chỉ số đánh giá
    mse = np.mean((y_test - y_pred.flatten()) ** 2)
    rmse = np.sqrt(mse)
    mae = np.mean(np.abs(y_test - y_pred.flatten()))
    
    print(f"RMSE: {rmse}")
    print(f"MAE: {mae}")
    
    return y_pred

def plot_results(history, y_test, y_pred):
    """
    Vẽ biểu đồ kết quả huấn luyện
    """
    # Biểu đồ loss
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 2, 1)
    plt.plot(history.history['loss'], label='Train Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Loss qua các epoch')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    
    # Biểu đồ dự đoán vs thực tế
    plt.subplot(1, 2, 2)
    plt.scatter(y_test, y_pred, alpha=0.5)
    plt.plot([0, 1], [0, 1], 'r--')
    plt.xlabel('Xác suất thực tế')
    plt.ylabel('Xác suất dự đoán')
    plt.title('So sánh giá trị dự đoán và thực tế')
    
    plt.tight_layout()
    plt.savefig(os.path.join(MODEL_DIR, 'training_results.png'))
    plt.close()

def save_model(model, scaler, features, training_metrics):
    """
    Lưu mô hình và cập nhật thông tin vào MongoDB
    """
    # Lưu mô hình
    model_path = os.path.join(MODEL_DIR, 'admission_probability_model.h5')
    model.save(model_path)
    
    # Lưu scaler
    np.save(os.path.join(MODEL_DIR, 'scaler_mean.npy'), scaler.mean_)
    np.save(os.path.join(MODEL_DIR, 'scaler_scale.npy'), scaler.scale_)
    
    # Lưu danh sách đặc trưng
    with open(os.path.join(MODEL_DIR, 'features.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(features))
    
    # Cập nhật thông tin mô hình trong MongoDB
    model_config = {
        'modelName': 'admission_probability',
        'version': '1.0.0',
        'parameters': {
            'input_dim': model.layers[0].input_shape[1],
            'output_dim': model.layers[-1].output_shape[1],
            'training_samples': training_metrics.get('training_samples', 0),
            'validation_mae': float(training_metrics.get('mae', 0)),
            'training_date': datetime.now().isoformat()
        },
        'featureMapping': {
            'subjects': ['Toan', 'NguVan', 'VatLy', 'HoaHoc', 'SinhHoc', 'LichSu', 'DiaLy', 'GDCD', 'NgoaiNgu'],
            'priorityAreas': {
                'KV1': 0.75,
                'KV2': 0.5,
                'KV3': 0.25
            },
            'prioritySubjects': {
                '01': 0.1, '02': 0.2, '03': 0.3, '04': 0.4, '05': 0.5, '06': 0.6, '07': 0.7
            }
        },
        'active': True,
        'createdAt': datetime.now(),
        'updatedAt': datetime.now()
    }
    
    # Sử dụng db_client để cập nhật hoặc thêm mới cấu hình mô hình
    try:
        db_client.update_one(
            'model_configs',
            {'modelName': 'admission_probability'},
            {'$set': model_config}
        )
        print(f"Đã lưu mô hình vào {model_path} và cập nhật thông tin vào MongoDB")
    except Exception as e:
        print(f"Lỗi khi cập nhật thông tin mô hình vào MongoDB: {e}")
        print(f"Đã lưu mô hình vào {model_path} nhưng chưa cập nhật được thông tin")

def main():
    """
    Hàm chính thực hiện toàn bộ quy trình huấn luyện mô hình
    """
    # Tải dữ liệu huấn luyện
    df = load_training_data()
    
    if df is None or df.empty:
        print("Lỗi: Không có dữ liệu huấn luyện, cần chạy training_data_creator.py trước")
        return
    
    print(f"Đã tải dữ liệu huấn luyện: {len(df)} mẫu")
    
    # Tiền xử lý dữ liệu
    X_train, X_test, y_train, y_test, scaler, features = preprocess_data(df)
    
    # Huấn luyện mô hình
    model, history = train_model(X_train, y_train, X_test, y_test)
    
    # Đánh giá mô hình
    y_pred = evaluate_model(model, X_test, y_test)
    
    # Tính MAE cho báo cáo
    mae = np.mean(np.abs(y_test - y_pred.flatten()))
    
    # Vẽ biểu đồ kết quả
    plot_results(history, y_test, y_pred)
    
    # Lưu mô hình và cập nhật thông tin
    training_metrics = {
        'training_samples': len(df),
        'mae': mae
    }
    save_model(model, scaler, features, training_metrics)
    
    print("Hoàn thành huấn luyện và đánh giá mô hình!")

if __name__ == "__main__":
    main() 