import os
import sys
import argparse
import numpy as np
import tensorflow as tf
from datetime import datetime

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import MODEL_DIR
from utils.db_utils import db_client
from ai_models.data_preprocessing import DataPreprocessor
from ai_models.neural_network import MajorRecommendationModel
from ai_models.admission_probability_model import AdmissionProbabilityModel

# Thiết lập các seed cho kết quả ổn định
np.random.seed(42)
tf.random.set_seed(42)

def train_major_recommendation_model(preprocessor, force_retrain=False):
    """
    Huấn luyện mô hình gợi ý ngành học
    
    Args:
        preprocessor: Instance của DataPreprocessor
        force_retrain: Có bắt buộc huấn luyện lại mô hình hay không
    """
    model_path = os.path.join(MODEL_DIR, 'major_recommendation_model.keras')
    
    # Kiểm tra nếu mô hình đã tồn tại và không bắt buộc huấn luyện lại
    if os.path.exists(model_path) and not force_retrain:
        print(f"Mô hình gợi ý ngành học đã tồn tại tại {model_path}. Bỏ qua huấn luyện.")
        return
    
    print("Đang chuẩn bị dữ liệu huấn luyện cho mô hình gợi ý ngành học...")
    
    try:
        # Tạo dữ liệu huấn luyện từ MongoDB
        X_train, y_train = preprocessor.create_training_data_from_mongodb()
        
        print(f"Đã tạo dữ liệu huấn luyện: X_train shape={X_train.shape}, y_train shape={y_train.shape}")
        
        # Khởi tạo và huấn luyện mô hình
        input_dim = X_train.shape[1]
        output_dim = y_train.shape[1]
        
        print(f"Khởi tạo mô hình với input_dim={input_dim}, output_dim={output_dim}")
        model = MajorRecommendationModel(input_dim, output_dim)
        
        print("Bắt đầu huấn luyện mô hình gợi ý ngành học...")
        history = model.train(
            X_train, y_train,
            epochs=30,
            batch_size=32,
            validation_split=0.2
        )
        
        # Lưu mô hình
        model.save(model_path)
        print(f"Đã lưu mô hình gợi ý ngành học tại {model_path}")
        
        # Cập nhật cấu hình mô hình trong DB
        update_model_config(
            'major_recommendation',
            '1.0.0',
            {
                'input_dim': input_dim,
                'output_dim': output_dim,
                'training_samples': len(X_train),
                'validation_accuracy': float(history.history['val_accuracy'][-1]),
                'training_date': datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        print(f"Lỗi khi huấn luyện mô hình gợi ý ngành học: {e}")
        raise

def train_admission_probability_model(force_retrain=False):
    """
    Huấn luyện mô hình dự đoán xác suất đậu đại học
    
    Args:
        force_retrain: Có bắt buộc huấn luyện lại mô hình hay không
    """
    model_dir = os.path.join(MODEL_DIR, 'admission_probability')
    model_path = os.path.join(model_dir, 'admission_probability_model.h5')
    
    # Tạo thư mục nếu chưa tồn tại
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
    
    # Kiểm tra nếu mô hình đã tồn tại và không bắt buộc huấn luyện lại
    if os.path.exists(model_path) and not force_retrain:
        print(f"Mô hình dự đoán xác suất đã tồn tại tại {model_path}. Bỏ qua huấn luyện.")
        return
    
    print("Đang chuẩn bị dữ liệu huấn luyện cho mô hình dự đoán xác suất...")
    
    try:
        # Khởi tạo mô hình
        model = AdmissionProbabilityModel()
        
        # Tạo dữ liệu huấn luyện từ MongoDB
        X_train, y_train = model.create_training_data_from_mongodb(db_client)
        
        print(f"Đã tạo dữ liệu huấn luyện: X_train shape={X_train.shape}, y_train shape={y_train.shape}")
        
        print("Bắt đầu huấn luyện mô hình dự đoán xác suất...")
        history = model.train(
            X_train, y_train,
            epochs=50,
            batch_size=32,
            validation_split=0.2
        )
        
        # Lưu mô hình
        model.save(model_dir)
        print(f"Đã lưu mô hình dự đoán xác suất tại {model_dir}")
        
        # Cập nhật cấu hình mô hình trong DB
        update_model_config(
            'admission_probability',
            '1.0.0',
            {
                'input_features': model.input_features,
                'training_samples': len(X_train),
                'validation_accuracy': float(history.history['val_accuracy'][-1]),
                'training_date': datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        print(f"Lỗi khi huấn luyện mô hình dự đoán xác suất: {e}")
        raise

def update_model_config(model_name, version, config_data):
    """
    Cập nhật cấu hình mô hình trong DB
    
    Args:
        model_name: Tên mô hình
        version: Phiên bản mô hình
        config_data: Dữ liệu cấu hình
    """
    try:
        # Tìm cấu hình hiện tại
        collection = db_client.get_collection('model_configs')
        existing_config = collection.find_one({'modelName': model_name})
        
        if existing_config:
            # Cập nhật cấu hình hiện tại
            collection.update_one(
                {'modelName': model_name},
                {
                    '$set': {
                        'version': version,
                        'parameters': config_data,
                        'updatedAt': datetime.now()
                    }
                }
            )
        else:
            # Tạo cấu hình mới
            collection.insert_one({
                'modelName': model_name,
                'version': version,
                'parameters': config_data,
                'active': True,
                'createdAt': datetime.now(),
                'updatedAt': datetime.now()
            })
        
        print(f"Đã cập nhật cấu hình mô hình {model_name} trong DB")
        
    except Exception as e:
        print(f"Lỗi khi cập nhật cấu hình mô hình: {e}")

def main():
    parser = argparse.ArgumentParser(description='Huấn luyện các mô hình AI')
    parser.add_argument('--all', action='store_true', help='Huấn luyện tất cả các mô hình')
    parser.add_argument('--major', action='store_true', help='Huấn luyện mô hình gợi ý ngành học')
    parser.add_argument('--admission', action='store_true', help='Huấn luyện mô hình dự đoán xác suất')
    parser.add_argument('--force', action='store_true', help='Bắt buộc huấn luyện lại mô hình')
    
    args = parser.parse_args()
    
    # Mặc định huấn luyện tất cả nếu không có tham số
    if not (args.all or args.major or args.admission):
        args.all = True
    
    # Tạo thư mục lưu mô hình nếu chưa tồn tại
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
    
    if args.all or args.major:
        # Tạo và huấn luyện mô hình gợi ý ngành học
        preprocessor = DataPreprocessor(db_client)
        train_major_recommendation_model(preprocessor, args.force)
    
    if args.all or args.admission:
        # Tạo và huấn luyện mô hình dự đoán xác suất
        train_admission_probability_model(args.force)
    
    print("Hoàn thành huấn luyện mô hình!")

if __name__ == "__main__":
    main() 