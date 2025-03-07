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