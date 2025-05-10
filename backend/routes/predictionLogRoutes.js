const express = require('express');
const router = express.Router();
const predictionLogController = require('../controllers/predictionLogController');
const { protect } = require('../middleware/authMiddleware');

// Middleware kiểm tra quyền admin
const checkAdmin = (req, res, next) => {
  // Kiểm tra chi tiết thêm req.user
  console.log('User in request:', req.user);

  if (req.user && (req.user.role === 'admin' || req.user.role === 'ADMIN')) {
    next();
  } else {
    console.log('Access denied. User role:', req.user?.role);
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập vào tài nguyên này'
    });
  }
};

// Tất cả các routes đều yêu cầu đăng nhập
router.use(protect);

// Route để người dùng xem log của chính họ - không cần quyền admin
router.get('/user/logs', predictionLogController.getUserLogs);
router.get('/user/logs/:id', predictionLogController.getUserLogDetail);
router.put('/user/logs/:id/feedback', predictionLogController.updateUserFeedback);

// Các routes sau đây yêu cầu quyền admin
router.use(checkAdmin);

// Route lấy danh sách logs
router.get('/', predictionLogController.getLogs);

// Route lấy chi tiết log
router.get('/:id', predictionLogController.getLogDetail);

// Route xóa một log
router.delete('/:id', predictionLogController.deleteLog);

// Route xóa nhiều logs
router.delete('/', predictionLogController.deleteManyLogs);

// Route lấy thống kê
router.get('/statistics/summary', predictionLogController.getStatistics);

// Route lấy danh sách phản hồi
router.get('/feedback/list', predictionLogController.getFeedbacks);

module.exports = router; 