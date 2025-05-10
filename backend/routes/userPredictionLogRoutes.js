const express = require('express');
const router = express.Router();
const predictionLogController = require('../controllers/predictionLogController');
const { protect } = require('../middleware/authMiddleware');

// Tất cả các routes đều yêu cầu đăng nhập
router.use(protect);

// Route để người dùng xem log của chính họ
router.get('/logs', predictionLogController.getUserLogs);
router.get('/logs/:id', predictionLogController.getUserLogDetail);
router.put('/logs/:id/feedback', predictionLogController.updateUserFeedback);

module.exports = router; 