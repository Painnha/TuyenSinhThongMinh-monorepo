const express = require('express');
const router = express.Router();
const benchmarkScoreController = require('../controllers/benchmarkScoreController');
const authMiddleware = require('../middleware/authMiddleware');

// Lấy tất cả điểm chuẩn (với bộ lọc nếu có) - Không cần đăng nhập
router.get('/', benchmarkScoreController.getBenchmarkScores);

// API mới: Lấy danh sách tất cả các trường đại học từ bảng benchmark_scores
router.get('/universities', benchmarkScoreController.getUniversities);

// API mới: Lấy danh sách tất cả các ngành từ bảng benchmark_scores
router.get('/majors', benchmarkScoreController.getMajors);

// API mới: Lấy danh sách tất cả các tổ hợp môn từ bảng benchmark_scores
router.get('/subject-combinations', benchmarkScoreController.getSubjectCombinations);

// Lấy điểm chuẩn theo ID - Không cần đăng nhập
router.get('/:id', benchmarkScoreController.getBenchmarkScoreById);

// Các routes bên dưới yêu cầu đăng nhập
router.use(authMiddleware.protect);

// Kiểm tra quyền admin (thêm middleware kiểm tra role)
router.use((req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
  }
});

// Tạo điểm chuẩn mới
router.post('/', benchmarkScoreController.createBenchmarkScore);

// Cập nhật điểm chuẩn
router.put('/:id', benchmarkScoreController.updateBenchmarkScore);

// Xóa điểm chuẩn
router.delete('/:id', benchmarkScoreController.deleteBenchmarkScore);

module.exports = router; 