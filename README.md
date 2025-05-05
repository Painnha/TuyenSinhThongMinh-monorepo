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

### Yêu cầu hệ thống
- Node.js (>= 14.x)
- Python (>= 3.8)
- MongoDB

### Cài đặt thư viện

#### 1. Thư viện Node.js
```bash
# Trong thư mục backend
cd backend
npm install

# Trong thư mục frontend
cd frontend
npm install
```

#### 2. Thư viện Python
```bash
pip install flask flask-cors python-dotenv pymongo tensorflow numpy scikit-learn
```

## Chạy ứng dụng

### Cách 1: Sử dụng script tự động

Để chạy tất cả các thành phần cùng lúc, sử dụng file script:

```bash
start-servers.bat
```

Script này sẽ:
1. Cài đặt các thư viện Python cần thiết
2. Khởi động Python API server
3. Khởi động Node.js API server
4. Khởi động React frontend

### Cách 2: Khởi động thủ công

Nếu muốn khởi động các server riêng biệt, mở 3 cửa sổ terminal riêng:

#### Terminal 1: Python API
```bash
cd BE_python
python app.py
```

#### Terminal 2: Node.js API
```bash
cd backend
npm start
```

#### Terminal 3: Frontend
```bash
cd frontend
npm start
```

## Cấu trúc dự án

- **BE_python**: Chứa mã nguồn Python cho mô hình dự đoán AI
  - **ai_models/dudoanxacxuat**: Mô hình dự đoán xác suất đậu đại học
  - **models**: Thư mục chứa các mô hình đã huấn luyện

- **backend**: API Node.js
  - **routes**: Các endpoint API
  - **controllers**: Xử lý logic
  - **models**: Định nghĩa schema MongoDB

- **frontend**: UI React
  - **src/Components**: Các component React
  - **src/services**: Các service gọi API

## Sử dụng

1. Mở trình duyệt tại địa chỉ: http://localhost:3000
2. Truy cập chức năng "Dự đoán xác suất đậu đại học"
3. Nhập thông tin trường, ngành và điểm thi
4. Nhận kết quả dự đoán

## Xử lý lỗi

Nếu gặp lỗi "Không thể tải mô hình dự đoán", hãy thực hiện:
```bash
cd BE_python
python -m ai_models.dudoanxacxuat.initialize_model
```

Nếu vẫn gặp lỗi, kiểm tra:
1. MongoDB đã được khởi động
2. Kết nối mạng hoạt động tốt
3. Các port 5000, 5001 và 3000 không bị chiếm bởi ứng dụng khác

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