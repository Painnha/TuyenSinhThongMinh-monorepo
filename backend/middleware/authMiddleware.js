const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware xác thực token JWT
 * Thêm vào các route cần bảo vệ
 */
exports.protect = async (req, res, next) => {
  try {
    // Lấy token từ header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Kiểm tra token tồn tại
    if (!token) {
      return res.status(401).json({
        message: 'Bạn chưa đăng nhập, vui lòng đăng nhập để truy cập',
      });
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm user từ token
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        message: 'Token không hợp lệ',
      });
    }

    // Gắn user vào request
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn' });
    }
    return res.status(500).json({ message: 'Lỗi server' });
  }
}; 