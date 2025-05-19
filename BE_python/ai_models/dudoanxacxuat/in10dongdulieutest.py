import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    roc_curve, auc, precision_recall_curve, average_precision_score,
    mean_absolute_error, mean_squared_error, r2_score, brier_score_loss,
    confusion_matrix, classification_report
)
from sklearn.calibration import calibration_curve
import os
import sys
import json
import argparse
from datetime import datetime
import glob

# Thêm đường dẫn gốc vào sys.path để có thể import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

# Import các module cần thiết
from BE_python.ai_models.dudoanxacxuat.neural_network_model import load_prediction_model
from BE_python.ai_models.dudoanxacxuat.train_model import load_training_data, preprocess_data

# Thư mục lưu báo cáo đánh giá
EVAL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'evaluation')
os.makedirs(EVAL_DIR, exist_ok=True)

# Thư mục hiện tại
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Hàm để hiển thị dữ liệu chi tiết
def display_detailed_results(X_test, y_test, y_pred, features, X_original=None, original_order=None):
    """
    Hiển thị 5 dòng đầu và 5 dòng cuối của dữ liệu với kết quả dự đoán
    
    Args:
        X_test: Dữ liệu đầu vào đã chuẩn hóa
        y_test: Giá trị thực tế
        y_pred: Giá trị dự đoán
        features: Danh sách tên các đặc trưng
        X_original: Dữ liệu đầu vào gốc (trước khi chuẩn hóa), nếu có
        original_order: Chỉ số ban đầu của dữ liệu gốc, nếu có
    """
    print("\n===== CHI TIẾT DỰ ĐOÁN =====")
    
    # Tạo DataFrame với đặc trưng và kết quả
    result_df = pd.DataFrame(X_original, columns=features)
    
    # Thêm cột kết quả thực tế và dự đoán
    result_df['Kết quả thực tế'] = y_test
    result_df['Kết quả dự đoán'] = y_pred
    result_df['Sai số'] = y_pred - y_test
    
    if original_order is not None:
        # Thêm cột chỉ số ban đầu
        result_df['original_order'] = original_order
        # Sắp xếp lại theo thứ tự ban đầu
        result_df = result_df.sort_values('original_order').reset_index(drop=True)
    
    # Hiển thị 5 dòng đầu từ DataFrame đã sắp xếp
    print("\n----- 5 DÒNG ĐẦU TIÊN -----")
    print(result_df.head(5).drop('original_order', axis=1, errors='ignore').to_string())
    
    # Hiển thị 5 dòng cuối từ DataFrame đã sắp xếp
    print("\n----- 5 DÒNG CUỐI CÙNG -----")
    print(result_df.tail(5).drop('original_order', axis=1, errors='ignore').to_string())
    
    # 5 dòng có sai số lớn nhất vẫn giữ nguyên
    print("\n----- 5 DÒNG CÓ SAI SỐ LỚN NHẤT -----")
    largest_errors = result_df.iloc[np.abs(result_df['Sai số']).argsort()[-5:][::-1]]
    print(largest_errors.drop('original_order', axis=1, errors='ignore').to_string())

def find_test_files():
    """
    Tìm tất cả các file CSV có thể dùng làm dữ liệu kiểm tra
    """
    # Tìm tất cả file CSV trong thư mục hiện tại
    csv_files = glob.glob(os.path.join(CURRENT_DIR, "*.csv"))
    
    # Tìm tất cả file CSV trong thư mục data nếu có
    data_dir = os.path.join(CURRENT_DIR, "data")
    if os.path.exists(data_dir):
        csv_files.extend(glob.glob(os.path.join(data_dir, "*.csv")))
    
    # Lọc ra các file có khả năng là dữ liệu test
    test_files = []
    for file_path in csv_files:
        file_name = os.path.basename(file_path)
        if 'test' in file_name.lower() or 'eval' in file_name.lower():
            test_files.append(file_path)
    
    # Thêm file test_data_2000.csv nếu có
    default_test_file = os.path.join(CURRENT_DIR, "test_data_2000.csv")
    if os.path.exists(default_test_file) and default_test_file not in test_files:
        test_files.insert(0, default_test_file)  # Đặt default file lên đầu danh sách
    
    return test_files

def load_test_data(test_size=0.2, random_state=42):
    """
    Tải dữ liệu kiểm tra từ tập huấn luyện
    """
    print("Đang tải dữ liệu kiểm tra từ tập huấn luyện...")
    df = load_training_data()
    
    if df is None or df.empty:
        raise ValueError("Không có dữ liệu huấn luyện, cần chạy training_data_creator.py trước")
    
    # Tiền xử lý dữ liệu và chia tập huấn luyện/kiểm tra
    X_train, X_test, y_train, y_test, scaler, features = preprocess_data(df)
    
    # Lưu dữ liệu gốc trước khi chuẩn hóa để hiển thị chi tiết
    # Tạo X_original từ df với các đặc trưng được định nghĩa trong features
    df_processed = df.copy()
    if 'Chênh lệch điểm' not in df_processed.columns:
        df_processed['Chênh lệch điểm'] = df_processed['Điểm học sinh'] - df_processed['Điểm chuẩn dự kiến']
    
    # Lấy chỉ số của bộ test từ đầu vào
    train_indices, test_indices = train_test_split(range(len(df_processed)), test_size=test_size, random_state=random_state)
    df_test = df_processed.iloc[test_indices]
    
    X_original = df_test[features].values
    
    print(f"Đã tải dữ liệu kiểm tra: {len(y_test)} mẫu")
    return X_test, y_test, scaler, features, X_original

def load_custom_test_data(file_path):
    """
    Tải dữ liệu kiểm tra từ file CSV tùy chỉnh
    """
    print(f"Đang tải dữ liệu kiểm tra từ {file_path}...")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Không tìm thấy file dữ liệu kiểm tra: {file_path}")
    
    try:
        # Tải mô hình để lấy danh sách features
        model, scaler, features = load_prediction_model()
        
        # Đọc toàn bộ file CSV gốc
        original_df = pd.read_csv(file_path)
        print(f"Đã đọc được file CSV với {len(original_df)} dòng và {len(original_df.columns)} cột")
        print(f"Các cột trong file: {', '.join(original_df.columns)}")
        
        # Lưu lại dữ liệu gốc đúng thứ tự
        processed_df = original_df.copy()
        
        # Đảm bảo có tất cả các cột cần thiết
        for feature in features:
            if feature not in processed_df.columns and feature == 'Chênh lệch điểm':
                processed_df['Chênh lệch điểm'] = processed_df['Điểm học sinh'] - processed_df['Điểm chuẩn dự kiến']
        
        # Lấy dữ liệu đúng thứ tự và chuẩn hóa
        X_original = processed_df[features].values
        X_scaled = scaler.transform(X_original)
        y = processed_df['Xác suất trúng tuyển'].values
        
        # Giữ nguyên thứ tự ban đầu
        original_indices = np.arange(len(processed_df))
        
        print(f"Đã tải và xử lý dữ liệu kiểm tra tùy chỉnh: {len(y)} mẫu")
        
        return X_scaled, y, scaler, features, X_original, original_indices
        
    except Exception as e:
        print(f"Lỗi khi xử lý file {file_path}: {e}")
        import traceback
        traceback.print_exc()
        raise

def evaluate_regression_metrics(y_true, y_pred):
    """
    Đánh giá các độ đo cho mô hình hồi quy
    """
    # Loại bỏ MAE, chỉ giữ lại các độ đo chính
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)
    
    return {
        'MSE': mse,
        'RMSE': rmse,
        'R²': r2
    }

def evaluate_classification_metrics(y_true, y_pred, threshold=0.5):
    """
    Đánh giá các độ đo cho mô hình phân loại
    """
    # Chuyển xác suất thành nhãn phân loại
    y_pred_binary = (y_pred >= threshold).astype(int)
    y_true_binary = (y_true >= threshold).astype(int)
    
    metrics = {}
    
    # Confusion matrix - độ đo quan trọng nhất cho phân loại
    unique_classes = np.unique(np.concatenate([y_true_binary, y_pred_binary]))
    if len(unique_classes) > 1:
        # Confusion matrix
        cm = confusion_matrix(y_true_binary, y_pred_binary)
        metrics['Confusion Matrix'] = cm
        
        # Tính F1-score trực tiếp thay vì toàn bộ classification report
        try:
            cr = classification_report(y_true_binary, y_pred_binary, output_dict=True)
            if '1' in cr:  # Class trúng tuyển
                metrics['F1-score'] = cr['1']['f1-score']
            else:
                metrics['F1-score'] = None
        except Exception as e:
            print(f"Không thể tính F1-score: {e}")
            metrics['F1-score'] = None
    else:
        print(f"Dữ liệu chỉ có một class ({unique_classes[0]}), không thể tính confusion matrix")
        # Tạo ma trận 1x1 cho trường hợp đặc biệt này
        metrics['Confusion Matrix'] = np.array([[len(y_true_binary)]])
        metrics['F1-score'] = None
    
    return metrics

def print_evaluation_summary(results):
    """
    In tóm tắt kết quả đánh giá - đơn giản và rõ ràng
    """
    print("\n==== KẾT QUẢ ĐÁNH GIÁ MÔ HÌNH ====")
    
    # Metrics hồi quy quan trọng
    print("\n--- Độ đo hồi quy ---")
    print(f"RMSE: {results['regression_metrics']['RMSE']:.4f} (càng thấp càng tốt)")
    print(f"R²: {results['regression_metrics']['R²']:.4f} (càng gần 1 càng tốt)")
    
    # Metrics phân loại quan trọng
    print("\n--- Độ đo phân loại ---")
    if results['classification_metrics'].get('F1-score'):
        print(f"F1-score: {results['classification_metrics']['F1-score']:.4f} (càng gần 1 càng tốt)")
    
    # AUC ROC
    if results.get('roc_auc'):
        print(f"ROC AUC: {results['roc_auc']:.4f} (càng gần 1 càng tốt)")
    
    # Số lượng mẫu theo class
    confusion_mat = results['classification_metrics']['Confusion Matrix']
    total_samples = np.sum(confusion_mat)
    
    print(f"\n--- Phân phối mẫu ---")
    print(f"Tổng số mẫu: {total_samples}")
    
    # Tính số mẫu trúng tuyển và không trúng tuyển theo threshold 0.5
    if confusion_mat.shape == (2, 2):  # Ma trận 2x2 cho phân loại nhị phân
        # Trích xuất TP, TN, FP, FN từ confusion matrix
        tn, fp, fn, tp = confusion_mat.ravel()
        
        # Tính accuracy
        accuracy = (tp + tn) / (tp + tn + fp + fn)
        
        print(f"Accuracy: {accuracy:.4f} (tỷ lệ dự đoán đúng)")
        print(f"True Positives (TP): {tp} (dự đoán đúng là trúng tuyển)")
        print(f"True Negatives (TN): {tn} (dự đoán đúng là không trúng tuyển)")
        print(f"False Positives (FP): {fp} (dự đoán sai là trúng tuyển)")
        print(f"False Negatives (FN): {fn} (dự đoán sai là không trúng tuyển)")
    else:
        print(f"Tất cả {total_samples} mẫu đều thuộc cùng một phân loại")

def plot_evaluation_results(y_test, y_pred, results, show_plots=True, save_plots=True):
    """
    Vẽ các biểu đồ đánh giá mô hình - giảm số lượng biểu đồ
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S") if save_plots else None
    
    # Tạo figure với 2 subplots quan trọng nhất
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    
    # 1. Scatter plot của giá trị thực và dự đoán
    axes[0].scatter(y_test, y_pred, alpha=0.3)
    axes[0].plot([0, 1], [0, 1], 'r--')
    axes[0].set_xlabel('Xác suất thực tế')
    axes[0].set_ylabel('Xác suất dự đoán')
    axes[0].set_title('So sánh giá trị dự đoán và thực tế')
    
    # 2. Phân phối sai số - quan trọng để hiểu độ chính xác
    error = y_pred - y_test
    sns.histplot(error, kde=True, ax=axes[1])
    axes[1].set_xlabel('Sai số dự đoán (Predicted - Actual)')
    axes[1].set_ylabel('Số lượng')
    axes[1].set_title('Phân phối sai số dự đoán')
    
    plt.tight_layout()
    
    # Lưu biểu đồ
    if save_plots:
        output_path = os.path.join(EVAL_DIR, f'evaluation_plots_{timestamp}.png')
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"Đã lưu biểu đồ vào {output_path}")
    
    # Hiển thị biểu đồ
    if show_plots:
        plt.show()
    else:
        plt.close()
    
    # Tạo confusion matrix nếu có nhiều hơn 1 class
    unique_classes = np.unique((y_test >= 0.5).astype(int))
    if len(unique_classes) > 1:
        plt.figure(figsize=(8, 6))
        conf_matrix = results['classification_metrics']['Confusion Matrix']
        sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues',
                    xticklabels=['Không trúng', 'Trúng'], 
                    yticklabels=['Không trúng', 'Trúng'])
        plt.xlabel('Dự đoán')
        plt.ylabel('Thực tế')
        plt.title('Confusion Matrix')
        
        if save_plots:
            output_path = os.path.join(EVAL_DIR, f'confusion_matrix_{timestamp}.png')
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
        
        if show_plots:
            plt.show()
        else:
            plt.close()

def save_evaluation_results(results, test_file_name=None, output_file=None):
    """
    Lưu kết quả đánh giá vào file JSON
    """
    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_prefix = "evaluation_results"
        if test_file_name:
            file_prefix = f"eval_{os.path.splitext(os.path.basename(test_file_name))[0]}"
        output_file = os.path.join(EVAL_DIR, f'{file_prefix}_{timestamp}.json')
    
    # Chuyển đổi numpy arrays sang list để có thể serialize
    serializable_results = results.copy()
    
    # Xử lý confusion matrix
    serializable_results['classification_metrics']['Confusion Matrix'] = \
        serializable_results['classification_metrics']['Confusion Matrix'].tolist()
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(serializable_results, f, ensure_ascii=False, indent=2)
    
    print(f"Đã lưu kết quả đánh giá vào {output_file}")
    
    return output_file

def evaluate_model_performance(X_test, y_test):
    """
    Đánh giá hiệu suất tổng thể của mô hình
    """
    # Tải mô hình
    model, _, _ = load_prediction_model()
    
    # Dự đoán
    y_pred = model.predict(X_test).flatten()
    
    # Đánh giá các độ đo
    regression_metrics = evaluate_regression_metrics(y_test, y_pred)
    classification_metrics = evaluate_classification_metrics(y_test, y_pred)
    
    results = {
        'regression_metrics': regression_metrics,
        'classification_metrics': classification_metrics
    }
    
    # Tính ROC AUC
    try:
        # Chuyển đổi thành nhị phân để tính ROC và PR curves
        y_test_binary = (y_test >= 0.5).astype(int)
        
        # Kiểm tra xem có đủ classes để tính ROC
        if len(np.unique(y_test_binary)) > 1:
            fpr, tpr, _ = roc_curve(y_test_binary, y_pred)
            roc_auc = auc(fpr, tpr)
            
            results['roc_auc'] = roc_auc
        else:
            print("WARNING: Dữ liệu chỉ có một class, không thể tính ROC AUC")
            results['roc_auc'] = None
    except Exception as e:
        print(f"Lỗi khi tính ROC AUC: {e}")
        results['roc_auc'] = None
    
    return results, y_pred

def main():
    """
    Hàm chính để chạy đánh giá mô hình
    """
    parser = argparse.ArgumentParser(description='Đánh giá chi tiết mô hình dự đoán xác suất trúng tuyển')
    parser.add_argument('--custom-data', type=str, help='Đường dẫn đến file CSV dữ liệu kiểm tra tùy chỉnh')
    parser.add_argument('--output', type=str, help='Đường dẫn file kết quả đánh giá')
    parser.add_argument('--no-plots', action='store_true', help='Không hiển thị biểu đồ')
    parser.add_argument('--use-training-data', action='store_true', help='Sử dụng dữ liệu từ tập huấn luyện thay vì file test')
    args = parser.parse_args()
    
    try:
        # Tìm các file test
        test_files = find_test_files()
        
        # Nếu không có tham số custom-data, hiển thị danh sách các file test để người dùng chọn
        if not args.custom_data and not args.use_training_data:
            if test_files:
                print("Các file test có sẵn:")
                for i, file_path in enumerate(test_files):
                    print(f"{i+1}. {os.path.basename(file_path)}")
                
                choice = input("Chọn file test (nhập số hoặc để trống để sử dụng file đầu tiên): ")
                if choice.strip():
                    try:
                        idx = int(choice.strip()) - 1
                        if 0 <= idx < len(test_files):
                            args.custom_data = test_files[idx]
                        else:
                            print(f"Lựa chọn không hợp lệ. Sử dụng file đầu tiên.")
                            args.custom_data = test_files[0]
                    except ValueError:
                        print(f"Lựa chọn không hợp lệ. Sử dụng file đầu tiên.")
                        args.custom_data = test_files[0]
                else:
                    args.custom_data = test_files[0]
                
                print(f"Đánh giá mô hình với file: {args.custom_data}")
            else:
                print("Không tìm thấy file test nào. Sử dụng dữ liệu từ tập huấn luyện.")
                args.use_training_data = True
        
        # Tải dữ liệu kiểm tra
        X_original = None
        if args.use_training_data:
            X_test, y_test, scaler, features, X_original = load_test_data()
            test_file_name = "training_data_split"
        elif args.custom_data:
            X_test, y_test, scaler, features, X_original, original_indices = load_custom_test_data(args.custom_data)
            test_file_name = os.path.basename(args.custom_data)
        else:
            # Nếu không có file test nào, sử dụng tập huấn luyện
            X_test, y_test, scaler, features, X_original = load_test_data()
            test_file_name = "training_data_split"
        
        # Đánh giá mô hình
        results, y_pred = evaluate_model_performance(X_test, y_test)
        
        # In tóm tắt kết quả
        print_evaluation_summary(results)
        
        # Hiển thị chi tiết dự đoán
        display_detailed_results(X_test, y_test, y_pred, features, X_original, original_indices)
        
        # Thêm đoạn hiển thị 5 dòng cuối thực tế từ file gốc
        if args.custom_data:
            print("\n----- 5 DÒNG CUỐI THỰC TẾ TỪ FILE CSV -----")
            # Đọc file CSV và in 5 dòng cuối cùng
            with open(args.custom_data, 'r') as f:
                lines = f.readlines()
                last_5_lines = lines[-5:]
                for line in last_5_lines:
                    print(line.strip())
        
        # Vẽ biểu đồ và lưu kết quả
        plot_evaluation_results(y_test, y_pred, results, show_plots=not args.no_plots)
        save_evaluation_results(results, test_file_name, args.output)
        
    except Exception as e:
        print(f"Lỗi khi đánh giá mô hình: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()