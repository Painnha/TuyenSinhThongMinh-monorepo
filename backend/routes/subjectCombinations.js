const express = require('express');
const router = express.Router();
const subjectCombinationController = require('../controllers/subjectCombinationController');
const { protect } = require('../middleware/authMiddleware');

// Routes công khai
router.get('/', subjectCombinationController.getAllCombinations);
router.get('/:code', subjectCombinationController.getCombinationByCode);

// Routes yêu cầu xác thực
router.post('/', protect, subjectCombinationController.createCombination);
router.put('/:code', protect, subjectCombinationController.updateCombination);
router.delete('/:code', protect, subjectCombinationController.deleteCombination);
router.post('/import', protect, subjectCombinationController.importCombinations);

module.exports = router; 