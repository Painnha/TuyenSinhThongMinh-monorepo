import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';
import LoginImg from '../../Image/LoginImg.png';
import GoogleIcon from '../../Image/GoogleIcon.png';
import FaceIcon from '../../Image/FaceIcon.png';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Hàm chuyển đổi định dạng số điện thoại từ 0xxxx sang 84xxxx
  const formatPhoneNumber = (phoneNumber) => {
    if (phoneNumber.startsWith('0')) {
      return '84' + phoneNumber.substring(1);
    }
    return phoneNumber;
  };

  // Kiểm tra định dạng số điện thoại hợp lệ
  const isValidPhone = (phone) => {
    // Kiểm tra định dạng số điện thoại Việt Nam (0xxxxxxxxx hoặc 84xxxxxxxxx)
    const phoneRegex = /^(0|84)[3|5|7|8|9][0-9]{8}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Kiểm tra định dạng số điện thoại
    if (!isValidPhone(phone)) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng (VD: 0912345678 hoặc 84912345678)');
      return;
    }
    
    // Kiểm tra mật khẩu
    if (password.trim() === '') {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    
    setLoading(true);

    try {
      console.log('Đang gửi request đến:', 'http://localhost:5000/login');
      
      // Chuyển đổi định dạng số điện thoại trước khi gửi
      const formattedPhone = formatPhoneNumber(phone);
      
      console.log('Dữ liệu gửi đi:', { phone: formattedPhone, password });
      
      const response = await axios.post('http://localhost:5000/login', { 
        phone: formattedPhone, 
        password 
      }, {
        timeout: 5000, // Timeout sau 5 giây
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response từ server:', response.data);
      
      const { token, user } = response.data;
      
      // Lưu token và thông tin user vào localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Trigger storage event để Header component cập nhật
      window.dispatchEvent(new Event('storage'));
      
      // Giải mã token để lấy thông tin người dùng
      const decodedToken = jwtDecode(token);
      console.log('Đăng nhập thành công, user:', user);
      console.log('Token decoded:', decodedToken);

      // Chuyển hướng đến trang chủ
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        // Lỗi từ server với response
        setError(error.response.data.message || 'Số điện thoại hoặc mật khẩu không đúng');
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

        {error && <p className="error-message">{error}</p>}
        
        {loading && <p>Đang xử lý...</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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