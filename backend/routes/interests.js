const express = require('express');
const router = express.Router();
const Interest = require('../models/Interest');

// Get all interests
router.get('/', async (req, res) => {
    try {
        const interests = await Interest.find({})
            .select('name group -_id')
            .sort({ group: 1, name: 1 });
        
        // Transform data to match frontend expectations
        const transformedData = interests.map(interest => ({
            value: interest.name,
            label: `${interest.name} (${interest.group})`
        })).filter(item => item.value && item.label); // Lọc bỏ các item không hợp lệ

        res.json({
            success: true,
            data: transformedData
        });
    } catch (error) {
        console.error('Error fetching interests:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error'
        });
    }
});

module.exports = router; 