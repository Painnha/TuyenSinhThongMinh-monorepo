import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping
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
        """Build neural network with attention mechanism"""
        # Input layer
        inputs = tf.keras.Input(shape=(self.input_dim,))
        
        # Feature extraction layers
        x = Dense(128, activation='relu')(inputs)
        x = BatchNormalization()(x)
        x = Dropout(0.3)(x)
        
        # Hidden layers with residual connections
        hidden = Dense(64, activation='relu')(x)
        hidden = BatchNormalization()(hidden)
        hidden = Dropout(0.2)(hidden)
        
        # Simple attention mechanism
        attention = Dense(64, activation='tanh')(hidden)
        attention = Dense(1, activation='sigmoid')(attention)
        
        # Apply attention
        attended = tf.keras.layers.Multiply()([hidden, attention])
        
        # Output layer
        outputs = Dense(self.output_dim, activation='sigmoid')(attended)
        
        # Create model
        model = tf.keras.Model(inputs=inputs, outputs=outputs)
        
        # Compile model
        model.compile(
            optimizer='adam',
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
            callbacks = [EarlyStopping(
                monitor='val_loss' if X_val is not None else 'loss',
                patience=5,
                restore_best_weights=True
            )]
        
        # Train the model
        validation_data = (X_val, y_val) if X_val is not None and y_val is not None else None
        
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=validation_data,
            callbacks=callbacks,
            verbose=verbose
        )
        
        return history
    
    def predict(self, X, market_trend_weights=None, top_k=3):
        """Make predictions without applying market trend weights"""
        # Get raw predictions
        predictions = self.model.predict(X)
        
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