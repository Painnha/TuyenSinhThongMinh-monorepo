const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Middleware kiểm tra quyền admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
  }
};

// Tất cả các routes dưới đây đều yêu cầu xác thực và quyền admin
router.use(protect, isAdmin);

// Lấy danh sách tất cả người dùng
router.get('/', userController.getAllUsers);

// Lấy thông tin một người dùng
router.get('/:id', userController.getUserById);

// Tạo người dùng mới
router.post('/', userController.createUser);

// Cập nhật thông tin người dùng
router.put('/:id', userController.updateUser);

// Đổi mật khẩu người dùng
router.put('/:id/change-password', userController.changeUserPassword);

// Xóa người dùng
router.delete('/:id', userController.deleteUser);

// Vô hiệu hóa/kích hoạt tài khoản người dùng
router.patch('/:id/toggle-status', userController.toggleUserStatus);

module.exports = router; 