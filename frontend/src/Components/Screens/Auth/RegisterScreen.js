import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';
import LoginImg from '../../Image/RegisterImg.png';
import axios from 'axios';
import { API_URL } from '../../../services/config/apiConfig';

const RegisterScreen = () => {
  const [step, setStep] = useState(1); // 1: số điện thoại, 2: OTP, 3: thông tin đăng ký
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(90); // Thời gian OTP: 90 giây
  const [canResend, setCanResend] = useState(false); // Trạng thái nút gửi lại mã

  // Logic đếm ngược thời gian OTP
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000); // Giảm mỗi giây
    } else if (timer === 0) {
      setCanResend(true); // Cho phép gửi lại khi hết thời gian
    }
    return () => clearInterval(interval); // Dọn dẹp interval khi component unmount
  }, [step, timer]);

  // Hàm chuyển đổi định dạng số điện thoại thành 84xxxxxxxxx
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

  // Kiểm tra định dạng mật khẩu hợp lệ
  const isValidPassword = (password) => {
    // Ít nhất 6 ký tự, có chữ hoa, chữ thường và số
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return passwordRegex.test(password);
  };

  const handleCheckPhone = async (e) => {
    e.preventDefault();
    setError('');
    
    // Kiểm tra định dạng số điện thoại
    if (!isValidPhone(phone)) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng (VD: 0912345678 hoặc 84912345678)');
      return;
    }
    
    setLoading(true);
    
    try {
      // Chuyển đổi định dạng số điện thoại trước khi gửi
      const formattedPhone = formatPhoneNumber(phone);
      await axios.post(`${API_URL}/api/auth/check-phone`, { phone: formattedPhone });
      setStep(2); // Chuyển sang bước nhập OTP
      setTimer(90); // Đặt lại timer về 90 giây
      setCanResend(false); // Vô hiệu hóa gửi lại ban đầu
    } catch (error) {
      setError(error.response?.data?.message || 'Lỗi khi kiểm tra số điện thoại');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      await axios.post(`${API_URL}/api/auth/resend-otp`, { phone: formattedPhone });
      setTimer(90); // Đặt lại timer về 90 giây
      setCanResend(false); // Vô hiệu hóa gửi lại cho đến khi hết thời gian mới
      setError(''); // Xóa thông báo lỗi nếu có
    } catch (error) {
      setError(error.response?.data?.message || 'Lỗi khi gửi lại OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (otp.trim() === '') {
      setError('Vui lòng nhập mã OTP');
      return;
    }
    
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, { phone: formattedPhone, otp });
      setStep(3); // Chuyển sang bước nhập thông tin đăng ký
    } catch (error) {
      setError(error.response?.data?.message || 'Mã OTP không đúng. Vui lòng kiểm tra lại');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Kiểm tra username
    if (userName.trim() === '') {
      setError('Vui lòng nhập họ và tên');
      return;
    }
    
    // Kiểm tra định dạng mật khẩu
    if (!isValidPassword(password)) {
      setError('Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số');
      return;
    }
    
    // Kiểm tra mật khẩu khớp nhau
    if (password !== rePassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      await axios.post(`${API_URL}/api/auth/register`, {
        phone: formattedPhone,
        userName,
        password
      });

      console.log('Đăng ký thành công');
      window.location.href = '/login';
    } catch (error) {
      console.error('Register error:', error);
      if (error.response) {
        setError(error.response.data.message || 'Lỗi khi đăng ký');
      } else if (error.request) {
        setError('Không thể kết nối đến server');
      } else {
        setError('Có lỗi xảy ra');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="form-container">
        <img src={LoginImg} alt="Hình minh họa đăng ký" className="form-illustration" />
        
        <div className="tabs">
          <Link to="/login" className="tab">Đăng nhập</Link>
          <span className="tab active">Đăng ký</span>
        </div>

        {error && <p className="error-message">{error}</p>}
        {loading && <p>Đang xử lý...</p>}

        {/* Bước 1: Nhập số điện thoại */}
        {step === 1 && (
          <form onSubmit={handleCheckPhone}>
            <input
              type="text"
              placeholder="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
         
            <button type="submit" className="login-button" disabled={loading}>
              Xác thực OTP
            </button>
          </form>
        )}

        {/* Bước 2: Nhập OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              placeholder="Nhập mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <button type="submit" className="login-button" disabled={loading}>
              Xác nhận
            </button>
            <div className="otp-timer">
              {timer > 0 ? (
                <p>OTP còn hiệu lực trong {timer} giây</p>
              ) : (
                <p>Mã OTP đã hết hạn</p>
              )}
              <button
                type="button"
                className="resend-otp"
                onClick={handleResendOtp}
                disabled={!canResend || loading}
              >
                Gửi lại mã
              </button>
            </div>
          </form>
        )}

        {/* Bước 3: Nhập thông tin đăng ký */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Họ và tên"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="password-hint">Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số</p>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={rePassword}
              onChange={(e) => setRePassword(e.target.value)}
              required
            />
            <button type="submit" className="login-button" disabled={loading}>
              Đăng ký
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterScreen;