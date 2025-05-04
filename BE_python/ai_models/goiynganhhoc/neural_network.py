import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.regularizers import l2
import os

class MajorRecommendationModel:
    def __init__(self, input_dim, output_dim):
        """
        Initialize the major recommendation neural network model
        
        Args:
            input_dim: Input dimension (number of features)
            output_dim: Output dimension (number of majors)
        """
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.model = self._build_model()
        
    def _build_model(self):
        """
        Build neural network with attention mechanism và regularization to prevent overfitting
        
        This version is optimized for 44 interests instead of 45 and includes:
        - L1/L2 regularization
        - Dropout rates matching test project (0.3, 0.2)
        - Architecture matching test project
        """
        # Input layer
        inputs = tf.keras.Input(shape=(self.input_dim,))
        
        # Feature extraction layers
        # Thêm L2 regularization cho lớp đầu tiên
        x = Dense(128, activation='relu', 
                  kernel_regularizer=tf.keras.regularizers.l2(0.001))(inputs)
        x = BatchNormalization()(x)
        # Tăng dropout để giảm overfitting
        x = Dropout(0.4)(x)
        
        # Hidden layers
        hidden = Dense(64, activation='relu',
                      kernel_regularizer=tf.keras.regularizers.l2(0.001))(x)
        hidden = BatchNormalization()(hidden)
        # Tăng dropout ở lớp ẩn
        hidden = Dropout(0.5)(hidden)
        
        # Simplified attention mechanism
        attention = Dense(64, activation='tanh',
                          kernel_regularizer=tf.keras.regularizers.l1_l2(l1=0.0001, l2=0.001))(hidden)
        attention = Dense(1, activation='sigmoid')(attention)
        
        # Apply attention
        attended = tf.keras.layers.Multiply()([hidden, attention])
        
        # Output layer với regularization
        outputs = Dense(self.output_dim, activation='sigmoid',
                        kernel_regularizer=tf.keras.regularizers.l2(0.001))(attended)
        
        # Create model
        model = tf.keras.Model(inputs=inputs, outputs=outputs)
        
        # Compile model với learning rate thấp hơn
        opt = tf.keras.optimizers.Adam(learning_rate=0.0005)
        model.compile(
            optimizer=opt,
            loss='mean_squared_error',
            metrics=['mae']
        )
        
        return model
    
    def train(self, X_train, y_train, X_val=None, y_val=None, epochs=50, batch_size=32, callbacks=None, verbose=1):
        """
        Train the neural network model
        
        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features
            y_val: Validation labels
            epochs: Number of training epochs
            batch_size: Batch size for training
            callbacks: List of callbacks to use during training
            verbose: Verbosity level (0=silent, 1=progress bar, 2=one line per epoch)
            
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
                patience=4,
                restore_best_weights=True,
                verbose=1
            )
            
            callbacks = [early_stopping, reduce_lr]
        
        # Training with weight decay
        validation_data = (X_val, y_val) if X_val is not None and y_val is not None else None
        
        # Sử dụng batch size nhỏ hơn để cải thiện training
        if batch_size > 16 and len(X_train) < 1000:
            batch_size = 16
            print(f"Điều chỉnh batch size xuống {batch_size} vì dataset nhỏ")
        
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=validation_data,
            callbacks=callbacks,
            verbose=verbose,
            # Thêm class weight để cân bằng dữ liệu
            class_weight=None  # Tự động tính toán từ dữ liệu nếu cần thiết
        )
        
        return history
    
    def predict(self, X, market_trend_weights=None, top_k=3):
        """
        Make predictions without applying market trend weights
        
        Args:
            X: Features
            market_trend_weights: Ignored (Kept for backwards compatibility)
            top_k: Number of top predictions to return
            
        Returns:
            List of (major_id, probability) tuples
        """
        # Get raw predictions
        predictions = self.model.predict(X)
        
        # Xu hướng thị trường đã được tích hợp sẵn vào nhãn train_data
        # nên không áp dụng thêm market_trend_weights ở đây
        
        # Get top-k major IDs and probabilities
        top_indices = np.argsort(predictions[0])[::-1][:top_k]
        recommendations = [(idx, float(predictions[0, idx])) for idx in top_indices]
        
        return recommendations
    
    def save(self, filepath):
        """Save the model to a file"""
        self.model.save(filepath)
    
    @classmethod
    def load(cls, filepath):
        """Load the model from a file"""
        model = load_model(filepath)
        instance = cls(
            input_dim=model.input_shape[1],
            output_dim=model.output_shape[1]
        )
        instance.model = model
        return instance 