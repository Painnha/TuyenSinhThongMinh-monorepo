import os
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import StandardScaler
import argparse

# Đường dẫn đến thư mục chứa mô hình
MODEL_DIR = 'models'

def load_model_and_scaler():
    """
    Tải mô hình và scaler đã lưu
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

def predict_from_csv(input_file, model, scaler, features):
    """
    Dự đoán xác suất trúng tuyển cho nhiều học sinh từ file CSV
    """
    try:
        # Đọc dữ liệu
        df = pd.read_csv(input_file)
        print(f"Đã đọc file {input_file} thành công. Số dòng: {len(df)}")
        
        # Kiểm tra các cột cần thiết
        required_columns = [
            'Điểm học sinh', 'Điểm chuẩn trung bình', 'Điểm chuẩn dự kiến',
            'Chỉ tiêu', 'q0', 'Market trend', 'Xu hướng điểm chuẩn'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"Lỗi: Thiếu các cột sau trong file CSV: {', '.join(missing_columns)}")
            return None
        
        # Tính chênh lệch điểm nếu chưa có
        if 'Chênh lệch điểm' not in df.columns:
            df['Chênh lệch điểm'] = df['Điểm học sinh'] - df['Điểm chuẩn dự kiến']
        
        # Chuẩn bị dữ liệu đầu vào
        X = df[features].values
        
        # Áp dụng chuẩn hóa
        scaler_mean, scaler_scale = scaler
        X_scaled = (X - scaler_mean) / scaler_scale
        
        # Dự đoán
        probabilities = model.predict(X_scaled, verbose=0).flatten()
        
        # Thêm kết quả dự đoán vào DataFrame
        df['Xác suất trúng tuyển (dự đoán)'] = probabilities
        
        # Lưu kết quả
        output_file = input_file.replace('.csv', '_predictions.csv')
        df.to_csv(output_file, index=False)
        
        print(f"Đã lưu kết quả dự đoán vào file {output_file}")
        
        return df
    
    except Exception as e:
        print(f"Lỗi khi dự đoán từ file CSV: {e}")
        return None

def interactive_prediction(model, scaler):
    """
    Cho phép người dùng nhập dữ liệu và dự đoán tương tác
    """
    print("\n=== NHẬP THÔNG TIN ĐỂ DỰ ĐOÁN XÁC SUẤT TRÚNG TUYỂN ===")
    
    try:
        student_score = float(input("Điểm của học sinh: "))
        average_score = float(input("Điểm chuẩn trung bình: "))
        expected_score = float(input("Điểm chuẩn dự kiến: "))
        quota = float(input("Chỉ tiêu: "))
        q0 = float(input("q0 (chỉ tiêu trung bình): "))
        market_trend = float(input("Market trend (xu hướng thị trường): "))
        score_trend = float(input("Xu hướng điểm chuẩn: "))
        
        probability = predict_single_student(
            student_score, average_score, expected_score,
            quota, q0, market_trend, score_trend,
            model, scaler
        )
        
        print(f"\nKết quả dự đoán:")
        print(f"Điểm của học sinh: {student_score}")
        print(f"Điểm chuẩn dự kiến: {expected_score}")
        print(f"Chênh lệch điểm: {student_score - expected_score}")
        print(f"Xác suất trúng tuyển: {probability:.4f} ({probability*100:.2f}%)")
        
        # Phân loại kết quả
        if probability >= 0.8:
            print("Đánh giá: Khả năng trúng tuyển rất cao")
        elif probability >= 0.6:
            print("Đánh giá: Khả năng trúng tuyển cao")
        elif probability >= 0.4:
            print("Đánh giá: Khả năng trúng tuyển trung bình")
        elif probability >= 0.2:
            print("Đánh giá: Khả năng trúng tuyển thấp")
        else:
            print("Đánh giá: Khả năng trúng tuyển rất thấp")
        
    except ValueError as e:
        print(f"Lỗi: Vui lòng nhập số hợp lệ - {e}")
    except Exception as e:
        print(f"Lỗi: {e}")

def main():
    parser = argparse.ArgumentParser(description='Dự đoán xác suất trúng tuyển')
    parser.add_argument('-f', '--file', help='Đường dẫn đến file CSV chứa dữ liệu cần dự đoán')
    parser.add_argument('-i', '--interactive', action='store_true', help='Chế độ nhập liệu tương tác')
    args = parser.parse_args()
    
    # Tải mô hình và scaler
    model, scaler, features = load_model_and_scaler()
    if model is None:
        return
    
    if args.file:
        # Dự đoán từ file CSV
        predict_from_csv(args.file, model, scaler, features)
    elif args.interactive:
        # Chế độ tương tác
        interactive_prediction(model, scaler)
    else:
        # Không có tham số, hiển thị hướng dẫn
        print("Vui lòng chọn một trong các chế độ sau:")
        print("  -f, --file FILE      Dự đoán từ file CSV")
        print("  -i, --interactive    Chế độ nhập liệu tương tác")
        print("\nVí dụ:")
        print("  python predict_admission.py -f new/du_lieu_can_du_doan.csv")
        print("  python predict_admission.py -i")

if __name__ == "__main__":
    main() 