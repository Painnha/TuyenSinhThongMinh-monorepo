import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Auth.css';
import LoginImg from '../../Image/LOGO.png';
import GoogleIcon from '../../Image/GoogleIcon.png';
import FaceIcon from '../../Image/FaceIcon.png';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_URL } from '../../../services/config/apiConfig';

const LoginScreen = () => {
  // const [identifier, setIdentifier] = useState(''); // Dùng cho cả email hoặc số điện thoại
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

  // Xác định loại định danh (email hoặc số điện thoại)
  /*
  const identifyInputType = (value) => {
    if (isValidEmail(value)) {
      return 'email';
    } else if (isValidPhone(value)) {
      return 'phone';
    }
    return null;
  };
  */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    
    // const inputType = identifyInputType(identifier);
    
    // if (!inputType) {
    //   setError('Email hoặc số điện thoại không hợp lệ. Vui lòng kiểm tra lại.');
    //   return;
    // }
    
    if (!isValidEmail(email)) {
      setError('Email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    
    // Kiểm tra mật khẩu
    if (password.trim() === '') {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    
    setLoading(true);

    try {
      // console.log('Đang gửi request đến:', inputType === 'phone' ? 
      //   `${API_URL}/api/auth/login` : 
      //   `${API_URL}/api/auth/login-with-email`);
      console.log('Đang gửi request đến:', `${API_URL}/api/auth/login-with-email`);
      
      // let response;
      
      // if (inputType === 'phone') {
      //   // Chuyển đổi định dạng số điện thoại trước khi gửi
      //   const formattedPhone = formatPhoneNumber(identifier);
      //   console.log('Dữ liệu gửi đi:', { phone: formattedPhone, password });
      //   response = await axios.post(`${API_URL}/api/auth/login`, { 
      //     phone: formattedPhone, 
      //     password 
      //   }, {
      //     timeout: 5000,
      //     headers: {
      //       'Content-Type': 'application/json'
      //     }
      //   });
      // } else {
      //   console.log('Dữ liệu gửi đi:', { email: identifier, password });
      console.log('Dữ liệu gửi đi:', { email, password });
      const response = await axios.post(`${API_URL}/api/auth/login-with-email`, { 
        email, 
        password 
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      // }
      
      console.log('Response từ server:', response.data);
      
      const { token, user } = response.data;
      
      // Kiểm tra tài khoản có bị khóa không
      if (user.isActive === false) {
        setError('Tài khoản của bạn đã bị khóa.');
        return;
      }
      
      // Lưu token và thông tin user vào localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('isAdminLogin'); // Đảm bảo xóa flag đăng nhập admin nếu có

      // Trigger storage event để Header component cập nhật
      window.dispatchEvent(new Event('storage'));
      
      // Giải mã token để lấy thông tin người dùng
      const decodedToken = jwtDecode(token);
      console.log('Đăng nhập thành công, user:', user);
      console.log('Token decoded:', decodedToken);

      // Chuyển hướng đến trang trước đó hoặc trang chủ
      // Nếu trang trước đó là /admin thì chuyển về trang chủ
      const from = location.state?.from?.pathname;
      if (from && from.startsWith('/admin')) {
        navigate('/');
      } else {
        navigate(from || '/');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        // Lỗi từ server với response
        console.error('Error response data:', error.response.data);
        setError(error.response.data.message || 'Thông tin đăng nhập không đúng');
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
          <span className="tab active">Đăng nhập</span>
          <Link to="/register" className="tab">Đăng ký</Link>
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
          <Link to="/forgot-password" className="forgot-password">Bạn quên mật khẩu?</Link>
          <button type="submit" className="login-button" disabled={loading}>
            Đăng nhập
          </button>
        </form>

        <div className="alternative-login">
          <span>Hoặc đăng nhập bằng</span>
          <div className="social-icons">
            <img src={GoogleIcon} alt="Google" />
            <img src={FaceIcon} alt="Facebook" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;