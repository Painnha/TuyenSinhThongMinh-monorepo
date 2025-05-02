#!/bin/bash
set -e

# Kiểm tra sự tồn tại của mô hình
if [ ! -f "ai_models/major_recommendation_model.keras" ]; then
    echo "Mô hình gợi ý ngành học chưa được huấn luyện, đang huấn luyện..."
    python ai_models/train_models.py --major
fi

if [ ! -d "ai_models/admission_probability" ]; then
    echo "Mô hình dự đoán xác suất chưa được huấn luyện, đang huấn luyện..."
    python ai_models/train_models.py --admission
fi

# Chạy ứng dụng Flask với gunicorn
exec gunicorn --bind 0.0.0.0:5000 --workers 4 "app:create_app()" 