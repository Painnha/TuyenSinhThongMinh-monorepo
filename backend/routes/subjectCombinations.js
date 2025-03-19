const express = require('express');
const router = express.Router();
const subjectCombinationController = require('../controllers/subjectCombinationController');
const { protect } = require('../middleware/authMiddleware');
const SubjectCombination = require('../models/SubjectCombination');

// Get all subject combinations
router.get('/', async (req, res) => {
    try {
        const combinations = await SubjectCombination.find({})
            .select('code subjects description -_id')
            .sort({ code: 1 });
        
        // Transform data to match frontend expectations
        const transformedData = combinations.map(combo => ({
            value: combo.code,
            label: `${combo.code} - ${combo.subjects}`,
            description: combo.description
        })).filter(item => item.value && item.label); // Lọc bỏ các item không hợp lệ

        res.json({
            success: true,
            data: transformedData
        });
    } catch (error) {
        console.error('Error fetching subject combinations:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error'
        });
    }
});

router.get('/:code', subjectCombinationController.getCombinationByCode);

// Routes yêu cầu xác thực
router.post('/', protect, subjectCombinationController.createCombination);
router.put('/:code', protect, subjectCombinationController.updateCombination);
router.delete('/:code', protect, subjectCombinationController.deleteCombination);
router.post('/import', protect, subjectCombinationController.importCombinations);

module.exports = router; 