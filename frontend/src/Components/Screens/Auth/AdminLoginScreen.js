import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Auth.css';
import LoginImg from '../../Image/LOGO.png';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_URL } from '../../../services/config/apiConfig';

const AdminLoginScreen = () => {
  // const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Kiểm tra xem có thông báo lỗi từ ProtectedRoute không
  useEffect(() => {
    if (location.state?.authError) {
      setError(location.state.authError);
      // Xóa state để tránh hiển thị lại thông báo khi refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Hàm chuyển đổi định dạng số điện thoại thành 84xxxxxxxxx
  /*
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return phoneNumber;
    
    // Loại bỏ các ký tự không phải số
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Nếu số điện thoại bắt đầu bằng 0, thay thế bằng 84
    if (cleaned.startsWith('0')) {
      return '84' + cleaned.substring(1);
    }
    // Nếu số điện thoại đã bắt đầu bằng 84, giữ nguyên
    else if (cleaned.startsWith('84')) {
      return cleaned;
    }
    // Trường hợp khác (có thể đã bỏ dấu + từ +84), kiểm tra độ dài
    else if (cleaned.length === 9) {
      // Nếu chỉ có 9 số (thiếu mã quốc gia), thêm 84 vào đầu
      return '84' + cleaned;
    }
    
    // Trả về số sau khi đã làm sạch
    return cleaned;
  };

  // Kiểm tra định dạng số điện thoại hợp lệ
  const isValidPhone = (phone) => {
    // Kiểm tra định dạng số điện thoại Việt Nam (0xxxxxxxxx hoặc 84xxxxxxxxx)
    const phoneRegex = /^(0|84)[3|5|7|8|9][0-9]{8}$/;
    return phoneRegex.test(phone);
  };
  */

  // Kiểm tra định dạng email hợp lệ
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Kiểm tra định dạng email
    if (!isValidEmail(email)) {
      setError('Email không hợp lệ. Vui lòng nhập đúng định dạng email');
      return;
    }
    
    // Kiểm tra mật khẩu
    if (password.trim() === '') {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/login-with-email`, { 
        email, 
        password 
      }, {
        timeout: 5000, // Timeout sau 5 giây
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { token, user } = response.data;
      
      // Kiểm tra tài khoản có bị khóa không
      if (user.isActive === false) {
        setError('Tài khoản của bạn đã bị khóa.');
        return;
      }
      
      // Kiểm tra xem người dùng có quyền admin không
      if (user.role !== 'admin') {
        setError('Liên hệ người quản trị để tìm hiểu thêm');
        setLoading(false);
        return;
      }
      
      // Lưu token và thông tin user vào localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isAdminLogin', 'true'); // Đánh dấu đăng nhập từ trang admin

      // Trigger storage event để Header component cập nhật
      window.dispatchEvent(new Event('storage'));
      
      // Giải mã token để lấy thông tin người dùng
      const decodedToken = jwtDecode(token);

      // Chuyển hướng đến trang admin
      navigate('/admin');
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        // Lỗi từ server với response
        console.error('Error response data:', error.response.data);
        setError(error.response.data.message || 'Email hoặc mật khẩu không đúng');
      } else if (error.request) {
        // Lỗi không nhận được response
        setError('Không thể kết nối đến server. Vui lòng thử lại sau.');
      } else {
        // Lỗi khác
        setError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="form-container">
        <img src={LoginImg} alt="Hình minh họa đăng nhập" className="form-illustration" />
        
        <div className="tabs">
          <span className="tab active">Đăng nhập Admin</span>
        </div>

        {error && (
          <div className="error-message" style={{ padding: '10px', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
            {error}
          </div>
        )}
        
        {loading && <p>Đang xử lý...</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
       
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="login-button" disabled={loading}>
            Đăng nhập
          </button>
        </form>

        <div className="mt-3 text-center">
          <Link to="/" className="btn btn-link">Quay lại trang chủ</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginScreen; 