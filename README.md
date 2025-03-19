# Tuyển Sinh Thông Minh

Hệ thống tư vấn tuyển sinh thông minh giúp học sinh lớp 12 chọn ngành học và trường đại học phù hợp.

## Cấu trúc dự án

Dự án được tổ chức theo cấu trúc monorepo với các package:

```
TuyenSinhThongMinh-monorepo/
├── backend/           # Backend API server
├── frontend/         # Frontend React application
└── shared/           # Shared utilities and types
```

## Công nghệ sử dụng

- **Backend:**
  - Node.js & Express
  - MongoDB với Mongoose
  - JWT Authentication
  - RESTful API

- **Frontend:**
  - React
  - TypeScript
  - Material-UI
  - React Query

- **Shared:**
  - TypeScript
  - Utility functions
  - Type definitions

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/your-username/TuyenSinhThongMinh-monorepo.git
cd TuyenSinhThongMinh-monorepo
```

2. Cài đặt dependencies:
```bash
yarn install
```

3. Tạo file .env trong thư mục backend:
```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
INFOBIP_API_KEY=your_infobip_api_key
INFOBIP_BASE_URL=your_infobip_base_url
```

4. Khởi động development server:
```bash
# Khởi động backend
cd backend
yarn dev

# Khởi động frontend (trong terminal mới)
cd frontend
yarn dev
```

## API Endpoints

### Authentication
- `POST /api/auth/check-phone` - Kiểm tra số điện thoại và gửi OTP
- `POST /api/auth/verify-otp` - Xác thực OTP
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `POST /api/auth/reset-password` - Đặt lại mật khẩu

### Universities
- `GET /api/universities` - Lấy danh sách trường
- `GET /api/universities/:code` - Lấy thông tin chi tiết trường
- `POST /api/universities` - Tạo trường mới (Auth)
- `PUT /api/universities/:code` - Cập nhật thông tin trường (Auth)
- `DELETE /api/universities/:code` - Xóa trường (Auth)
- `POST /api/universities/import` - Import danh sách trường (Auth)

### Subject Combinations
- `GET /api/subject-combinations` - Lấy danh sách tổ hợp môn
- `GET /api/subject-combinations/:code` - Lấy chi tiết tổ hợp môn
- `POST /api/subject-combinations` - Tạo tổ hợp môn mới (Auth)
- `PUT /api/subject-combinations/:code` - Cập nhật tổ hợp môn (Auth)
- `DELETE /api/subject-combinations/:code` - Xóa tổ hợp môn (Auth)
- `POST /api/subject-combinations/import` - Import danh sách tổ hợp môn (Auth)

## Contributing

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

# Hệ thống gợi ý ngành học

Hướng dẫn sử dụng hệ thống gợi ý ngành học trong dự án Tuyển Sinh Thông Minh.

## Cài đặt và chạy hệ thống

### Backend (Python)

1. Cài đặt các thư viện Python cần thiết:
```bash
cd backend/python/data
pip install -r requirements.txt
```

2. Chạy Flask server:
```bash
cd backend/python/data
python -m flask run
```

### Frontend (React)

1. Cài đặt các thư viện Node.js:
```bash
cd frontend
npm install
```

2. Chạy React app:
```bash
cd frontend
npm start
```

## Sử dụng hệ thống

### 1. Trang tư vấn ngành học

Truy cập trang tư vấn ngành học trong ứng dụng. Tại đây, bạn cần:

1. Chọn phương thức xét tuyển
2. Chọn đối tượng ưu tiên
3. Chọn khu vực ưu tiên
4. Nhập điểm số cho các môn học
5. Chọn tổ hợp môn thi
6. Chọn sở thích
7. Nhấn nút "Gửi" để nhận gợi ý ngành học

### 2. Kết quả

Sau khi gửi thông tin, hệ thống sẽ hiển thị danh sách các ngành học phù hợp nhất, bao gồm:

- Tên ngành học
- Điểm phù hợp (trên thang 100)
- Các thành phần điểm:
  - Điểm tổ hợp môn (60%)
  - Điểm khớp sở thích (30%) 
  - Xu hướng thị trường (8%)
  - Điểm ưu tiên (2%)

## API Endpoints

### 1. Gợi ý ngành học
- **URL**: `/api/recommend`
- **Method**: POST
- **Body**:
```json
{
  "TOA": 8.5,
  "VAN": 7.0,
  "ANH": 8.0,
  "LY": 7.5,
  "HOA": 8.0,
  "SU": 6.5,
  "DIA": 7.0,
  "SINH": 6.5,
  "GDCD": 7.5,
  "TIN": 8.0,
  "CN": 7.5,
  "priority_area": "KV2",
  "priority_subject": "05",
  "interests": ["Lập trình", "Công nghệ"],
  "subject_groups": ["A00", "A01"]
}
```

### 2. Tạo dữ liệu mẫu
- **URL**: `/api/generate-data`
- **Method**: POST
- **Body**:
```json
{
  "num_samples": 100,
  "method": "bayesian"
}
```

## Chú ý

1. Đảm bảo các file CSV (interests.csv, major_data.csv, subject_combinations.csv) đã được đặt đúng vị trí trong thư mục `backend/python/data/`
2. Nếu frontend và backend chạy ở các port khác nhau, cần bật CORS trong backend
3. Kiểm tra biến môi trường `REACT_APP_API_URL` trong file `.env` của frontend đã trỏ đúng đến URL của backend