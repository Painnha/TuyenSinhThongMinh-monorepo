# TuyenSinhThongMinh - Python AI Backend

Backend Python cung cấp API cho các mô hình AI gợi ý ngành học và dự đoán xác suất đậu đại học.

## Cấu trúc thư mục

```
BE_python/
├── ai_models/                       # Mô hình AI
│   ├── __init__.py
│   ├── data_preprocessing.py        # Tiền xử lý dữ liệu 
│   ├── neural_network.py            # Mô hình gợi ý ngành học
│   ├── admission_probability_model.py # Mô hình dự đoán xác suất
│   └── train_models.py              # Script huấn luyện mô hình
├── api/                             # API endpoints
│   ├── __init__.py
│   ├── recommendation_api.py        # API gợi ý ngành học
│   ├── admission_api.py             # API dự đoán xác suất
│   └── data_api.py                  # API dữ liệu chung
├── config/                          # Cấu hình
│   ├── __init__.py
│   └── config.py                    # Cấu hình ứng dụng
├── data/                            # Dữ liệu
├── utils/                           # Tiện ích
│   ├── __init__.py
│   └── db_utils.py                  # Tiện ích MongoDB
├── app.py                           # Ứng dụng Flask
├── requirements.txt                 # Dependencies
├── Dockerfile                       # Docker cấu hình
└── README.md                        # Tài liệu
```

## Cài đặt

### Yêu cầu

- Python 3.9+
- MongoDB 4.4+

### Cài đặt thủ công

1. Tạo môi trường ảo (khuyến nghị):

```bash
python -m venv venv
source venv/bin/activate  # Trên Windows: venv\Scripts\activate
```

2. Cài đặt các thư viện:

```bash
pip install -r requirements.txt
```

3. Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

4. Điều chỉnh cấu hình trong file `.env`

### Cài đặt với Docker

```bash
docker build -t tuyen-sinh-be-python .
docker run -p 5000:5000 tuyen-sinh-be-python
```

## Sử dụng

### Huấn luyện mô hình

```bash
python ai_models/train_models.py --all
```

Các tham số:
- `--all`: Huấn luyện tất cả các mô hình
- `--major`: Chỉ huấn luyện mô hình gợi ý ngành
- `--admission`: Chỉ huấn luyện mô hình dự đoán xác suất
- `--force`: Huấn luyện lại mô hình ngay cả khi đã tồn tại

### Chạy ứng dụng

```bash
python app.py
```

## API Endpoints

### API gợi ý ngành học

- `POST /api/recommendation/recommend`: Gợi ý ngành học dựa trên thông tin học sinh
- `GET /api/recommendation/health`: Kiểm tra trạng thái API

### API dự đoán xác suất

- `POST /api/admission/predict`: Dự đoán xác suất đậu đại học
- `GET /api/admission/health`: Kiểm tra trạng thái API

### API dữ liệu

- `GET /api/data/subject-combinations`: Lấy danh sách tổ hợp môn
- `GET /api/data/interests`: Lấy danh sách sở thích
- `GET /api/data/universities`: Lấy danh sách trường đại học
- `GET /api/data/majors`: Lấy danh sách ngành học
- `GET /api/data/admission-criteria`: Lấy tiêu chí tuyển sinh
- `GET /api/data/student-data/<id>`: Lấy dữ liệu học sinh theo ID
- `GET /api/data/stats`: Lấy thống kê dữ liệu

## Tích hợp với frontend

Frontend gọi các API này để cung cấp tính năng gợi ý ngành học và dự đoán xác suất đậu đại học. 