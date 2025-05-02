# Hệ thống gợi ý ngành học

Hệ thống này sử dụng mô hình neural network để gợi ý ngành học phù hợp dựa trên điểm số, sở thích và xu hướng thị trường.

## Chức năng

- Nhận đầu vào là điểm số 10 môn học (Toán, Văn và 2 trong 8 môn còn lại)
- Xem xét khu vực ưu tiên và đối tượng ưu tiên của học sinh
- Cho phép học sinh chọn tối đa 3 sở thích
- Cho phép học sinh chọn tối đa 2 tổ hợp thi mong muốn
- Đưa ra danh sách 3 ngành phù hợp nhất dựa trên các yếu tố trên và xu hướng thị trường

## Cấu trúc thư mục

```
.
├── data/
│   ├── interests.csv           # Dữ liệu về sở thích
│   ├── major_data.csv          # Dữ liệu về các ngành học
│   ├── subject_combinations.csv # Dữ liệu về tổ hợp môn thi
│   └── synthetic_data_bayesian.csv # Dữ liệu huấn luyện
├── models/
│   ├── __init__.py
│   ├── data_preprocessing.py   # Module xử lý dữ liệu
│   ├── neural_network.py       # Module mô hình neural network
│   └── major_recommendation_model.keras  # Mô hình đã huấn luyện (được tạo sau khi chạy train_model.py)
├── train_model.py              # Script huấn luyện mô hình
├── recommend.py                # Script đưa ra gợi ý ngành học
├── demo.py                     # Script chạy demo
└── requirements.txt            # Các thư viện cần thiết
```

## Cài đặt

1. Tạo môi trường ảo Python:
```bash
python -m venv venv
source venv/bin/activate  # Trên Windows: venv\Scripts\activate
```

2. Cài đặt các thư viện cần thiết:
```bash
pip install -r requirements.txt
```

## Hướng dẫn sử dụng

### Huấn luyện mô hình

```bash
python train_model.py
```

### Chạy demo với các hồ sơ mẫu

```bash
python demo.py
```

### Sử dụng API gợi ý

```bash
python recommend.py '{"scores": {"TOA": 9.0, "VAN": 7.5, "ANH": 8.0, "LY": 8.5, "HOA": 0.0, "SU": 0.0, "DIA": 0.0, "SINH": 0.0, "GDCD": 0.0, "TIN": 0.0, "CN": 0.0}, "priority_area": "KV2", "priority_subject": "05", "interests": ["Lập trình", "Máy tính", "Công nghệ"], "subject_groups": ["A01", "A00"]}'
```

## Cách thức hoạt động

Hệ thống sử dụng mô hình neural network với các lớp ẩn đầy đủ để học mối tương quan giữa:
1. Điểm số của học sinh trong các môn học
2. Khu vực và đối tượng ưu tiên
3. Sở thích cá nhân
4. Tổ hợp môn thi mong muốn
5. Xu hướng thị trường lao động

Mô hình được huấn luyện trên dữ liệu tổng hợp của học sinh đã chọn ngành, và được tối ưu hóa để dự đoán ngành học phù hợp nhất cho học sinh mới.

## Lưu ý

- Học sinh bắt buộc phải nhập điểm Toán và Văn
- Học sinh phải chọn ít nhất 2 môn học khác (ngoài Toán và Văn)
- Hệ thống sẽ chỉ xem xét tối đa 3 sở thích đầu tiên nếu học sinh nhập nhiều hơn
- Hệ thống sẽ chỉ xem xét tối đa 2 tổ hợp môn đầu tiên nếu học sinh chọn nhiều hơn 