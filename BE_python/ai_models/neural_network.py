import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.optimizers import Adam

class MajorRecommendationModel:
    def __init__(self, input_dim, output_dim):
        """
        Khởi tạo mô hình gợi ý ngành học
        
        Args:
            input_dim: Số chiều đầu vào
            output_dim: Số chiều đầu ra (số lượng ngành học)
        """
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.model = self._build_model()
    
    def _build_model(self):
        """Xây dựng kiến trúc mạng neural"""
        model = Sequential([
            Dense(256, activation='relu', input_shape=(self.input_dim,)),
            Dropout(0.3),
            Dense(128, activation='relu'),
            Dropout(0.3),
            Dense(64, activation='relu'),
            Dense(self.output_dim, activation='softmax')
        ])
        
        # Biên dịch mô hình
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def train(self, X_train, y_train, epochs=50, batch_size=32, validation_split=0.2):
        """
        Huấn luyện mô hình
        
        Args:
            X_train: Dữ liệu huấn luyện đầu vào
            y_train: Nhãn huấn luyện đầu ra
            epochs: Số epoch huấn luyện
            batch_size: Kích thước batch
            validation_split: Tỷ lệ dữ liệu validation
            
        Returns:
            Lịch sử huấn luyện
        """
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1
        )
        
        return history
    
    def predict(self, X, market_trend_weights=None, top_k=3):
        """
        Dự đoán ngành học phù hợp nhất
        
        Args:
            X: Dữ liệu đầu vào
            market_trend_weights: Trọng số xu hướng thị trường (dict)
            top_k: Số lượng gợi ý trả về
            
        Returns:
            Danh sách top_k ngành học phù hợp nhất
        """
        # Dự đoán xác suất cho mỗi ngành
        predictions = self.model.predict(X)[0]
        
        # Áp dụng trọng số xu hướng thị trường nếu có
        if market_trend_weights:
            for i in range(len(predictions)):
                major_id = str(i)  # Chuyển đổi index sang chuỗi id
                if major_id in market_trend_weights:
                    market_weight = market_trend_weights[major_id]
                    # Kết hợp dự đoán với xu hướng thị trường (70% dự đoán, 30% xu hướng)
                    predictions[i] = 0.7 * predictions[i] + 0.3 * market_weight
        
        # Lấy top_k ngành có xác suất cao nhất
        top_indices = np.argsort(predictions)[-top_k:][::-1]
        top_predictions = [(idx, predictions[idx]) for idx in top_indices]
        
        return top_predictions
    
    def save(self, file_path):
        """Lưu mô hình vào file"""
        self.model.save(file_path)
    
    @classmethod
    def load(cls, file_path):
        """
        Tải mô hình từ file
        
        Args:
            file_path: Đường dẫn đến file mô hình
            
        Returns:
            Instance của MajorRecommendationModel
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Không tìm thấy file mô hình: {file_path}")
        
        # Tải mô hình từ file
        model = load_model(file_path)
        
        # Lấy kích thước đầu vào và đầu ra
        input_dim = model.layers[0].input_shape[1]
        output_dim = model.layers[-1].output_shape[1]
        
        # Tạo instance mới
        instance = cls(input_dim, output_dim)
        instance.model = model
        
        return instance 