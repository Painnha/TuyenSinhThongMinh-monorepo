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

# Đường dẫn đến file dữ liệu
INPUT_DIR = 'new'
DATA_FILE = os.path.join(INPUT_DIR, 'training_data_final.csv')
MODEL_DIR = 'models'
os.makedirs(MODEL_DIR, exist_ok=True)

# Đọc dữ liệu
try:
    df = pd.read_csv(DATA_FILE)
    print(f"Đã đọc file dữ liệu {DATA_FILE} thành công!")
    print(f"Số dòng dữ liệu: {len(df)}")
    print(f"Các cột dữ liệu: {', '.join(df.columns)}")
except FileNotFoundError as e:
    print(f"Lỗi: Không tìm thấy file - {e}")
    print(f"Thư mục hiện tại: {os.getcwd()}")
    exit()

# Tiền xử lý dữ liệu
def preprocess_data(df):
    # Xóa các dòng có giá trị NaN trong các cột quan trọng
    df = df.dropna(subset=['Điểm học sinh', 'Điểm chuẩn trung bình', 'Điểm chuẩn dự kiến', 
                           'Chỉ tiêu', 'q0', 'Market trend', 'Xu hướng điểm chuẩn', 
                           'Xác suất trúng tuyển'])
    
    # Tính chênh lệch điểm nếu chưa có
    if 'Chênh lệch điểm' not in df.columns:
        df['Chênh lệch điểm'] = df['Điểm học sinh'] - df['Điểm chuẩn dự kiến']
    
    # Chọn các đặc trưng (features) và nhãn (label)
    features = ['Điểm học sinh', 'Điểm chuẩn trung bình', 'Điểm chuẩn dự kiến', 
                'Chênh lệch điểm', 'Chỉ tiêu', 'q0', 'Market trend', 'Xu hướng điểm chuẩn']
    label = 'Xác suất trúng tuyển'
    
    X = df[features].values
    y = df[label].values
    
    # Chuẩn hóa đặc trưng
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Chia dữ liệu thành tập huấn luyện và tập kiểm tra
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    return X_train, X_test, y_train, y_test, scaler, features

# Xây dựng mô hình
def build_model(input_dim):
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

# Huấn luyện mô hình
def train_model(X_train, y_train, X_test, y_test):
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

# Đánh giá mô hình
def evaluate_model(model, X_test, y_test):
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

# Vẽ biểu đồ kết quả
def plot_results(history, y_test, y_pred):
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

# Lưu mô hình
def save_model(model, scaler, features):
    # Lưu mô hình
    model.save(os.path.join(MODEL_DIR, 'admission_probability_model.h5'))
    
    # Lưu thông tin về scaler
    np.save(os.path.join(MODEL_DIR, 'scaler_mean.npy'), scaler.mean_)
    np.save(os.path.join(MODEL_DIR, 'scaler_scale.npy'), scaler.scale_)
    
    # Lưu danh sách đặc trưng
    with open(os.path.join(MODEL_DIR, 'features.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(features))
    
    print(f"Đã lưu mô hình tại {MODEL_DIR}")

# Hàm dự đoán cho dữ liệu mới
def predict_admission_probability(
    student_score, 
    average_score, 
    expected_score, 
    quota, 
    q0, 
    market_trend, 
    score_trend,
    model_path=os.path.join(MODEL_DIR, 'admission_probability_model.h5')
):
    # Tính toán chênh lệch điểm
    score_diff = student_score - expected_score
    
    # Tạo dữ liệu đầu vào
    input_data = np.array([[
        student_score, average_score, expected_score, 
        score_diff, quota, q0, market_trend, score_trend
    ]])
    
    # Load scaler
    scaler_mean = np.load(os.path.join(MODEL_DIR, 'scaler_mean.npy'))
    scaler_scale = np.load(os.path.join(MODEL_DIR, 'scaler_scale.npy'))
    
    # Áp dụng chuẩn hóa
    input_scaled = (input_data - scaler_mean) / scaler_scale
    
    # Load mô hình
    model = tf.keras.models.load_model(model_path)
    
    # Dự đoán
    probability = model.predict(input_scaled)[0][0]
    
    return probability

def main():
    # Tiền xử lý dữ liệu
    X_train, X_test, y_train, y_test, scaler, features = preprocess_data(df)
    
    # Huấn luyện mô hình
    model, history = train_model(X_train, y_train, X_test, y_test)
    
    # Đánh giá mô hình
    y_pred = evaluate_model(model, X_test, y_test)
    
    # Vẽ biểu đồ kết quả
    plot_results(history, y_test, y_pred)
    
    # Lưu mô hình
    save_model(model, scaler, features)
    
    print("Hoàn thành huấn luyện và đánh giá mô hình!")

if __name__ == "__main__":
    main() 