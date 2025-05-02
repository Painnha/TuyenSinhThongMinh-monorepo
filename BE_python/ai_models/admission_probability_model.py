import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import StandardScaler

class AdmissionProbabilityModel:
    def __init__(self, input_features=['student_score', 'average_score', 'expected_score', 
                                    'score_diff', 'quota', 'q0', 'market_trend', 'score_trend']):
        """
        Khởi tạo mô hình dự đoán xác suất đậu đại học
        
        Args:
            input_features: Danh sách các đặc trưng đầu vào
        """
        self.input_features = input_features
        self.input_dim = len(input_features)
        self.model = self._build_model()
        self.scaler = None  # Sẽ được khởi tạo trong quá trình huấn luyện
    
    def _build_model(self):
        """Xây dựng kiến trúc mạng neural"""
        model = Sequential([
            Dense(64, activation='relu', input_shape=(self.input_dim,)),
            Dropout(0.3),
            Dense(32, activation='relu'),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')  # Đầu ra là xác suất (0-1)
        ])
        
        # Biên dịch mô hình
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def preprocess_data(self, X):
        """
        Tiền xử lý dữ liệu đầu vào
        
        Args:
            X: Dữ liệu đầu vào (numpy array hoặc DataFrame)
            
        Returns:
            Dữ liệu đã được chuẩn hóa
        """
        if self.scaler is None:
            # Khởi tạo scaler nếu chưa có
            self.scaler = StandardScaler()
            return self.scaler.fit_transform(X)
        else:
            # Sử dụng scaler đã có
            return self.scaler.transform(X)
    
    def train(self, X_train, y_train, epochs=50, batch_size=32, validation_split=0.2):
        """
        Huấn luyện mô hình
        
        Args:
            X_train: Dữ liệu huấn luyện đầu vào
            y_train: Nhãn huấn luyện đầu ra (0 hoặc 1)
            epochs: Số epoch huấn luyện
            batch_size: Kích thước batch
            validation_split: Tỷ lệ dữ liệu validation
            
        Returns:
            Lịch sử huấn luyện
        """
        # Tiền xử lý dữ liệu
        X_train_scaled = self.preprocess_data(X_train)
        
        # Huấn luyện mô hình
        history = self.model.fit(
            X_train_scaled, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1
        )
        
        return history
    
    def predict(self, X):
        """
        Dự đoán xác suất đậu đại học
        
        Args:
            X: Dữ liệu đầu vào
            
        Returns:
            Xác suất đậu đại học (0-1)
        """
        # Kiểm tra số chiều dữ liệu
        if X.ndim == 1:
            X = X.reshape(1, -1)
        
        # Tiền xử lý dữ liệu
        X_scaled = self.scaler.transform(X)
        
        # Dự đoán xác suất
        predictions = self.model.predict(X_scaled)
        
        return predictions.flatten()
    
    def save(self, model_dir):
        """
        Lưu mô hình và scaler
        
        Args:
            model_dir: Thư mục lưu mô hình
        """
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
        
        # Lưu mô hình
        model_path = os.path.join(model_dir, 'admission_probability_model.h5')
        self.model.save(model_path)
        
        # Lưu scaler
        scaler_mean_path = os.path.join(model_dir, 'scaler_mean.npy')
        scaler_scale_path = os.path.join(model_dir, 'scaler_scale.npy')
        
        np.save(scaler_mean_path, self.scaler.mean_)
        np.save(scaler_scale_path, self.scaler.scale_)
        
        # Lưu danh sách đặc trưng
        features_path = os.path.join(model_dir, 'features.txt')
        with open(features_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(self.input_features))
    
    @classmethod
    def load(cls, model_dir):
        """
        Tải mô hình từ thư mục
        
        Args:
            model_dir: Thư mục chứa mô hình
            
        Returns:
            Instance của AdmissionProbabilityModel
        """
        model_path = os.path.join(model_dir, 'admission_probability_model.h5')
        scaler_mean_path = os.path.join(model_dir, 'scaler_mean.npy')
        scaler_scale_path = os.path.join(model_dir, 'scaler_scale.npy')
        features_path = os.path.join(model_dir, 'features.txt')
        
        # Kiểm tra các file cần thiết
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Không tìm thấy file mô hình: {model_path}")
        
        if not os.path.exists(scaler_mean_path) or not os.path.exists(scaler_scale_path):
            raise FileNotFoundError(f"Không tìm thấy file scaler")
        
        # Đọc danh sách đặc trưng
        with open(features_path, 'r', encoding='utf-8') as f:
            features = f.read().splitlines()
        
        # Tạo instance mới
        instance = cls(input_features=features)
        
        # Tải mô hình
        instance.model = load_model(model_path)
        
        # Khởi tạo scaler
        instance.scaler = StandardScaler()
        instance.scaler.mean_ = np.load(scaler_mean_path)
        instance.scaler.scale_ = np.load(scaler_scale_path)
        
        return instance
    
    def create_training_data_from_mongodb(self, db_client):
        """
        Tạo dữ liệu huấn luyện từ MongoDB
        
        Args:
            db_client: Client kết nối MongoDB
            
        Returns:
            X_train, y_train để huấn luyện mô hình
        """
        # Lấy dữ liệu huấn luyện từ collection training_data
        training_collection = db_client.get_collection('training_data')
        training_data = list(training_collection.find({'modelType': 'admission_probability'}))
        
        if not training_data:
            raise ValueError("Không tìm thấy dữ liệu huấn luyện cho mô hình dự đoán xác suất")
        
        # Lấy tất cả records
        all_records = []
        for data in training_data:
            if 'records' in data and isinstance(data['records'], list):
                all_records.extend(data['records'])
        
        if not all_records:
            raise ValueError("Không có bản ghi nào trong dữ liệu huấn luyện")
        
        # Khởi tạo mảng
        X = []
        y = []
        
        for record in all_records:
            # Lấy các đặc trưng đầu vào
            features = []
            for feature in self.input_features:
                if feature in record and record[feature] is not None:
                    features.append(float(record[feature]))
                else:
                    # Nếu thiếu đặc trưng, gán giá trị mặc định là 0
                    features.append(0.0)
            
            X.append(features)
            
            # Lấy nhãn (kết quả đậu/rớt)
            if 'admission_result' in record and record['admission_result'] is not None:
                y.append(1.0 if record['admission_result'] else 0.0)
            else:
                # Nếu không có kết quả, mặc định là 0 (rớt)
                y.append(0.0)
        
        return np.array(X), np.array(y) 