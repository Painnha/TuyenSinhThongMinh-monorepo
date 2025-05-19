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
    
    print(f"Đã tải dữ liệu kiểm tra: {len(y_test)} mẫu")
    return X_test, y_test, scaler, features

def load_custom_test_data(file_path):
    """
    Tải dữ liệu kiểm tra từ file CSV tùy chỉnh
    """
    print(f"Đang tải dữ liệu kiểm tra từ {file_path}...")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Không tìm thấy file dữ liệu kiểm tra: {file_path}")
    
    try:
        df = pd.read_csv(file_path)
        print(f"Đã đọc được file CSV với {len(df)} dòng và {len(df.columns)} cột")
        print(f"Các cột trong file: {', '.join(df.columns)}")
        
        # Danh sách các cột bắt buộc, hỗ trợ nhiều tên cột có thể có
        required_column_variants = {
            'student_score': ['Điểm học sinh', 'student_score', 'studentScore', 'diem_hoc_sinh', 'diem'],
            'average_score': ['Điểm chuẩn trung bình', 'average_score', 'averageScore', 'diem_chuan_tb', 'diem_tb'],
            'expected_score': ['Điểm chuẩn dự kiến', 'expected_score', 'expectedScore', 'diem_chuan_du_kien', 'diem_dk'],
            'quota': ['Chỉ tiêu', 'quota', 'chi_tieu', 'chiTieu'],
            'q0': ['q0', 'Q0', 'chi_tieu_tb'],
            'market_trend': ['Market trend', 'market_trend', 'marketTrend', 'xu_huong_thi_truong'],
            'score_trend': ['Xu hướng điểm chuẩn', 'score_trend', 'scoreTrend', 'xu_huong_diem'],
            'actual_probability': ['Xác suất trúng tuyển', 'actual_probability', 'actualProbability', 'xac_suat']
        }
        
        # Tạo ánh xạ từ tên cột trong file sang tên cột chuẩn
        column_mapping = {}
        for standard_name, variants in required_column_variants.items():
            found = False
            for variant in variants:
                if variant in df.columns:
                    column_mapping[variant] = standard_name
                    found = True
                    break
            
            if not found:
                # Thử tìm cột có tên gần giống
                for col in df.columns:
                    for variant in variants:
                        if variant.lower() in col.lower():
                            column_mapping[col] = standard_name
                            found = True
                            break
                    if found:
                        break
            
            if not found:
                print(f"Cảnh báo: Không tìm thấy cột cho '{standard_name}'. Các biến thể tìm kiếm: {variants}")
        
        # Kiểm tra xem đã tìm thấy đủ các cột cần thiết chưa
        missing_columns = set(required_column_variants.keys()) - set(column_mapping.values())
        if missing_columns and 'Điểm học sinh' not in df.columns:
            print(f"Thiếu các cột quan trọng: {', '.join(missing_columns)}")
            print("Kiểm tra lại file CSV hoặc thêm các cột thiếu!")
            
            # Hiển thị một số dòng đầu tiên của file để người dùng có thể kiểm tra
            print("\nMẫu dữ liệu từ file:")
            print(df.head(3))
            
            if len(df.columns) <= 3:
                raise ValueError(f"File dữ liệu không đúng định dạng. Chỉ có {len(df.columns)} cột.")
        
        # Đổi tên các cột sang tên chuẩn
        if column_mapping:
            df = df.rename(columns=column_mapping)
        
        # Tiền xử lý dữ liệu
        model, scaler, features_list = load_prediction_model()
        
        # Kiểm tra và thêm các cột cần thiết
        standard_columns = {
            'student_score': 'Điểm học sinh',
            'average_score': 'Điểm chuẩn trung bình', 
            'expected_score': 'Điểm chuẩn dự kiến',
            'quota': 'Chỉ tiêu',
            'q0': 'q0',
            'market_trend': 'Market trend',
            'score_trend': 'Xu hướng điểm chuẩn',
            'actual_probability': 'Xác suất trúng tuyển'
        }
        
        # Chuẩn bị DataFrame với tên cột chuẩn
        processed_df = pd.DataFrame()
        for std_col, orig_col in standard_columns.items():
            if std_col in df.columns:
                processed_df[orig_col] = df[std_col]
            elif orig_col in df.columns:
                processed_df[orig_col] = df[orig_col]
            else:
                # Nếu là cột quan trọng mà không có thì thử ước lượng
                if std_col == 'average_score' and 'expected_score' in df.columns:
                    processed_df[orig_col] = df['expected_score'] * 0.95  # Giả định
                    print(f"Ước lượng cột {orig_col} từ expected_score")
                elif std_col == 'expected_score' and 'average_score' in df.columns:
                    processed_df[orig_col] = df['average_score'] * 1.05  # Giả định
                    print(f"Ước lượng cột {orig_col} từ average_score")
                elif std_col == 'q0' and 'quota' in df.columns:
                    processed_df[orig_col] = df['quota']  # Giả định q0 = quota
                    print(f"Ước lượng cột {orig_col} bằng quota")
                elif std_col == 'market_trend':
                    processed_df[orig_col] = 0.5  # Giá trị mặc định
                    print(f"Sử dụng giá trị mặc định 0.5 cho cột {orig_col}")
                elif std_col == 'score_trend':
                    processed_df[orig_col] = 0.0  # Giá trị mặc định
                    print(f"Sử dụng giá trị mặc định 0.0 cho cột {orig_col}")
                else:
                    print(f"Thiếu cột quan trọng {orig_col} và không thể ước lượng")
        
        # Tính chênh lệch điểm nếu chưa có
        if 'Chênh lệch điểm' not in processed_df.columns:
            if 'Điểm học sinh' in processed_df.columns and 'Điểm chuẩn dự kiến' in processed_df.columns:
                processed_df['Chênh lệch điểm'] = processed_df['Điểm học sinh'] - processed_df['Điểm chuẩn dự kiến']
                print("Đã tính toán cột 'Chênh lệch điểm'")
        
        # Kiểm tra xem có cột 'Xác suất trúng tuyển' không - cần thiết cho việc đánh giá
        if 'Xác suất trúng tuyển' not in processed_df.columns and 'actual_probability' not in df.columns:
            # Thử tìm trong các cột khác
            probability_keywords = ['xac suat', 'probability', 'prob', 'xacsuat']
            for col in df.columns:
                if any(keyword in col.lower() for keyword in probability_keywords):
                    processed_df['Xác suất trúng tuyển'] = df[col]
                    print(f"Sử dụng cột '{col}' làm 'Xác suất trúng tuyển'")
                    break
        
        # Kiểm tra lại một lần nữa
        required_cols = ['Điểm học sinh', 'Điểm chuẩn trung bình', 'Điểm chuẩn dự kiến', 
                        'Chỉ tiêu', 'q0', 'Market trend', 'Xu hướng điểm chuẩn', 'Xác suất trúng tuyển']
        missing_cols = [col for col in required_cols if col not in processed_df.columns]
        
        if missing_cols:
            print(f"Vẫn còn thiếu các cột: {', '.join(missing_cols)}")
            print("Thử tiến hành dự đoán xác suất cho các mẫu này...")
            
            # Nếu thiếu Xác suất trúng tuyển, nhưng có đủ các cột khác, thử dự đoán
            if 'Xác suất trúng tuyển' in missing_cols and len(missing_cols) == 1:
                from BE_python.ai_models.dudoanxacxuat.predict_admission import predict_single_student
                
                # Tải mô hình và scaler
                model, scaler_tuple, _ = load_prediction_model()
                
                # Chuẩn bị dữ liệu đầu vào cho dự đoán
                predictions = []
                for _, row in processed_df.iterrows():
                    prob = predict_single_student(
                        row['Điểm học sinh'], 
                        row['Điểm chuẩn trung bình'],
                        row['Điểm chuẩn dự kiến'],
                        row['Chỉ tiêu'],
                        row['q0'],
                        row['Market trend'],
                        row['Xu hướng điểm chuẩn'],
                        model,
                        scaler_tuple
                    )
                    predictions.append(prob)
                
                processed_df['Xác suất trúng tuyển'] = predictions
                print(f"Đã dự đoán xác suất trúng tuyển cho {len(predictions)} mẫu")
                missing_cols.remove('Xác suất trúng tuyển')
            
            if missing_cols:
                raise ValueError(f"Không thể xử lý file do thiếu các cột bắt buộc: {', '.join(missing_cols)}")
        
        # Lấy đặc trưng và nhãn từ DataFrame đã xử lý
        features_mapped = {
            'Điểm học sinh': 0,
            'Điểm chuẩn trung bình': 1,
            'Điểm chuẩn dự kiến': 2,
            'Chênh lệch điểm': 3,
            'Chỉ tiêu': 4,
            'q0': 5,
            'Market trend': 6,
            'Xu hướng điểm chuẩn': 7
        }
        
        # Tạo mảng đặc trưng với đúng thứ tự
        X = np.zeros((len(processed_df), 8))
        for col, idx in features_mapped.items():
            X[:, idx] = processed_df[col].values
        
        y = processed_df['Xác suất trúng tuyển'].values
        
        # Chuẩn hóa đặc trưng
        X_scaled = scaler.transform(X)
        features = features_list  # Sử dụng danh sách đặc trưng từ mô hình
        
        print(f"Đã tải và xử lý dữ liệu kiểm tra tùy chỉnh: {len(y)} mẫu")
        
        return X_scaled, y, scaler, features
        
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
    
    # Tính ROC AUC - một trong những độ đo quan trọng nhất
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

def main():
    """
    Hàm chính để chạy đánh giá mô hình
    """
    parser = argparse.ArgumentParser(description='Đánh giá mô hình dự đoán xác suất trúng tuyển')
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
        if args.use_training_data:
            X_test, y_test, scaler, features = load_test_data()
            test_file_name = "training_data_split"
        elif args.custom_data:
            X_test, y_test, scaler, features = load_custom_test_data(args.custom_data)
            test_file_name = os.path.basename(args.custom_data)
        else:
            # Nếu không có file test nào, sử dụng tập huấn luyện
            X_test, y_test, scaler, features = load_test_data()
            test_file_name = "training_data_split"
        
        # Đánh giá mô hình
        results, y_pred = evaluate_model_performance(X_test, y_test)
        
        # In tóm tắt kết quả
        print_evaluation_summary(results)
        
        # Vẽ biểu đồ
        plot_evaluation_results(y_test, y_pred, results, show_plots=not args.no_plots)
        
        # Lưu kết quả
        save_evaluation_results(results, test_file_name, args.output)
        
    except Exception as e:
        print(f"Lỗi khi đánh giá mô hình: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 