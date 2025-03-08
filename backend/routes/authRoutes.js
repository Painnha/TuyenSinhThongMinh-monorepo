const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Kiểm tra số điện thoại
router.post('/check-phone', authController.checkPhone);

// Xác thực OTP
router.post('/verify-otp', authController.verifyOtp);

// Đăng ký tài khoản
router.post('/register', authController.register);

// Đăng nhập
router.post('/login', authController.login);

// Quên mật khẩu - Gửi OTP
router.post('/forgot-password', authController.forgotPassword);

// Reset mật khẩu
router.post('/reset-password', authController.resetPassword);

module.exports = router; 