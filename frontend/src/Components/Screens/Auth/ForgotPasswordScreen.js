import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';
import LoginImg from '../../Image/RegisterImg.png';
import axios from 'axios';
import { API_URL } from '../../../services/config/apiConfig';

const ForgotPasswordScreen = () => {
  const [step, setStep] = useState(1); // 1: số điện thoại, 2: OTP, 3: mật khẩu mới
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(90); // Thời gian OTP: 90 giây
  const [canResend, setCanResend] = useState(false); // Trạng thái nút gửi lại mã

  // Quản lý bộ đếm thời gian OTP
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

  const handleCheckPhone = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/forgot-password/check-phone`, { phone });
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
      await axios.post(`${API_URL}/forgot-password/resend-otp`, { phone });
      setTimer(90); // Đặt lại timer về 90 giây
      setCanResend(false); // Vô hiệu hóa gửi lại
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
    setLoading(true);

    try {
      await axios.post(`${API_URL}/forgot-password/verify-otp`, { phone, otp });
      setStep(3); // Chuyển sang bước nhập mật khẩu mới
    } catch (error) {
      setError(error.response?.data?.message || 'Lỗi khi xác thực OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_URL}/forgot-password/reset-password`, { phone, newPassword, confirmPassword });
      alert('Đổi mật khẩu thành công!');
      window.location.href = '/login'; // Chuyển hướng về trang đăng nhập
    } catch (error) {
      setError(error.response?.data?.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="form-container">
        <img src={LoginImg} alt="Hình minh họa quên mật khẩu" className="form-illustration" />
        
        <h2 className="forgot-password-title">Quên mật khẩu</h2>

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
              required
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

        {/* Bước 3: Nhập mật khẩu mới */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button type="submit" className="login-button" disabled={loading}>
              Đổi mật khẩu
            </button>
          </form>
        )}

        {/* Liên kết quay lại trang đăng nhập */}
        <div className="return-to-login">
          <Link to="/login">Quay lại trang đăng nhập</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;