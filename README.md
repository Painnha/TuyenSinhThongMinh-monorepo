# Tuyển Sinh Thông Minh

Hệ thống tư vấn tuyển sinh thông minh giúp học sinh lớp 12 chọn ngành học và trường đại học phù hợp.

## Tính năng chính

- Tìm kiếm trường đại học và ngành học
- Tra cứu điểm chuẩn các năm
- **Gợi ý ngành học** dựa trên điểm số, sở thích và tổ hợp môn (AI)
- **Dự đoán xác suất đậu đại học** khi chọn ngành/trường cụ thể (AI)
- Tính toán điểm xét tuyển theo tổ hợp môn
- Tư vấn chọn trường và ngành học

## Cấu trúc dự án

Dự án được tổ chức theo cấu trúc monorepo với các package:

```
TuyenSinhThongMinh-monorepo/
├── backend/           # Backend API server (Node.js/Express)
├── frontend/          # Frontend React application
├── BE_python/         # Python backend cho AI models
└── shared/            # Shared utilities and types
```

## Công nghệ sử dụng

- **Backend Node.js:**
  - Node.js & Express
  - MongoDB với Mongoose
  - JWT Authentication
  - RESTful API

- **Backend Python (AI):**
  - Flask API
  - TensorFlow/Keras
  - Scikit-learn
  - NumPy/Pandas

- **Frontend:**
  - React
  - TypeScript
  - Material-UI
  - React Query

- **Shared:**
  - TypeScript
  - Utility functions
  - Type definitions

## Mô hình AI

### 1. Mô hình gợi ý ngành học

Sử dụng mạng neural network để gợi ý ngành học phù hợp dựa trên:
- Điểm thi/học bạ các môn học
- Tổ hợp thi (KHTN/KHXH)
- Sở thích cá nhân
- Xu hướng thị trường lao động

### 2. Mô hình dự đoán xác suất đậu đại học

Dự đoán xác suất trúng tuyển vào trường/ngành cụ thể dựa trên:
- Điểm thi của học sinh
- Điểm chuẩn trung bình của trường/ngành
- Chỉ tiêu tuyển sinh
- Xu hướng điểm chuẩn qua các năm
- Độ phổ biến của ngành

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/your-username/TuyenSinhThongMinh-monorepo.git
cd TuyenSinhThongMinh-monorepo
```

2. Cài đặt dependencies:
```bash
# Cài đặt Node.js dependencies
yarn install

# Cài đặt Python dependencies
cd BE_python
pip install -r requirements.txt
```

3. Tạo file .env:

Trong thư mục backend (Node.js):
```
PORT=8080
MONGODB_URI=mongodb://localhost:27017/tuyen_sinh_thong_minh
JWT_SECRET=your_jwt_secret
INFOBIP_API_KEY=your_infobip_api_key
INFOBIP_BASE_URL=your_infobip_base_url
```

Trong thư mục BE_python:
```
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=tuyen_sinh_thong_minh
API_HOST=0.0.0.0
API_PORT=5000
DEBUG_MODE=False
```

4. Khởi động development server:
```bash
# Sử dụng Docker Compose (khuyến nghị)
docker-compose up

# Hoặc khởi động từng dịch vụ:

# Khởi động MongoDB
mongod

# Khởi động backend Node.js
cd backend
yarn dev

# Khởi động backend Python
cd BE_python
python app.py

# Khởi động frontend
cd frontend
yarn dev
```

## Chuẩn bị dữ liệu và huấn luyện mô hình AI

1. Import dữ liệu:
```bash
cd BE_python
python scripts/import_data.py --all
```

2. Huấn luyện mô hình:
```bash
cd BE_python
python ai_models/train_models.py --all
```

## API Endpoints

### Backend Node.js

#### Authentication
- `POST /api/auth/check-phone` - Kiểm tra số điện thoại và gửi OTP
- `POST /api/auth/verify-otp` - Xác thực OTP
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `POST /api/auth/reset-password` - Đặt lại mật khẩu

#### Universities
- `GET /api/universities` - Lấy danh sách trường
- `GET /api/universities/:code` - Lấy thông tin chi tiết trường
- `POST /api/universities` - Tạo trường mới (Auth)
- `PUT /api/universities/:code` - Cập nhật thông tin trường (Auth)
- `DELETE /api/universities/:code` - Xóa trường (Auth)
- `POST /api/universities/import` - Import danh sách trường (Auth)

#### Subject Combinations
- `GET /api/subject-combinations` - Lấy danh sách tổ hợp môn
- `GET /api/subject-combinations/:code` - Lấy chi tiết tổ hợp môn
- `POST /api/subject-combinations` - Tạo tổ hợp môn mới (Auth)
- `PUT /api/subject-combinations/:code` - Cập nhật tổ hợp môn (Auth)
- `DELETE /api/subject-combinations/:code` - Xóa tổ hợp môn (Auth)
- `POST /api/subject-combinations/import` - Import danh sách tổ hợp môn (Auth)

### Backend Python (AI)

#### Gợi ý ngành học
- `POST /api/recommendation/recommend` - Gợi ý ngành học
- `GET /api/recommendation/health` - Kiểm tra trạng thái API

#### Dự đoán xác suất
- `POST /api/admission/predict` - Dự đoán xác suất đậu đại học
- `GET /api/admission/health` - Kiểm tra trạng thái API

#### Dữ liệu chung
- `GET /api/data/subject-combinations` - Lấy danh sách tổ hợp môn
- `GET /api/data/interests` - Lấy danh sách sở thích
- `GET /api/data/universities` - Lấy danh sách trường đại học
- `GET /api/data/majors` - Lấy danh sách ngành học
- `GET /api/data/admission-criteria` - Lấy tiêu chí tuyển sinh
- `GET /api/data/student-data/:id` - Lấy dữ liệu học sinh theo ID
- `GET /api/data/stats` - Lấy thống kê dữ liệu

## Contributing

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.