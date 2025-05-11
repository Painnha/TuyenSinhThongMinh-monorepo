const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// === Đăng ký qua số điện thoại ===
// Kiểm tra số điện thoại
router.post('/check-phone', authController.checkPhone);

// Xác thực OTP
router.post('/verify-otp', authController.verifyOtp);

// Gửi lại OTP (điện thoại)
router.post('/resend-otp', authController.resendOtp);

// === Đăng ký qua email ===
// Kiểm tra email và gửi OTP
router.post('/check-email', authController.checkEmail);

// Xác thực OTP (email)
router.post('/verify-email-otp', authController.verifyEmailOtp);

// Gửi lại OTP (email)
router.post('/resend-email-otp', authController.resendEmailOtp);

// === Đăng ký và đăng nhập ===
// Đăng ký tài khoản (số điện thoại)
router.post('/register', authController.register);

// Đăng ký tài khoản (email)
router.post('/register-with-email', authController.registerWithEmail);

// Đăng nhập (số điện thoại)
router.post('/login', authController.login);

// Đăng nhập (email)
router.post('/login-with-email', authController.loginWithEmail);

// Quên mật khẩu - Gửi OTP
router.post('/forgot-password', authController.forgotPassword);

// Reset mật khẩu
router.post('/reset-password', authController.resetPassword);

module.exports = router; 