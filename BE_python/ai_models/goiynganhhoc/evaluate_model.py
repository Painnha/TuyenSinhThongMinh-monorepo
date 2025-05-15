import os
import sys
import numpy as np
import tensorflow as tf
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, confusion_matrix
import json
import datetime
from tensorflow.keras.models import load_model

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ai_models.goiynganhhoc.data_preprocessing import DataPreprocessor
from ai_models.goiynganhhoc.neural_network import MajorRecommendationModel
from ai_models.goiynganhhoc.train_model import train_model

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

def calculate_classification_metrics(y_true, y_pred, threshold=0.5):
    """
    Tính toán các độ đo phân loại cho mô hình dự đoán ngành học
    
    Args:
        y_true: Ma trận ground truth
        y_pred: Ma trận dự đoán
        threshold: Ngưỡng để convert xác suất thành nhãn (0/1)
        
    Returns:
        Dictionary chứa các độ đo
    """
    # Tạo binary labels bằng cách áp dụng ngưỡng
    y_true_binary = (y_true > 0).astype(int)
    y_pred_binary = (y_pred >= threshold).astype(int)
    
    # Tính toán các độ đo cho mỗi ngành (macro average)
    precision_macro = precision_score(y_true_binary, y_pred_binary, average='macro', zero_division=0)
    recall_macro = recall_score(y_true_binary, y_pred_binary, average='macro', zero_division=0)
    f1_macro = f1_score(y_true_binary, y_pred_binary, average='macro', zero_division=0)
    
    # Tính toán các độ đo tổng hợp (micro average)
    precision_micro = precision_score(y_true_binary, y_pred_binary, average='micro', zero_division=0)
    recall_micro = recall_score(y_true_binary, y_pred_binary, average='micro', zero_division=0)
    f1_micro = f1_score(y_true_binary, y_pred_binary, average='micro', zero_division=0)
    
    # Tính accuracy tổng thể
    accuracy = accuracy_score(y_true_binary.flatten(), y_pred_binary.flatten())
    
    # Tính weighted metrics (trọng số theo số lượng mẫu mỗi lớp)
    precision_weighted = precision_score(y_true_binary, y_pred_binary, average='weighted', zero_division=0)
    recall_weighted = recall_score(y_true_binary, y_pred_binary, average='weighted', zero_division=0)
    f1_weighted = f1_score(y_true_binary, y_pred_binary, average='weighted', zero_division=0)
    
    # Tính toán số lượng mẫu dương/âm tính
    total_positives = np.sum(y_true_binary)
    total_samples = y_true_binary.size
    positive_rate = total_positives / total_samples
    
    return {
        "precision_macro": precision_macro,
        "recall_macro": recall_macro,
        "f1_macro": f1_macro,
        "precision_micro": precision_micro,
        "recall_micro": recall_micro,
        "f1_micro": f1_micro,
        "precision_weighted": precision_weighted,
        "recall_weighted": recall_weighted,
        "f1_weighted": f1_weighted,
        "accuracy": accuracy,
        "positive_rate": positive_rate
    }

def calculate_topk_metrics(y_true, y_pred, k_values=[1, 3, 5, 10]):
    """
    Tính các độ đo cho top-k dự đoán
    
    Args:
        y_true: Ma trận ground truth
        y_pred: Ma trận dự đoán
        k_values: Danh sách các giá trị k để đánh giá
        
    Returns:
        Dictionary chứa các độ đo top-k
    """
    results = {}
    
    for k in k_values:
        precision_sum = 0
        recall_sum = 0
        f1_sum = 0
        total_valid = 0
        
        for i in range(len(y_true)):
            # Lấy các ngành thực tế có điểm > 0
            actual_positives = np.where(y_true[i] > 0)[0]
            if len(actual_positives) == 0:
                continue
                
            # Lấy top-k ngành dự đoán
            top_k_predictions = np.argsort(y_pred[i])[::-1][:k]
            
            # Tính số lượng dự đoán đúng
            true_positives = sum(major in top_k_predictions for major in actual_positives)
            
            # Tính precision và recall cho mẫu này
            precision = true_positives / k if k > 0 else 0
            recall = true_positives / len(actual_positives) if len(actual_positives) > 0 else 0
            
            # Tính F1
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
            
            precision_sum += precision
            recall_sum += recall
            f1_sum += f1
            total_valid += 1
        
        # Tính trung bình
        avg_precision = precision_sum / total_valid if total_valid > 0 else 0
        avg_recall = recall_sum / total_valid if total_valid > 0 else 0
        avg_f1 = f1_sum / total_valid if total_valid > 0 else 0
        
        # Lưu kết quả
        results[f"top{k}_precision"] = avg_precision
        results[f"top{k}_recall"] = avg_recall
        results[f"top{k}_f1"] = avg_f1
    
    return results

def evaluate_model(model=None, preprocessor=None, X_test=None, y_test=None):
    """Đánh giá hiệu suất của mô hình và xuất kết quả ra file"""
    # Nếu không có mô hình được truyền vào, tải mô hình mới hoặc huấn luyện lại
    if model is None or preprocessor is None or X_test is None or y_test is None:
        try:
            model, model_path = load_latest_model()
            
            if model is None:
                print("Không tìm thấy mô hình đã lưu, đang huấn luyện mô hình mới...")
                model, history, preprocessor, X_test, y_test = train_model()
            else:
                # Cần preprocessor và dữ liệu kiểm tra
                print("Đang tạo preprocessor và dữ liệu kiểm tra...")
                preprocessor = DataPreprocessor()
                X, y = preprocessor.preprocess_training_data()
                from sklearn.model_selection import train_test_split
                _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
                
                # Chuẩn hóa dữ liệu nếu cần thiết
                if os.path.exists(os.path.join(os.path.dirname(model_path), "scaler_mean.npy")):
                    from sklearn.preprocessing import StandardScaler
                    scaler = StandardScaler()
                    scaler.mean_ = np.load(os.path.join(os.path.dirname(model_path), "scaler_mean.npy"))
                    scaler.scale_ = np.load(os.path.join(os.path.dirname(model_path), "scaler_scale.npy"))
                    X_test = scaler.transform(X_test)
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
    
    # Tính các độ đo hồi quy
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    # Đánh giá Top-K
    top_k_values = [1, 3, 5, 10]
    top_k_accuracies = []
    
    for k in top_k_values:
        correct = 0
        total = len(y_test)
        
        for i in range(total):
            # Lấy các ngành thực tế có điểm > 0
            actual_majors = np.where(y_test[i] > 0)[0]
            if len(actual_majors) == 0:
                continue
                
            # Lấy top-k ngành dự đoán
            predicted_majors = np.argsort(y_pred[i])[::-1][:k]
            
            # Kiểm tra xem có bất kỳ ngành thực tế nào nằm trong top-k không
            if any(major in predicted_majors for major in actual_majors):
                correct += 1
        
        accuracy = correct / total * 100
        top_k_accuracies.append(accuracy)
    
    # Tính toán các độ đo phân loại
    print("Đang tính toán các độ đo phân loại...")
    classification_metrics = calculate_classification_metrics(y_test, y_pred, threshold=0.3)
    topk_metrics = calculate_topk_metrics(y_test, y_pred, k_values=top_k_values)
    
    # In ra độ đo
    print("\n=== ĐÁNH GIÁ MÔ HÌNH ===")
    print(f"Mean Absolute Error (MAE): {mae:.4f}")
    print(f"Mean Squared Error (MSE): {mse:.4f}")
    print(f"Root Mean Squared Error (RMSE): {rmse:.4f}")
    print(f"R² Score: {r2:.4f}")
    
    # In ra top-k accuracy
    for k, acc in zip(top_k_values, top_k_accuracies):
        print(f"Top-{k} Accuracy: {acc:.2f}%")
    
    # In ra các độ đo phân loại
    print("\n=== ĐỘ ĐO PHÂN LOẠI ===")
    print(f"Accuracy: {classification_metrics['accuracy']:.4f}")
    print(f"Precision (macro): {classification_metrics['precision_macro']:.4f}")
    print(f"Recall (macro): {classification_metrics['recall_macro']:.4f}")
    print(f"F1 Score (macro): {classification_metrics['f1_macro']:.4f}")
    print(f"Precision (micro): {classification_metrics['precision_micro']:.4f}")
    print(f"Recall (micro): {classification_metrics['recall_micro']:.4f}")
    print(f"F1 Score (micro): {classification_metrics['f1_micro']:.4f}")
    
    print("\n=== ĐỘ ĐO TOP-K ===")
    for k in top_k_values:
        print(f"Top-{k} Precision: {topk_metrics[f'top{k}_precision']:.4f}")
        print(f"Top-{k} Recall: {topk_metrics[f'top{k}_recall']:.4f}")
        print(f"Top-{k} F1 Score: {topk_metrics[f'top{k}_f1']:.4f}")
    
    # Kiểm tra overfitting bằng cách so sánh phân phối của dự đoán
    y_pred_mean = np.mean(y_pred)
    y_pred_std = np.std(y_pred)
    y_test_mean = np.mean(y_test)
    y_test_std = np.std(y_test)
    
    print(f"\nPhân phối dự đoán: Mean={y_pred_mean:.4f}, Std={y_pred_std:.4f}")
    print(f"Phân phối thực tế: Mean={y_test_mean:.4f}, Std={y_test_std:.4f}")
    
    if y_pred_std < 0.01:
        print("CẢNH BÁO: Độ lệch chuẩn của dự đoán rất thấp, có thể đang bị overfitting")
    
    # Ghi độ đo vào file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("====== ĐÁNH GIÁ MÔ HÌNH GỢI Ý NGÀNH HỌC ======\n\n")
        f.write(f"Thời gian đánh giá: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("=== CẤU TRÚC MÔ HÌNH ===\n")
        model.model.summary(print_fn=lambda x: f.write(x + '\n'))
        f.write("\n")
        
        f.write("=== ĐỘ ĐO HIỆU SUẤT HỒI QUY ===\n")
        f.write(f"Mean Absolute Error (MAE): {mae:.4f}\n")
        f.write(f"Mean Squared Error (MSE): {mse:.4f}\n")
        f.write(f"Root Mean Squared Error (RMSE): {rmse:.4f}\n")
        f.write(f"R² Score: {r2:.4f}\n\n")
        
        # Đánh giá Top-K
        f.write("=== ĐÁNH GIÁ TOP-K NGÀNH GỢI Ý ===\n")
        for k, acc in zip(top_k_values, top_k_accuracies):
            f.write(f"Top-{k} Accuracy: {acc:.2f}%\n")
        f.write("\n")
        
        # Ghi các độ đo phân loại
        f.write("=== ĐỘ ĐO PHÂN LOẠI ===\n")
        f.write(f"Accuracy: {classification_metrics['accuracy']:.4f}\n")
        f.write(f"Tỷ lệ mẫu dương tính: {classification_metrics['positive_rate']:.4f}\n\n")
        
        f.write("Macro average (trung bình trên các lớp):\n")
        f.write(f"Precision: {classification_metrics['precision_macro']:.4f}\n")
        f.write(f"Recall: {classification_metrics['recall_macro']:.4f}\n")
        f.write(f"F1 Score: {classification_metrics['f1_macro']:.4f}\n\n")
        
        f.write("Micro average (trung bình trên các mẫu):\n")
        f.write(f"Precision: {classification_metrics['precision_micro']:.4f}\n")
        f.write(f"Recall: {classification_metrics['recall_micro']:.4f}\n")
        f.write(f"F1 Score: {classification_metrics['f1_micro']:.4f}\n\n")
        
        f.write("Weighted average (trọng số theo số lượng mẫu mỗi lớp):\n")
        f.write(f"Precision: {classification_metrics['precision_weighted']:.4f}\n")
        f.write(f"Recall: {classification_metrics['recall_weighted']:.4f}\n")
        f.write(f"F1 Score: {classification_metrics['f1_weighted']:.4f}\n\n")
        
        # Ghi độ đo Top-K chi tiết
        f.write("=== ĐỘ ĐO CHI TIẾT CHO TOP-K ===\n")
        for k in top_k_values:
            f.write(f"Top-{k}:\n")
            f.write(f"  Precision: {topk_metrics[f'top{k}_precision']:.4f}\n")
            f.write(f"  Recall: {topk_metrics[f'top{k}_recall']:.4f}\n")
            f.write(f"  F1 Score: {topk_metrics[f'top{k}_f1']:.4f}\n")
        f.write("\n")
        
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
        
        # Confusion matrix cho top-1 prediction
        plt.figure(figsize=(12, 8))
        top1_correct = 0
        total_predictions = 0
        
        for i in range(len(y_test)):
            actual_top = np.argmax(y_test[i])
            pred_top = np.argmax(y_pred[i])
            
            if actual_top == pred_top:
                top1_correct += 1
            total_predictions += 1
        
        top1_accuracy = top1_correct / total_predictions * 100
        plt.text(0.5, 0.5, f"Top-1 Accuracy: {top1_accuracy:.2f}%", 
                ha='center', va='center', fontsize=20)
        plt.axis('off')
        plt.savefig(os.path.join(plots_dir, 'top1_accuracy.png'))
        
        # Biểu đồ so sánh phân phối y_test và y_pred
        plt.figure(figsize=(10, 6))
        plt.hist(y_test.flatten(), bins=50, alpha=0.5, label='Ground Truth', color='blue')
        plt.hist(y_pred.flatten(), bins=50, alpha=0.5, label='Predictions', color='red')
        plt.xlabel('Score')
        plt.ylabel('Frequency')
        plt.title('Distribution of Ground Truth vs Predictions')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.savefig(os.path.join(plots_dir, 'distribution_comparison.png'))
        
        # Biểu đồ Precision, Recall, F1 cho các ngưỡng khác nhau 
        plt.figure(figsize=(12, 6))
        thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
        precision_values = []
        recall_values = []
        f1_values = []
        
        for threshold in thresholds:
            metrics = calculate_classification_metrics(y_test, y_pred, threshold=threshold)
            precision_values.append(metrics['precision_macro'])
            recall_values.append(metrics['recall_macro'])
            f1_values.append(metrics['f1_macro'])
        
        plt.plot(thresholds, precision_values, 'o-', label='Precision (macro)')
        plt.plot(thresholds, recall_values, 'o-', label='Recall (macro)')
        plt.plot(thresholds, f1_values, 'o-', label='F1 Score (macro)')
        plt.xlabel('Threshold')
        plt.ylabel('Score')
        plt.title('Precision, Recall, F1 vs. Threshold')
        plt.grid(True, alpha=0.3)
        plt.legend()
        plt.savefig(os.path.join(plots_dir, 'precision_recall_f1_vs_threshold.png'))
        
        print(f"Đã lưu biểu đồ vào thư mục: {plots_dir}")
    except Exception as e:
        print(f"Lỗi khi tạo biểu đồ: {e}")
    
    return mae, mse, rmse, r2, top_k_accuracies, classification_metrics, topk_metrics

def analyze_feature_importance(model, X_test, feature_names=None):
    """Phân tích tầm quan trọng của các đặc trưng"""
    pass  # Để cài đặt sau nếu cần

def print_model_summary(model):
    """In tóm tắt kiến trúc mô hình"""
    print("\n=== KIẾN TRÚC MÔ HÌNH ===")
    model.model.summary()
    
def test_specific_student(model, preprocessor, student_data=None):
    """Kiểm tra mô hình với dữ liệu sinh viên cụ thể"""
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
    print("\n=== GỢI Ý NGÀNH HỌC ===")
    for idx, score in recommendations:
        major_name = preprocessor.get_major_by_id(idx)
        print(f"- {major_name}: {score:.2f}")
        
        # Lấy thông tin chi tiết về ngành
        major_info = preprocessor.get_major_info(major_name)
        if major_info and 'interests' in major_info:
            matching_interests = []
            for interest_obj in major_info['interests']:
                if isinstance(interest_obj, dict) and 'name' in interest_obj:
                    interest_name = interest_obj['name']
                    if interest_name in student_data['interests']:
                        matching_interests.append(interest_name)
            
            if matching_interests:
                print(f"  Phù hợp với sở thích: {', '.join(matching_interests)}")
    
    return recommendations

if __name__ == "__main__":
    model, model_path = load_latest_model()
    
    if model is None:
        # Huấn luyện mô hình mới nếu không tìm thấy mô hình đã lưu
        print("Không tìm thấy mô hình đã lưu. Huấn luyện mô hình mới...")
        from ai_models.goiynganhhoc.train_model import train_model
        model, history, preprocessor, X_test, y_test = train_model()
    else:
        # Tạo preprocessor mới để đánh giá
        preprocessor = DataPreprocessor()
        
        # Tiền xử lý dữ liệu để đánh giá
        X, y = preprocessor.preprocess_training_data()
        from sklearn.model_selection import train_test_split
        _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Chuẩn hóa dữ liệu nếu cần thiết
        if os.path.exists(os.path.join(os.path.dirname(model_path), "scaler_mean.npy")):
            from sklearn.preprocessing import StandardScaler
            scaler = StandardScaler()
            scaler.mean_ = np.load(os.path.join(os.path.dirname(model_path), "scaler_mean.npy"))
            scaler.scale_ = np.load(os.path.join(os.path.dirname(model_path), "scaler_scale.npy"))
            X_test = scaler.transform(X_test)
    
    # Đánh giá mô hình
    evaluate_model(model, preprocessor, X_test, y_test)
    
    # Test mô hình với một học sinh mẫu
    test_specific_student(model, preprocessor) 