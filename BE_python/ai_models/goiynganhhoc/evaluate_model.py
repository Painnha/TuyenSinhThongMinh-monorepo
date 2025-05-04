import os
import sys
import numpy as np
import tensorflow as tf
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import eli5
from eli5.sklearn import PermutationImportance
import shap
import json
import datetime
from tensorflow.keras.models import load_model

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ai_models.goiynganhhoc.data_preprocessing import DataPreprocessor
from ai_models.goiynganhhoc.neural_network_improved import MajorRecommendationModel
from ai_models.goiynganhhoc.train_model_adjusted import train_model_adjusted

def load_latest_model():
    """Tải mô hình mới nhất đã lưu"""
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
    
    # Kiểm tra thư mục model đã tồn tại chưa
    if not os.path.exists(model_dir):
        print(f"Thư mục {model_dir} không tồn tại.")
        return None, None
        
    # Lấy danh sách file model trong thư mục
    model_files = [f for f in os.listdir(model_dir) if f.endswith('.h5')]
    
    if not model_files:
        print("Không tìm thấy file mô hình nào.")
        return None, None
        
    # Lấy file mới nhất
    latest_model = sorted(model_files)[-1]
    model_path = os.path.join(model_dir, latest_model)
    
    print(f"Đang tải mô hình từ {model_path}...")
    model = MajorRecommendationModel.load(model_path)
    return model, model_path

def evaluate_model(model=None, preprocessor=None, X_test=None, y_test=None):
    """Đánh giá hiệu suất của mô hình và xuất kết quả ra file"""
    # Nếu không có mô hình được truyền vào, tải mô hình mới hoặc huấn luyện lại
    if model is None or preprocessor is None or X_test is None or y_test is None:
        try:
            model, model_path = load_latest_model()
            
            if model is None:
                print("Không tìm thấy mô hình đã lưu, đang huấn luyện mô hình mới...")
                model, model_path, history, preprocessor, X_test, y_test = train_model_adjusted()
            else:
                # Cần preprocessor và dữ liệu kiểm tra
                print("Đang tạo preprocessor và dữ liệu kiểm tra...")
                preprocessor = DataPreprocessor()
                X, y = preprocessor.preprocess_training_data()
                from sklearn.model_selection import train_test_split
                _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        except Exception as e:
            print(f"Lỗi khi tải/huấn luyện mô hình: {e}")
            return
    
    # File kết quả
    output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model_evaluation.txt')
    
    # Đường dẫn để lưu biểu đồ
    plots_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'plots')
    if not os.path.exists(plots_dir):
        os.makedirs(plots_dir)
    
    # Đánh giá mô hình
    print("Đang đánh giá mô hình...")
    y_pred = model.model.predict(X_test)
    
    # Tính các độ đo
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    # Ghi độ đo vào file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("====== ĐÁNH GIÁ MÔ HÌNH GỢI Ý NGÀNH HỌC ======\n\n")
        f.write(f"Thời gian đánh giá: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("=== CẤU TRÚC MÔ HÌNH ===\n")
        model.model.summary(print_fn=lambda x: f.write(x + '\n'))
        f.write("\n")
        
        f.write("=== ĐỘ ĐO HIỆU SUẤT ===\n")
        f.write(f"Mean Absolute Error (MAE): {mae:.4f}\n")
        f.write(f"Mean Squared Error (MSE): {mse:.4f}\n")
        f.write(f"Root Mean Squared Error (RMSE): {rmse:.4f}\n")
        f.write(f"R² Score: {r2:.4f}\n\n")
        
        # Phân tích mức độ ảnh hưởng của các đặc trưng
        f.write("=== PHÂN TÍCH QUAN TRỌNG CỦA CÁC ĐẶC TRƯNG ===\n")
        
        # Mô tả phân bố các đặc trưng đầu vào
        f.write("\n--- PHÂN BỐ ĐẶC TRƯNG ĐẦU VÀO ---\n")
        feature_stats = pd.DataFrame(X_test).describe().transpose()
        f.write(feature_stats.to_string())
        f.write("\n\n")
        
        # Mô tả về các đặc trưng đầu vào
        f.write("--- MÔ TẢ ĐẶC TRƯNG ĐẦU VÀO ---\n")
        total_features = X_test.shape[1]
        
        f.write(f"Tổng số đặc trưng: {total_features}\n")
        f.write(f"- Điểm môn học (9 đặc trưng): {', '.join(preprocessor.subjects)}\n")
        f.write(f"- Khối thi (2 đặc trưng): TN, XH\n")
        f.write(f"- Sở thích ({len(preprocessor.interest_to_id)} đặc trưng): {', '.join(list(preprocessor.interest_to_id.keys())[:10])}...\n")
        f.write(f"- Tổ hợp môn ({len(preprocessor.subject_comb_to_id)} đặc trưng): {', '.join(list(preprocessor.subject_comb_to_id.keys())[:10])}...\n\n")
        
        # Thông tin về ngành học đầu ra
        f.write("--- THÔNG TIN VỀ NGÀNH HỌC ĐẦU RA ---\n")
        f.write(f"Tổng số ngành học: {y_test.shape[1]}\n")
        f.write("Một số ngành học tiêu biểu:\n")
        for i in range(min(10, len(preprocessor.id_to_major))):
            f.write(f"- {preprocessor.id_to_major[i]}\n")
        f.write("...\n\n")
        
        # Phần trăm dự đoán chính xác cho top-3 ngành
        f.write("--- ĐÁNH GIÁ TOP-K NGÀNH GỢI Ý ---\n")
        for k in [1, 3, 5, 10]:
            correct_count = 0
            for i in range(len(y_test)):
                actual_top = np.argsort(y_test[i])[::-1][:k]
                pred_top = np.argsort(y_pred[i])[::-1][:k]
                if any(major_id in actual_top for major_id in pred_top):
                    correct_count += 1
            accuracy = correct_count / len(y_test) * 100
            f.write(f"Accuracy cho top-{k}: {accuracy:.2f}%\n")
        
        f.write("\n=== KẾT LUẬN ===\n")
        f.write("Mô hình neural network với cơ chế attention đã được huấn luyện để gợi ý ngành học dựa trên điểm số, sở thích và xu hướng thị trường.\n")
        if r2 >= 0.7:
            f.write("Mô hình có hiệu suất tốt và có thể được sử dụng để gợi ý ngành học cho học sinh.\n")
        elif r2 >= 0.5:
            f.write("Mô hình có hiệu suất trung bình và cần được cải thiện thêm để cho kết quả tốt hơn.\n")
        else:
            f.write("Mô hình có hiệu suất thấp và cần được cải thiện đáng kể hoặc xây dựng lại.\n")
    
    print(f"Đã ghi kết quả đánh giá vào file: {output_file}")
    
    # Vẽ biểu đồ và lưu
    try:
        # Biểu đồ MAE cho 10 ngành đầu tiên
        plt.figure(figsize=(12, 6))
        mae_by_major = np.mean(np.abs(y_test - y_pred), axis=0)
        top_maes = sorted(zip(range(len(mae_by_major)), mae_by_major), key=lambda x: x[1])[:10]
        
        major_names = [preprocessor.id_to_major[idx] for idx, _ in top_maes]
        mae_values = [mae for _, mae in top_maes]
        
        plt.barh(major_names, mae_values, color='skyblue')
        plt.xlabel('Mean Absolute Error')
        plt.ylabel('Major Name')
        plt.title('Top 10 Majors with Lowest MAE')
        plt.tight_layout()
        plt.savefig(os.path.join(plots_dir, 'top_10_majors_mae.png'))
        
        # Biểu đồ phân bố lỗi
        plt.figure(figsize=(10, 6))
        errors = np.mean(np.abs(y_test - y_pred), axis=1)
        plt.hist(errors, bins=50, alpha=0.75, color='skyblue')
        plt.xlabel('Mean Absolute Error')
        plt.ylabel('Frequency')
        plt.title('Distribution of Prediction Errors')
        plt.grid(True, alpha=0.3)
        plt.savefig(os.path.join(plots_dir, 'error_distribution.png'))
        
        print(f"Đã lưu biểu đồ vào thư mục: {plots_dir}")
    except Exception as e:
        print(f"Lỗi khi tạo biểu đồ: {e}")

if __name__ == "__main__":
    evaluate_model() 