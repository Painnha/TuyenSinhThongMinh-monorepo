const express = require('express');
const router = express.Router();
const universityAdminController = require('../controllers/universityAdminController');
const { protect } = require('../middleware/authMiddleware');

// Thêm middleware kiểm tra quyền admin
const checkAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập vào tính năng này'
    });
  }
};

// Routes quản lý trường đại học - áp dụng middleware bảo vệ và kiểm tra quyền admin cho từng route
router.get('/', protect, checkAdmin, universityAdminController.getAllUniversities);
router.get('/:id', protect, checkAdmin, universityAdminController.getUniversityById);
router.post('/', protect, checkAdmin, universityAdminController.createUniversity);
router.put('/:id', protect, checkAdmin, universityAdminController.updateUniversity);
router.delete('/:id', protect, checkAdmin, universityAdminController.deleteUniversity);

module.exports = router; 