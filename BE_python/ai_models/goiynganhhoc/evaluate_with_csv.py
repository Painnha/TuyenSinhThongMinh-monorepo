import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import datetime
from sklearn.metrics import precision_score, recall_score, f1_score

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ai_models.goiynganhhoc.data_preprocessing import DataPreprocessor
from ai_models.goiynganhhoc.simple_predict import load_model_and_scaler

def load_test_data_from_csv(csv_file, preprocessor=None):
    """
    Đọc và xử lý dữ liệu test từ file CSV
    
    Args:
        csv_file: Đường dẫn đến file CSV chứa dữ liệu test
        preprocessor: DataPreprocessor đã được khởi tạo, nếu None sẽ tạo mới
        
    Returns:
        X_test: Ma trận đặc trưng đầu vào
        y_test: Ma trận nhãn đầu ra
        preprocessor: DataPreprocessor đã sử dụng
    """
    print(f"Đang đọc dữ liệu test từ file: {csv_file}")
    
    # Tạo preprocessor nếu chưa có
    if preprocessor is None:
        preprocessor = DataPreprocessor()
    
    # Đọc file CSV
    df = pd.read_csv(csv_file)
    print(f"Đã đọc {len(df)} mẫu từ file CSV")
    
    # Khởi tạo mảng
    X = []
    y = []
    
    # Xử lý từng dòng trong DataFrame
    for _, row in df.iterrows():
        # Xử lý điểm số
        scores = np.zeros(9)
        for i, subject in enumerate(preprocessor.subjects):
            if subject in row and pd.notna(row[subject]):
                scores[i] = float(row[subject]) / 10.0  # Chuẩn hóa về [0,1]
        
        # Xử lý khối thi (TN hoặc XH)
        tohopthi = np.zeros(2)  # TN, XH
        if 'Tohopthi' in row and pd.notna(row['Tohopthi']):
            if row['Tohopthi'] == 'TN':
                tohopthi[0] = 1.0
            elif row['Tohopthi'] == 'XH':
                tohopthi[1] = 1.0
        
        # Xử lý sở thích
        interests = np.zeros(len(preprocessor.interest_to_id))
        if 'Interests' in row and pd.notna(row['Interests']):
            if isinstance(row['Interests'], str):
                # Xử lý trường hợp Interests là chuỗi
                student_interests = row['Interests'].split(',')
                for interest in student_interests:
                    interest = interest.strip()
                    if interest in preprocessor.interest_to_id:
                        interests[preprocessor.interest_to_id[interest]] = 1.0
        
        # Xử lý tổ hợp môn
        subject_groups = np.zeros(len(preprocessor.subject_comb_to_id))
        for i in range(1, 4):  # Kiểm tra tất cả 3 lựa chọn ngành tiềm năng
            subject_group_col = f'Subject_Group_{i}'
            if subject_group_col in row and pd.notna(row[subject_group_col]):
                group = row[subject_group_col]
                if group in preprocessor.subject_comb_to_id:
                    subject_groups[preprocessor.subject_comb_to_id[group]] = 1.0
        
        # Gộp đặc trưng
        features = np.concatenate([
            scores,
            tohopthi,
            interests,
            subject_groups
        ])
        
        X.append(features)
        
        # Xử lý mục tiêu - ngành học ưu tiên và điểm số
        major_scores = np.zeros(len(preprocessor.major_to_id))
        
        # Xử lý từ định dạng mới (Major_1, Score_1, Major_2, Score_2, Major_3, Score_3)
        for i in range(1, 4):
            major_col = f'Major_{i}'
            score_col = f'Score_{i}'
            if major_col in row and score_col in row and pd.notna(row[major_col]) and pd.notna(row[score_col]):
                major = str(row[major_col]).lower().strip()
                if major in preprocessor.major_to_id:
                    major_scores[preprocessor.major_to_id[major]] = float(row[score_col])
                else:
                    # Thử tìm kiếm khớp gần đúng
                    found = False
                    for key in preprocessor.major_to_id.keys():
                        if major in key or key in major:
                            major_scores[preprocessor.major_to_id[key]] = float(row[score_col])
                            found = True
                            break
                    
                    if not found:
                        print(f"Không tìm thấy ngành '{major}' trong mapping")
        
        y.append(major_scores)
    
    # Chuyển sang numpy array
    X_array = np.array(X)
    y_array = np.array(y)
    
    print(f"Đã tạo {len(X_array)} mẫu dữ liệu test")
    print(f"Số chiều đặc trưng: {X_array.shape[1]}")
    print(f"Số chiều nhãn: {y_array.shape[1]}")
    
    return X_array, y_array, preprocessor

def evaluate_with_csv(csv_file=None, output_file=None):
    """
    Đánh giá mô hình sử dụng dữ liệu test từ file CSV
    
    Args:
        csv_file: Đường dẫn đến file CSV chứa dữ liệu test
        output_file: Đường dẫn đến file lưu kết quả đánh giá
    """
    if csv_file is None:
        csv_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_data_2000.csv')
    
    # Tạo preprocessor
    print("Đang khởi tạo DataPreprocessor...")
    preprocessor = DataPreprocessor()
    
    # Tải mô hình và scaler
    print("Đang tải mô hình và scaler...")
    model, scaler = load_model_and_scaler()
    
    # Đọc dữ liệu test từ CSV
    X_test, y_test, preprocessor = load_test_data_from_csv(csv_file, preprocessor)
    
    # Chuẩn hóa dữ liệu nếu cần
    if scaler is not None:
        print("Áp dụng chuẩn hóa dữ liệu...")
        scaler_mean, scaler_scale = scaler
        X_test = (X_test - scaler_mean) / scaler_scale
    
    # Thư mục cho biểu đồ
    plots_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'plots')
    if not os.path.exists(plots_dir):
        os.makedirs(plots_dir)
    
    # Dự đoán
    print("Đang dự đoán...")
    if hasattr(model, 'predict_combined'):
        y_pred = model.predict_combined(X_test)
    else:
        y_pred = model.predict(X_test)
    
    # Tính Top-K accuracy
    print("Đang tính độ chính xác Top-K...")
    top_k_values = [1, 3, 5, 10]
    top_k_accuracies = []
    overlap_top3_accuracies = []
    
    # Tính Precision, Recall, F1 Score cho Top-1
    print("Đang tính Precision, Recall, F1 Score...")
    precision_values = []
    recall_values = []
    f1_values = []
    
    for k in top_k_values:
        correct = 0
        overlap_correct = 0
        total = len(y_test)
        
        # Chuẩn bị mảng y_true và y_pred cho tính Precision, Recall, F1 nếu k=1
        if k == 1:
            # Chuyển đổi thành dạng binary classification cho từng ngành
            y_true_binary = np.zeros((total, y_test.shape[1]), dtype=int)
            y_pred_binary = np.zeros((total, y_test.shape[1]), dtype=int)
            
            for i in range(total):
                # Ngành thực tế Top-1
                actual_top = np.argmax(y_test[i])
                y_true_binary[i, actual_top] = 1
                
                # Ngành dự đoán Top-1
                pred_top = np.argmax(y_pred[i])
                y_pred_binary[i, pred_top] = 1
            
            # Tính các chỉ số cho từng nhãn và lấy trung bình (weighted)
            precision = precision_score(y_true_binary, y_pred_binary, average='weighted', zero_division=0)
            recall = recall_score(y_true_binary, y_pred_binary, average='weighted', zero_division=0)
            f1 = f1_score(y_true_binary, y_pred_binary, average='weighted', zero_division=0)
            
            precision_values.append(precision * 100)  # Đổi sang phần trăm
            recall_values.append(recall * 100)
            f1_values.append(f1 * 100)
        
        for i in range(total):
            # Lấy top-k ngành thực tế có điểm cao nhất
            actual_topk = np.argsort(y_test[i])[::-1][:k]
                
            # Lấy top-k ngành dự đoán
            predicted_topk = np.argsort(y_pred[i])[::-1][:k]
            
            if k == 1:
                # Kiểm tra xem ngành thực tế top-1 có trùng với ngành dự đoán top-1 không
                if actual_topk[0] == predicted_topk[0]:
                    correct += 1
            else:
                # Đếm số ngành thực tế nằm trong top-k dự đoán
                overlap_count = sum(1 for major in actual_topk if major in predicted_topk)
                
                # Tính tỉ lệ overlap
                overlap_percent = overlap_count / len(actual_topk) * 100
                correct += overlap_count / len(actual_topk)  # Tính theo tỉ lệ phần trăm
                
                # Thêm giá trị giả lập cho các chỉ số với k > 1
                if k in [3, 5, 10]:
                    precision_values.append(None)
                    recall_values.append(None)
                    f1_values.append(None)
            
            # Tính overlap cho top-3 thực tế
            actual_top3 = np.argsort(y_test[i])[::-1][:3]
            overlap_count = sum(1 for major in actual_top3 if major in predicted_topk)
            if len(actual_top3) > 0:
                overlap_percent = overlap_count / len(actual_top3) * 100
                overlap_correct += overlap_percent
        
        # Tính độ chính xác
        accuracy = (correct / total) * 100
        top_k_accuracies.append(accuracy)
        
        # Tính trung bình % overlap
        overlap_accuracy = overlap_correct / total
        overlap_top3_accuracies.append(overlap_accuracy)
    
    # In kết quả
    print("\n==== KẾT QUẢ ĐÁNH GIÁ MÔ HÌNH TRÊN TẬP TEST CSV ====")
    print(f"Tệp test: {csv_file}")
    print(f"Số lượng mẫu: {len(X_test)}")
    print("\n=== ĐỘ CHÍNH XÁC TOP-K TRUYỀN THỐNG ===")
    for k, acc in zip(top_k_values, top_k_accuracies):
        print(f"Top-{k} Accuracy: {acc:.2f}%")
    
    print("\n=== ĐỘ CHÍNH XÁC OVERLAP GIỮA TOP-3 THỰC TẾ VÀ TOP-K DỰ ĐOÁN ===")
    for k, acc in zip(top_k_values, overlap_top3_accuracies):
        print(f"Overlap Top-3 với Top-{k}: {acc:.2f}%")
    
    print("\n=== CÁC ĐỘ ĐO TRUYỀN THỐNG CHO TOP-1 ===")
    print(f"Precision: {precision_values[0]:.2f}%")
    print(f"Recall: {recall_values[0]:.2f}%")
    print(f"F1 Score: {f1_values[0]:.2f}%")
    
    # Vẽ biểu đồ top-k accuracy
    plt.figure(figsize=(10, 6))
    plt.bar([f'Top-{k}' for k in top_k_values], top_k_accuracies, color=['blue', 'green', 'orange', 'red'])
    plt.ylabel('Accuracy (%)')
    plt.title('Top-K Accuracy on CSV Test Data')
    
    # Thêm giá trị lên mỗi cột
    for i, v in enumerate(top_k_accuracies):
        plt.text(i, v + 1, f"{v:.2f}%", ha='center')
    
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, 'csv_topk_accuracy.png'))
    print(f"Đã lưu biểu đồ vào: {os.path.join(plots_dir, 'csv_topk_accuracy.png')}")
    
    # Lưu kết quả vào file
    if output_file is None:
        output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'csv_evaluation.txt')
        
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("====== ĐÁNH GIÁ MÔ HÌNH GỢI Ý NGÀNH HỌC TRÊN TẬP CSV ======\n\n")
        f.write(f"Thời gian đánh giá: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Tệp test: {csv_file}\n")
        f.write(f"Số lượng mẫu: {len(X_test)}\n\n")
        
        # Thông tin Top-K Accuracy truyền thống
        f.write("=== ĐỘ CHÍNH XÁC TOP-K TRUYỀN THỐNG ===\n")
        for k, acc in zip(top_k_values, top_k_accuracies):
            f.write(f"Top-{k} Accuracy: {acc:.2f}%\n")
        
        # Thông tin Overlap Accuracy
        f.write("\n=== ĐỘ CHÍNH XÁC OVERLAP GIỮA TOP-3 THỰC TẾ VÀ TOP-K DỰ ĐOÁN ===\n")
        for k, acc in zip(top_k_values, overlap_top3_accuracies):
            f.write(f"Overlap Top-3 với Top-{k}: {acc:.2f}%\n")
        
        # Thông tin Precision, Recall, F1 Score cho Top-1
        f.write("\n=== CÁC ĐỘ ĐO TRUYỀN THỐNG CHO TOP-1 ===\n")
        f.write(f"Precision: {precision_values[0]:.2f}%\n")
        f.write(f"Recall: {recall_values[0]:.2f}%\n")
        f.write(f"F1 Score: {f1_values[0]:.2f}%\n")
            
        # Thêm thông tin về cách tính
        f.write("\n=== GHI CHÚ VỀ PHƯƠNG PHÁP TÍNH ===\n")
        f.write("1. Độ chính xác Top-K theo yêu cầu:\n")
        f.write("   - Với Top-1: Kiểm tra xem ngành thực tế có điểm cao nhất có trùng với ngành dự đoán có điểm cao nhất không\n")
        f.write("   - Với Top-K (k>1): Tính tỉ lệ trung bình của các ngành thực tế top-k nằm trong top-k dự đoán\n")
        f.write("2. Các độ đo truyền thống:\n")
        f.write("   - Precision: Tỉ lệ các dự đoán đúng trên tổng số dự đoán\n")
        f.write("   - Recall: Tỉ lệ các ngành thực tế được dự đoán đúng\n")
        f.write("   - F1 Score: Trung bình điều hòa của Precision và Recall\n")
        
    print(f"Đã lưu kết quả đánh giá vào file: {output_file}")
    
    return top_k_accuracies, overlap_top3_accuracies, precision_values[0], recall_values[0], f1_values[0]

if __name__ == "__main__":
    # Lấy đường dẫn đến file CSV từ tham số dòng lệnh (nếu có)
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv', help='Đường dẫn đến file CSV chứa dữ liệu test')
    args = parser.parse_args()
    
    # Sử dụng file CSV từ tham số hoặc mặc định
    csv_file = args.csv if args.csv else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_data_6000.csv')
    
    # Thực hiện đánh giá
    evaluate_with_csv(csv_file) 