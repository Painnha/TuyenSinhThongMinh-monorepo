const express = require('express');
const router = express.Router();
const University = require('../models/University');

// Get all universities
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { code: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const universities = await University.find(query)
            .select('code name type location -_id')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: universities
        });
    } catch (error) {
        console.error('Error fetching universities:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error'
        });
    }
});

// Get university by code
router.get('/:code', async (req, res) => {
    try {
        const university = await University.findOne({ code: req.params.code.toUpperCase() });
        
        if (!university) {
            return res.status(404).json({
                success: false,
                error: 'University not found'
            });
        }

        res.json({
            success: true,
            data: university
        });
    } catch (error) {
        console.error('Error fetching university:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error'
        });
    }
});

module.exports = router; 