const express = require('express');
const router = express.Router();
const universityController = require('../controllers/universityController');
const { protect } = require('../middleware/authMiddleware');

// Routes công khai
router.get('/', universityController.getAllUniversities);
router.get('/:code', universityController.getUniversityByCode);

// Routes yêu cầu xác thực
router.post('/', protect, universityController.createUniversity);
router.put('/:code', protect, universityController.updateUniversity);
router.delete('/:code', protect, universityController.deleteUniversity);
router.post('/import', protect, universityController.importUniversities);

module.exports = router;
