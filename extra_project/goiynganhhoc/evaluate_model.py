import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, ndcg_score
from sklearn.model_selection import train_test_split, StratifiedKFold
import tensorflow as tf
import matplotlib.pyplot as plt
import pandas as pd
import os

from models.data_preprocessing import DataPreprocessor
from models.neural_network import MajorRecommendationModel

# Đường dẫn file
INTEREST_FILE = 'data/interests.csv'
SUBJECT_COMBINATION_FILE = 'data/subject_combinations.csv'
DIEM_CHUAN_FILE = 'data/DiemChuan.csv'
MARKET_TREND_FILE = 'data/market_trend.csv'
TRAINING_FILE = 'data/training_final.csv'  # Cập nhật đường dẫn đến file training mới
MODEL_PATH = 'models/major_recommendation_model.keras'

def evaluate_model():
    print("===== Đánh giá mô hình gợi ý ngành học =====")
    
    # Khởi tạo bộ tiền xử lý dữ liệu
    preprocessor = DataPreprocessor(
        INTEREST_FILE, 
        SUBJECT_COMBINATION_FILE, 
        DIEM_CHUAN_FILE, 
        MARKET_TREND_FILE
    )
    
    # Tải và tiền xử lý dữ liệu
    print("Đang tải và tiền xử lý dữ liệu...")
    X, y = preprocessor.preprocess_training_data(TRAINING_FILE)
    
    # Chia dữ liệu thành tập huấn luyện và tập kiểm tra
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Tải mô hình đã huấn luyện
    print("Đang tải mô hình...")
    try:
        model = MajorRecommendationModel.load(MODEL_PATH)
    except FileNotFoundError:
        print(f"Không tìm thấy mô hình tại {MODEL_PATH}. Vui lòng huấn luyện mô hình trước.")
        return
    
    # Dự đoán trên tập kiểm tra
    print("Đang dự đoán trên tập kiểm tra...")
    y_pred_raw = model.model.predict(X_test)
    
    # In ra kích thước dữ liệu để kiểm tra
    print(f"Kích thước X_test: {X_test.shape}")
    print(f"Kích thước y_test: {y_test.shape}")
    print(f"Kích thước y_pred_raw: {y_pred_raw.shape}")
    
    # Kiểm tra phân phối dự đoán
    print("\nPhân phối dự đoán:")
    print(f"Giá trị min: {np.min(y_pred_raw)}")
    print(f"Giá trị max: {np.max(y_pred_raw)}")
    print(f"Giá trị trung bình: {np.mean(y_pred_raw)}")
    
    # Chuyển đổi dự đoán thành định dạng nhị phân - luôn lấy đúng 3 ngành có điểm cao nhất
    y_pred = np.zeros_like(y_pred_raw)
    for i in range(y_pred_raw.shape[0]):
        top_indices = np.argsort(y_pred_raw[i])[::-1][:3]  # Top 3 ngành có xác suất cao nhất
        y_pred[i, top_indices] = 1
    
    # Đánh giá dự đoán
    print("\n===== KẾT QUẢ ĐÁNH GIÁ =====")
    
    # Tính độ chính xác theo mẫu
    exact_matches = 0
    partial_matches = 0
    
    for i in range(y_test.shape[0]):
        # Top 3 ngành thực tế (có điểm dự đoán cao nhất)
        actual_indices = np.argsort(y_test[i])[::-1][:3]
        
        # Top 3 ngành dự đoán
        predicted_indices = np.argsort(y_pred_raw[i])[::-1][:3]
        
        # Tính số ngành trùng khớp
        matches = len(set(actual_indices) & set(predicted_indices))
        
        if matches == 3:  # Trùng khớp hoàn toàn (cả 3 ngành)
            exact_matches += 1
        elif matches > 0:  # Trùng khớp một phần (ít nhất 1 ngành)
            partial_matches += 1
    
    total_samples = y_test.shape[0]
    exact_accuracy = exact_matches / total_samples
    partial_accuracy = partial_matches / total_samples
    total_accuracy = (exact_matches + partial_matches) / total_samples
    
    print(f"Số mẫu kiểm tra: {total_samples}")
    print(f"Độ chính xác trùng khớp hoàn toàn (cả 3 ngành): {exact_accuracy:.4f} ({exact_matches} mẫu)")
    print(f"Độ chính xác trùng khớp một phần (1-2 ngành): {partial_accuracy:.4f} ({partial_matches} mẫu)")
    print(f"Tổng độ chính xác (ít nhất 1 ngành đúng): {total_accuracy:.4f}")
    
    # Đánh giá theo từng K (Top-K)
    print("\n===== ĐÁNH GIÁ THEO TOP-K =====")
    for k in [1, 2, 3, 5]:
        precision, recall = evaluate_precision_recall_at_k(y_test, y_pred_raw, k=k)
        print(f"Top-{k}: Precision@{k}={precision:.4f}, Recall@{k}={recall:.4f}")
    
    # Đánh giá NDCG (Normalized Discounted Cumulative Gain)
    ndcg = evaluate_with_ndcg(y_test, y_pred_raw)
    print(f"NDCG@3: {ndcg:.4f}")
    
    # Đánh giá theo từng ngành học (chỉ với top 10 ngành phổ biến)
    print("\n===== ĐÁNH GIÁ THEO TỪNG NGÀNH (TOP 10) =====")
    
    # Tính tổng số lần xuất hiện của từng ngành
    major_counts = np.sum(y_test > 0, axis=0)
    top_majors = np.argsort(major_counts)[::-1][:10]  # Top 10 ngành phổ biến nhất
    
    # Đánh giá từng ngành
    for j in top_majors:
        # Tính precision, recall, f1 cho ngành này
        major_name = preprocessor.get_major_by_id(j)
        
        # Lấy dự đoán theo thứ hạng (top 3)
        y_test_major = np.zeros(y_test.shape[0])
        y_pred_major = np.zeros(y_test.shape[0])
        
        for i in range(y_test.shape[0]):
            # Kiểm tra ngành có trong top 3 thực tế không
            actual_top3 = np.argsort(y_test[i])[::-1][:3]
            if j in actual_top3:
                y_test_major[i] = 1
                
            # Kiểm tra ngành có trong top 3 dự đoán không
            pred_top3 = np.argsort(y_pred_raw[i])[::-1][:3]
            if j in pred_top3:
                y_pred_major[i] = 1
        
        # Tính các chỉ số
        if sum(y_test_major) > 0 and sum(y_pred_major) > 0:
            prec = precision_score(y_test_major, y_pred_major)
            rec = recall_score(y_test_major, y_pred_major)
            f1 = f1_score(y_test_major, y_pred_major)
            count = int(np.sum(y_test_major))
            
            print(f"{major_name} ({count} mẫu): Precision={prec:.4f}, Recall={rec:.4f}, F1={f1:.4f}")
    
    # Tính số liệu tổng hợp
    # Áp dụng ngưỡng 3 ngành cao nhất cho mỗi mẫu
    y_test_binary = np.zeros_like(y_test)
    y_pred_binary = np.zeros_like(y_pred_raw)
    
    for i in range(y_test.shape[0]):
        # Chọn 3 ngành cao nhất của mỗi mẫu
        test_top3 = np.argsort(y_test[i])[::-1][:3]
        pred_top3 = np.argsort(y_pred_raw[i])[::-1][:3]
        
        y_test_binary[i, test_top3] = 1
        y_pred_binary[i, pred_top3] = 1
    
    # Đánh giá macro và micro
    print("\n===== ĐÁNH GIÁ TỔNG HỢP =====")
    macro_precision = precision_score(y_test_binary, y_pred_binary, average='macro')
    macro_recall = recall_score(y_test_binary, y_pred_binary, average='macro')
    macro_f1 = f1_score(y_test_binary, y_pred_binary, average='macro')
    
    micro_precision = precision_score(y_test_binary, y_pred_binary, average='micro')
    micro_recall = recall_score(y_test_binary, y_pred_binary, average='micro')
    micro_f1 = f1_score(y_test_binary, y_pred_binary, average='micro')
    
    print(f"Macro - Precision: {macro_precision:.4f}, Recall: {macro_recall:.4f}, F1: {macro_f1:.4f}")
    print(f"Micro - Precision: {micro_precision:.4f}, Recall: {micro_recall:.4f}, F1: {micro_f1:.4f}")
    
    # Vẽ đồ thị so sánh
    plt.figure(figsize=(12, 8))
    metrics = [
        exact_accuracy, partial_accuracy, total_accuracy, 
        macro_precision, macro_recall, macro_f1,
        micro_precision, micro_recall, micro_f1, ndcg
    ]
    metric_names = [
        'Exact Accuracy', 'Partial Accuracy', 'Total Accuracy', 
        'Macro Precision', 'Macro Recall', 'Macro F1',
        'Micro Precision', 'Micro Recall', 'Micro F1', 'NDCG@3'
    ]
    
    plt.bar(metric_names, metrics)
    plt.title('Đánh giá mô hình gợi ý ngành học', fontsize=16)
    plt.ylabel('Điểm số', fontsize=14)
    plt.ylim(0, 1)
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.tight_layout()
    
    plt.savefig('models/model_evaluation.png')
    print("\nBiểu đồ đánh giá đã được lưu vào 'models/model_evaluation.png'")
    
    # Kiểm tra confusion matrix cho một vài ngành phổ biến
    print("\n===== CONFUSION MATRIX CHO CÁC NGÀNH PHỔ BIẾN =====")
    for j in top_majors[:5]:  # Chỉ lấy 5 ngành đầu tiên
        major_name = preprocessor.get_major_by_id(j)
        
        # Tạo confusion matrix
        y_test_major = np.zeros(y_test.shape[0])
        y_pred_major = np.zeros(y_test.shape[0])
        
        for i in range(y_test.shape[0]):
            actual_top3 = np.argsort(y_test[i])[::-1][:3]
            if j in actual_top3:
                y_test_major[i] = 1
                
            pred_top3 = np.argsort(y_pred_raw[i])[::-1][:3]
            if j in pred_top3:
                y_pred_major[i] = 1
        
        # Tính TP, FP, TN, FN
        tp = np.sum((y_test_major == 1) & (y_pred_major == 1))
        fp = np.sum((y_test_major == 0) & (y_pred_major == 1))
        tn = np.sum((y_test_major == 0) & (y_pred_major == 0))
        fn = np.sum((y_test_major == 1) & (y_pred_major == 0))
        
        print(f"\nNgành: {major_name}")
        print(f"TP: {tp}, FP: {fp}, TN: {tn}, FN: {fn}")
        print(f"Accuracy: {(tp + tn) / (tp + tn + fp + fn):.4f}")
        if tp + fp > 0:
            print(f"Precision: {tp / (tp + fp):.4f}")
        if tp + fn > 0:
            print(f"Recall: {tp / (tp + fn):.4f}")
        if tp + fp + fn > 0:
            print(f"F1: {2 * tp / (2 * tp + fp + fn):.4f}")

def evaluate_with_ndcg(y_test, y_pred_raw):
    # Đánh giá bằng NDCG - đo lường chất lượng xếp hạng
    ndcg_scores = []
    for i in range(y_test.shape[0]):
        # Đảm bảo y_test và y_pred có giá trị khác 0 để tránh lỗi
        if np.sum(y_test[i]) > 0:
        ndcg = ndcg_score(y_test[i:i+1], y_pred_raw[i:i+1], k=3)
        ndcg_scores.append(ndcg)
    
    return np.mean(ndcg_scores)

def evaluate_precision_recall_at_k(y_test, y_pred_raw, k=3):
    precision_at_k = []
    recall_at_k = []
    
    for i in range(y_test.shape[0]):
        # Lấy top k ngành dự đoán có điểm cao nhất
        pred_top_k = np.argsort(y_pred_raw[i])[::-1][:k]
        
        # Lấy top k ngành thực tế có điểm cao nhất
        true_top_k = np.argsort(y_test[i])[::-1][:k]
        
        # Số ngành trùng khớp
        matches = len(set(pred_top_k) & set(true_top_k))
        
        # Precision@k: tỷ lệ ngành dự đoán đúng trong k ngành được gợi ý
        precision = matches / k
        # Recall@k: tỷ lệ ngành đúng được phát hiện trong k gợi ý
        recall = matches / len(true_top_k) if len(true_top_k) > 0 else 0
        
        precision_at_k.append(precision)
        recall_at_k.append(recall)
    
    avg_precision = np.mean(precision_at_k)
    avg_recall = np.mean(recall_at_k)
    
    return avg_precision, avg_recall

def check_data_distribution():
    """Kiểm tra phân phối dữ liệu train"""
    # Tải dữ liệu
    print("\n===== KIỂM TRA PHÂN PHỐI DỮ LIỆU =====")
    
    if not os.path.exists(TRAINING_FILE):
        print(f"Không tìm thấy file dữ liệu {TRAINING_FILE}")
        return
    
    df = pd.read_csv(TRAINING_FILE)
    
    # Kiểm tra kích thước dữ liệu
    print(f"Số mẫu: {len(df)}")
    print(f"Số cột: {len(df.columns)}")
    print(f"Tên các cột: {df.columns.tolist()}")
    
    # Kiểm tra phân phối tổ hợp thi
    if 'Tohopthi' in df.columns:
        tohopthi_counts = df['Tohopthi'].value_counts()
        print("\nPhân phối tổ hợp thi:")
        for tohopthi, count in tohopthi_counts.items():
            print(f"{tohopthi}: {count} mẫu ({count/len(df)*100:.2f}%)")
    
    # Kiểm tra phân phối ngành học
    major_counts = {}
    for i in range(1, 4):
        major_col = f'Major_{i}'
        if major_col in df.columns:
            for major in df[major_col].dropna().values:
                major = str(major).lower().strip()
                if major:
                    major_counts[major] = major_counts.get(major, 0) + 1
    
    print("\nPhân phối ngành học (top 10):")
    for major, count in sorted(major_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"{major}: {count} lần xuất hiện")
    
    # Kiểm tra phân phối sở thích
    if 'Interests' in df.columns:
        interests = {}
        for interest_list in df['Interests'].dropna():
            if isinstance(interest_list, str):
                for interest in interest_list.split(','):
                    interest = interest.strip()
                    if interest:
                        interests[interest] = interests.get(interest, 0) + 1
        
        print("\nPhân phối sở thích (top 10):")
        for interest, count in sorted(interests.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"{interest}: {count} lần xuất hiện")
    
    # Kiểm tra phân phối điểm số
    subject_columns = ['Toan', 'NguVan', 'VatLy', 'HoaHoc', 'SinhHoc', 'LichSu', 'DiaLy', 'GDCD', 'NgoaiNgu']
    
    print("\nThống kê điểm số:")
    for subject in subject_columns:
        if subject in df.columns:
            avg = df[subject].mean()
            std = df[subject].std()
            min_score = df[subject].min()
            max_score = df[subject].max()
            print(f"{subject}: Trung bình={avg:.2f}, Độ lệch={std:.2f}, Min={min_score:.2f}, Max={max_score:.2f}")

def main():
    """Main function to run evaluation"""
    print("===== Đánh giá Mô hình Gợi ý Ngành Học =====")
    
    # Kiểm tra phân phối dữ liệu
    check_data_distribution()
    
    # Đánh giá mô hình
    evaluate_model()

if __name__ == "__main__":
    main()