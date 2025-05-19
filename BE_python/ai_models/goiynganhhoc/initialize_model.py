import os
import sys
import numpy as np

# Thêm đường dẫn để import cần thiết
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.append(parent_dir)

from ai_models.goiynganhhoc.neural_network import MajorRecommendationModel
from ai_models.goiynganhhoc.data_preprocessing import DataPreprocessor

def initialize_model():
    """
    Khởi tạo mô hình gợi ý ngành học nếu chưa tồn tại
    """
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
    
    # Tạo thư mục model nếu chưa tồn tại
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        print(f"Đã tạo thư mục {model_dir}")
    
    # Kiểm tra xem đã có model chưa
    model_path = os.path.join(model_dir, 'major_recommendation_model.h5')
    scaler_mean_path = os.path.join(model_dir, 'scaler_mean.npy')
    scaler_scale_path = os.path.join(model_dir, 'scaler_scale.npy')
    
    if os.path.exists(model_path) and os.path.exists(scaler_mean_path) and os.path.exists(scaler_scale_path):
        print("Mô hình gợi ý ngành học đã tồn tại.")
        return
    
    print("Bắt đầu khởi tạo mô hình gợi ý ngành học...")
    
    try:
        # Khởi tạo preprocessor
        preprocessor = DataPreprocessor()
        print("Đã khởi tạo DataPreprocessor")
        
        # Lấy kích thước đầu vào và đầu ra
        example_data = {
            'scores': {
                'Toan': 8.0, 
                'NguVan': 7.5, 
                'NgoaiNgu': 8.0,
                'VatLy': 7.5, 
                'HoaHoc': 7.0, 
                'SinhHoc': 7.0,
                'LichSu': 0.0, 
                'DiaLy': 0.0, 
                'GDCD': 0.0
            },
            'interests': ['Công nghệ', 'Lập trình', 'Nghiên cứu'],
            'subject_groups': ['A00', 'A01'],
            'tohopthi': 'TN'
        }
        
        # Tạo đặc trưng ví dụ để xác định kích thước đầu vào
        example_features = preprocessor.preprocess_student_data(example_data)
        input_dim = example_features.shape[0]
        output_dim = len(preprocessor.major_to_id)
        
        print(f"Kích thước đầu vào: {input_dim}, kích thước đầu ra: {output_dim}")
        
        # Khởi tạo mô hình
        model = MajorRecommendationModel(input_dim, output_dim, use_multi_output=True)
        print("Đã khởi tạo model")
        
        # Compile mô hình
        model.compile_model()
        print("Đã compile model")
        
        # Tạo scaler mặc định (sử dụng mean=0, std=1)
        scaler_mean = np.zeros(input_dim)
        scaler_scale = np.ones(input_dim)
        
        # Lưu mô hình
        model.save(model_path)
        print(f"Đã lưu model tại {model_path}")
        
        # Lưu scaler
        np.save(scaler_mean_path, scaler_mean)
        np.save(scaler_scale_path, scaler_scale)
        print(f"Đã lưu scaler tại {model_dir}")
        
        print("Khởi tạo mô hình gợi ý ngành học thành công!")
        
    except Exception as e:
        print(f"Lỗi khi khởi tạo mô hình: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    initialize_model() 