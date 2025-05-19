import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.regularizers import l2
import os

class MajorRecommendationModel:
    def __init__(self, input_dim, output_dim, use_multi_output=True):
        """
        Initialize the major recommendation neural network model
        
        Args:
            input_dim: Input dimension (number of features)
            output_dim: Output dimension (number of majors)
            use_multi_output: Whether to use multiple outputs (one per major)
        """
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.use_multi_output = use_multi_output
        self.model = self._build_model()
        
    def _build_model(self):
        """
        Build neural network with attention mechanism và regularization to prevent overfitting
        
        This version supports both single-output and multi-output architectures:
        - Single-output: Traditional model with one output layer for all majors
        - Multi-output: One separate output for each major to handle class imbalance
        """
        # Đầu vào
        inputs = tf.keras.Input(shape=(self.input_dim,))
        
        # Các tầng chia sẻ
        x = Dense(128, activation='relu', 
                  kernel_regularizer=tf.keras.regularizers.l2(0.001))(inputs)
        x = BatchNormalization()(x)
        x = Dropout(0.4)(x)
        
        # Tầng ẩn
        hidden = Dense(64, activation='relu',
                      kernel_regularizer=tf.keras.regularizers.l2(0.001))(x)
        hidden = BatchNormalization()(hidden)
        hidden = Dropout(0.5)(hidden)
        
        if self.use_multi_output:
            # Kiến trúc đa đầu ra - một đầu ra cho mỗi ngành 
            outputs = []
            for i in range(self.output_dim):
                output_i = tf.keras.layers.Dense(1, activation='sigmoid', name=f'output_{i}')(hidden)
                outputs.append(output_i)
            
            # Tạo model với nhiều đầu ra
            model = tf.keras.Model(inputs=inputs, outputs=outputs)
            
        else:
            # Kiến trúc truyền thống với một đầu ra
            # Thêm tầng attention đơn giản
            attention = Dense(64, activation='tanh',
                            kernel_regularizer=tf.keras.regularizers.l1_l2(l1=0.0001, l2=0.001))(hidden)
            attention = Dense(1, activation='sigmoid')(attention)
            
            # Áp dụng attention
            attended = tf.keras.layers.Multiply()([hidden, attention])
            
            # Đầu ra với regularization
            outputs = Dense(self.output_dim, activation='sigmoid',
                            kernel_regularizer=tf.keras.regularizers.l2(0.001))(attended)
            
            # Tạo model với một đầu ra
            model = tf.keras.Model(inputs=inputs, outputs=outputs)
        
        return model
    
    def weighted_binary_crossentropy(self, class_weight):
        """
        Hàm binary cross-entropy có trọng số dùng cho mô hình đa đầu ra
        
        Args:
            class_weight: dictionary với khóa 0 và 1 cho mẫu âm và dương
        
        Returns:
            Hàm loss sử dụng trọng số
        """
        def loss(y_true, y_pred):
            # Áp dụng trọng số tương ứng cho mỗi mẫu
            weight_vector = y_true * class_weight[1] + (1 - y_true) * class_weight[0]
            # Binary crossentropy cơ bản
            base_loss = tf.keras.losses.binary_crossentropy(y_true, y_pred)
            # Áp dụng trọng số
            weighted_loss = base_loss * weight_vector
            return tf.reduce_mean(weighted_loss)
        return loss
    
    def compile_model(self, class_weights=None):
        """
        Compile model với loss và metrics phù hợp
        
        Args:
            class_weights: Dictionary map từ output_name → {0: weight0, 1: weight1}
                           cho mô hình đa đầu ra
        """
        opt = tf.keras.optimizers.Adam(learning_rate=0.0005)
        
        if self.use_multi_output and class_weights:
            # Compile cho mô hình đa đầu ra với class weights
            loss_dict = {}
            metrics_dict = {}
            
            for i in range(self.output_dim):
                output_name = f'output_{i}'
                # Sử dụng weighted_binary_crossentropy cho mỗi đầu ra
                if output_name in class_weights:
                    loss_dict[output_name] = self.weighted_binary_crossentropy(class_weights[output_name])
                else:
                    loss_dict[output_name] = 'binary_crossentropy'
                
                metrics_dict[output_name] = 'accuracy'
            
            self.model.compile(
                optimizer=opt,
                loss=loss_dict,
                metrics=metrics_dict
            )
        else:
            # Compile cho mô hình truyền thống
            self.model.compile(
                optimizer=opt,
                loss='binary_crossentropy',
                metrics=['accuracy']
            )
    
    def train(self, X_train, y_train, X_val=None, y_val=None, epochs=50, batch_size=32, 
              callbacks=None, verbose=1, class_weight=None):
        """
        Train the neural network model
        
        Args:
            X_train: Training features
            y_train: Training labels (ma trận đơn hoặc dictionary cho đa đầu ra)
            X_val: Validation features
            y_val: Validation labels (ma trận đơn hoặc dictionary cho đa đầu ra)
            epochs: Number of training epochs
            batch_size: Batch size for training
            callbacks: List of callbacks to use during training
            verbose: Verbosity level (0=silent, 1=progress bar, 2=one line per epoch)
            class_weight: Class weights for balancing the dataset
            
        Returns:
            Training history
        """
        # Set up early stopping if no callbacks are provided
        if callbacks is None:
            # Thêm ReduceLROnPlateau để điều chỉnh learning rate
            reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss' if X_val is not None else 'loss',
                factor=0.5,
                patience=3,
                min_lr=0.00001,
                verbose=1
            )
            
            # Cài đặt early stopping với patience ngắn hơn
            early_stopping = tf.keras.callbacks.EarlyStopping(
                monitor='val_loss' if X_val is not None else 'loss',
                patience=5,
                restore_best_weights=True,
                verbose=1
            )
            
            callbacks = [early_stopping, reduce_lr]
        
        # Validation data
        validation_data = (X_val, y_val) if X_val is not None and y_val is not None else None
        
        # Điều chỉnh batch size cho dataset nhỏ
        if batch_size > 16 and len(X_train) < 1000:
            batch_size = 16
            print(f"Điều chỉnh batch size xuống {batch_size} vì dataset nhỏ")
        
        # Huấn luyện mô hình
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=validation_data,
            callbacks=callbacks,
            verbose=verbose,
            class_weight=class_weight if not self.use_multi_output else None  # Chỉ dùng class_weight cho mô hình đơn đầu ra
        )
        
        return history
    
    def predict(self, X, market_trend_weights=None, top_k=3):
        """
        Make predictions
        
        Args:
            X: Features
            market_trend_weights: Optional weights to adjust predictions
            top_k: Number of top predictions to return
            
        Returns:
            List of (major_id, probability) tuples
        """
        if self.use_multi_output:
            # Sử dụng predict_combined cho mô hình đa đầu ra
            predictions = self.predict_combined(X)
        else:
            # Sử dụng predict trực tiếp cho mô hình đơn đầu ra
            predictions = self.model.predict(X)
        
        # Áp dụng market trend weights nếu có
        if market_trend_weights is not None:
            for idx, weight in market_trend_weights.items():
                if idx < predictions.shape[1]:
                    predictions[0, idx] *= weight
        
        # Lấy top-k ngành và xác suất
        top_indices = np.argsort(predictions[0])[::-1][:top_k]
        recommendations = [(idx, float(predictions[0, idx])) for idx in top_indices]
        
        return recommendations
    
    def predict_combined(self, X):
        """
        Kết hợp các dự đoán từ mô hình đa đầu ra thành một ma trận
        
        Args:
            X: Features
            
        Returns:
            Ma trận dự đoán với kích thước [batch_size, output_dim]
        """
        if not self.use_multi_output:
            # Nếu không phải mô hình đa đầu ra, trả về kết quả predict thông thường
            return self.model.predict(X)
        
        # Dự đoán từ tất cả các đầu ra
        raw_preds = self.model.predict(X)
        
        # Khởi tạo ma trận kết quả
        preds = np.zeros((X.shape[0], len(raw_preds)))
        
        # Gộp kết quả từ các đầu ra
        for i, pred in enumerate(raw_preds):
            preds[:, i] = pred.reshape(-1)
            
        return preds
    
    def save(self, filepath):
        """Save the model to a file"""
        self.model.save(filepath)
    
    @classmethod
    def load(cls, filepath):
        """Load the model from a file"""
        # Tạo custom objects dictionary để load model với hàm loss tùy chỉnh
        custom_objects = {}
        
        # Tạo một instance tạm thời để truy cập phương thức weighted_binary_crossentropy
        temp_instance = cls(1, 1)
        
        # Thêm hàm weighted_binary_crossentropy vào custom_objects
        custom_objects['weighted_binary_crossentropy'] = temp_instance.weighted_binary_crossentropy({0: 1.0, 1: 1.0})
        
        # Load model với custom objects
        try:
            model = load_model(filepath, custom_objects=custom_objects)
            
            # Xác định nếu đây là mô hình đa đầu ra
            use_multi_output = isinstance(model.output, list)
            
            # Tạo instance mới
            input_dim = model.input_shape[1]
            output_dim = len(model.output) if use_multi_output else model.output_shape[1]
            
            instance = cls(
                input_dim=input_dim,
                output_dim=output_dim,
                use_multi_output=use_multi_output
            )
            instance.model = model
            return instance
        except Exception as e:
            print(f"Lỗi khi load model: {e}")
            
            # Thử load mà không compile
            print("Thử load model mà không compile...")
            model = load_model(filepath, compile=False)
            
            # Xác định nếu đây là mô hình đa đầu ra
            use_multi_output = isinstance(model.output, list)
            
            # Tạo instance mới
            input_dim = model.input_shape[1]
            output_dim = len(model.output) if use_multi_output else model.output_shape[1]
            
            instance = cls(
                input_dim=input_dim,
                output_dim=output_dim,
                use_multi_output=use_multi_output
            )
            instance.model = model
            return instance 