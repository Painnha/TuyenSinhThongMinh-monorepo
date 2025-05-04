# Mô hình Dự đoán Xác suất Đậu Đại học

Mô hình này dự đoán xác suất trúng tuyển (từ 0% đến 100%) của học sinh dựa trên điểm số, ngành học và trường đại học mong muốn, cùng với dữ liệu lịch sử về điểm chuẩn và chỉ tiêu tuyển sinh.

## Cấu trúc thư mục

```
dudoanxacxuat/
├── models/                     # Thư mục chứa mô hình đã huấn luyện
├── training_data_creator.py    # Script tạo dữ liệu huấn luyện từ MongoDB
├── neural_network_model.py     # Script huấn luyện mô hình 
├── predict_admission.py        # Script dự đoán xác suất đậu
├── api_integration.py          # Tích hợp với Flask API
├── requirements.txt            # Các thư viện cần thiết
└── README.md                   # Tài liệu hướng dẫn
```

## Cài đặt

1. Cài đặt các thư viện cần thiết:

```bash
pip install -r requirements.txt
```

2. Đảm bảo đã cấu hình kết nối MongoDB trong file .env:

```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=tuyen_sinh_thong_minh
```

## Quy trình sử dụng

### 1. Tạo dữ liệu huấn luyện

```bash
python training_data_creator.py
```

Script này sẽ truy vấn dữ liệu từ MongoDB, xử lý và tạo dữ liệu huấn luyện cho mô hình.

### 2. Huấn luyện mô hình

```bash
python neural_network_model.py
```

Script này sẽ huấn luyện mô hình mạng nơ-ron trên dữ liệu đã tạo và lưu mô hình vào thư mục `models/`.

### 3. Dự đoán xác suất

#### Sử dụng từ dòng lệnh:

```bash
# Chế độ tương tác
python predict_admission.py -i

# Hoặc truyền trực tiếp tham số
python predict_admission.py -u BKA -m "cong nghe thong tin" -c A00 -s 25.5
```

#### Tích hợp vào API:

Để tích hợp vào Flask API, đăng ký blueprint trong file app.py:

```python
from BE_python.ai_models.dudoanxacxuat.api_integration import admission_prediction_blueprint

# ...
app.register_blueprint(admission_prediction_blueprint, url_prefix='/api/admission-prediction')
```

## API Endpoints

### 1. Dự đoán đơn lẻ

**URL:** `/api/admission-prediction/predict`  
**Method:** POST  
**Body:**

```json
{
    "university_code": "BKA",
    "major_name": "cong nghe thong tin",
    "combination": "A00",
    "student_score": 25.5,
    "user_id": "user123", // Optional
    "anonymous_id": "anon123" // Optional
}
```

### 2. Dự đoán hàng loạt

**URL:** `/api/admission-prediction/batch-predict`  
**Method:** POST  
**Body:**

```json
{
    "student_score": 25.5,
    "user_id": "user123", // Optional
    "anonymous_id": "anon123", // Optional
    "targets": [
        {
            "university_code": "BKA",
            "major_name": "cong nghe thong tin",
            "combination": "A00"
        },
        {
            "university_code": "YDS",
            "major_name": "y khoa",
            "combination": "B00"
        }
    ]
}
```

## Lưu ý

1. Đảm bảo collection `student_data` đã được tạo để lưu kết quả dự đoán
2. Các collection khác (`universities`, `majors`, `admission_criteria`, ...) phải có dữ liệu chính xác
3. Mô hình cần được huấn luyện trước khi sử dụng API dự đoán 