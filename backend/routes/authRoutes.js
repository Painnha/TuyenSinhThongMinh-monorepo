const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// === Đăng ký qua số điện thoại ===
// Kiểm tra số điện thoại và gửi OTP
router.post('/check-phone', authController.checkPhone);

// Gửi lại OTP (số điện thoại)
router.post('/resend-otp', authController.resendOtp);

// Xác thực OTP
router.post('/verify-otp', authController.verifyOtp);

// === Đăng ký qua email ===
// Kiểm tra email và gửi OTP
router.post('/check-email', authController.checkEmail);

// Gửi lại OTP (email)
router.post('/resend-email-otp', authController.resendEmailOtp);

// Xác thực OTP (email)
router.post('/verify-email-otp', authController.verifyEmailOtp);

// === Quên mật khẩu ===
// Kiểm tra email đã đăng ký và gửi OTP
router.post('/forgot-password', authController.forgotPassword);

// Gửi lại OTP (quên mật khẩu)
router.post('/forgot-password/resend-otp', authController.forgotPasswordResendOtp);

// Xác thực OTP (quên mật khẩu)
router.post('/forgot-password/verify-otp', authController.forgotPasswordVerifyOtp);

// Đặt lại mật khẩu
router.post('/reset-password', authController.resetPassword);

// === Đăng nhập và đăng ký ===
// Đăng nhập với số điện thoại
router.post('/login', authController.login);

// Đăng nhập với email
router.post('/login-with-email', authController.loginWithEmail);

// Đăng ký với số điện thoại (sau khi đã xác thực OTP)
router.post('/register', authController.register);

// Đăng ký với email (sau khi đã xác thực OTP)
router.post('/register-with-email', authController.registerWithEmail);

// === Thông tin người dùng ===
// Lấy thông tin người dùng đang đăng nhập
router.get('/me', protect, authController.getUserProfile);

module.exports = router; 