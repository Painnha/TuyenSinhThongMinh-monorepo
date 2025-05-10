const express = require('express');
const router = express.Router();
const axios = require('axios');

// Configuration - Sử dụng hardcode nếu biến môi trường không hoạt động
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

/**
 * Gọi API Python để gợi ý ngành học
 */
router.post('/recommend', async (req, res) => {
    try {
        console.log('\n==== MAJOR RECOMMENDATION REQUEST ====');
        console.log('Request body:', req.body);
        console.log('Python API URL:', `${PYTHON_API_URL}/api/recommendation/recommend`);
        
        // Kiểm tra các trường bắt buộc
        const { scores, interests, subject_groups } = req.body;
        if (!scores || !interests || !subject_groups) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: scores, interests hoặc subject_groups'
            });
        }
        
        // Kiểm tra định dạng điểm
        for (const subject in scores) {
            if (typeof scores[subject] !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: `Điểm môn ${subject} phải là số`
                });
            }
        }
        
        // Gửi request đến API Python
        const response = await axios.post(`${PYTHON_API_URL}/api/recommendation/recommend`, req.body, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 90000
        });
        
        console.log('Nhận được phản hồi từ Python API:', response.status);
        
        // Chuyển tiếp kết quả từ Python API
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Error calling Python API:', error.message);
        
        // Nếu có response từ Python API
        if (error.response) {
            console.error('Python API error response:', error.response.data);
            return res.status(200).json({
                success: false,
                message: error.response.data.message || 'Lỗi từ Python API',
                error: error.response.data
            });
        }
        
        // Lỗi khác
        return res.status(500).json({
            success: false,
            message: 'Không thể kết nối đến Python API',
            error: error.message
        });
    }
});

/**
 * Lấy danh sách sở thích từ API Python
 */
router.get('/interests', async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/api/recommendation/interests`, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching interests from Python API:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách sở thích',
            error: error.message
        });
    }
});

/**
 * Lấy danh sách tổ hợp môn từ API Python
 */
router.get('/subject-combinations', async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/api/recommendation/subject-combinations`, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching subject combinations from Python API:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách tổ hợp môn',
            error: error.message
        });
    }
});

module.exports = router; 