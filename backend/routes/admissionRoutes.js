const express = require('express');
const router = express.Router();
const axios = require('axios');

// Configuration - Sử dụng hardcode nếu biến môi trường không hoạt động
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

// Log thông tin URL khi module được load 
console.log('==== ADMISSION ROUTES CONFIGURATION ====');
console.log('Environment PYTHON_API_URL:', process.env.PYTHON_API_URL);
console.log('Using PYTHON_API_URL:', PYTHON_API_URL);
console.log('Admission prediction endpoint:', `${PYTHON_API_URL}/api/data/admission/predict-ai`);
console.log('=======================================');

/**
 * Gọi API Python để dự đoán xác suất trúng tuyển
 */
router.post('/predict-ai', async (req, res) => {
    try {
        console.log('\n==== ADMISSION PREDICTION REQUEST ====');
        console.log('Request body:', req.body);
        console.log('Python API URL:', `${PYTHON_API_URL}/api/data/admission/predict-ai`);
        
        // Kiểm tra các trường bắt buộc
        const { universityCode, majorName, scores } = req.body;
        if (!universityCode || !majorName || !scores) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: universityCode, majorName hoặc scores'
            });
        }
        
        // Hiển thị thông báo chi tiết về request
        console.log(`Gửi dự đoán cho trường ${universityCode}, ngành ${majorName}`);
        
        // Gửi request đến API Python
        const response = await axios.post(`${PYTHON_API_URL}/api/data/admission/predict-ai`, req.body, {
            headers: {
                'Content-Type': 'application/json'
            },
            // Tăng timeout để đợi mô hình dự đoán
            timeout: 30000
        });
        
        console.log('Nhận được phản hồi từ Python API:', response.status);
        
        // Thêm log chi tiết để debug
        console.log('Python API response data keys:', Object.keys(response.data));
        if (response.data.data) {
            console.log('data keys:', Object.keys(response.data.data));
        } else if (response.data.prediction) {
            console.log('prediction keys:', Object.keys(response.data.prediction));
            // Kiểm tra và thêm q0 nếu không có
            if (!response.data.prediction.q0 && response.data.prediction.quota) {
                console.log('q0 missing in Python API response, adding it');
                response.data.prediction.q0 = response.data.prediction.quota * 0.9; // Tạm tính
            }
        }
        
        // Chuyển tiếp kết quả từ Python API
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error calling Python API:', error.message);
        
        // Nếu có response từ Python API
        if (error.response) {
            console.error('Python API error response:', error.response.data);
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.message || 'Lỗi từ Python API',
                error: error.response.data
            });
        }
        
        // Nếu lỗi timeout
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({
                success: false,
                message: 'Kết nối đến Python API bị timeout. Vui lòng kiểm tra xem server Python có đang chạy không.',
                error: error.message
            });
        }
        
        // Nếu không thể kết nối được
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Không thể kết nối đến Python API. Vui lòng kiểm tra xem server Python có đang chạy không.',
                error: error.message
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
 * Gọi API Python để dự đoán xác suất trúng tuyển hàng loạt
 */
router.post('/batch-predict-ai', async (req, res) => {
    try {
        // Gửi request đến API Python
        const response = await axios.post(`${PYTHON_API_URL}/api/data/admission/predict-ai/batch`, req.body, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Chuyển tiếp kết quả từ Python API
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error calling Python batch API:', error.message);
        
        // Nếu có response từ Python API
        if (error.response) {
            return res.status(error.response.status).json({
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
 * Lấy danh sách trường đại học từ collection benchmark_scores
 */
router.get('/universities', async (req, res) => {
    try {
        // Connect to MongoDB
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Không thể kết nối đến MongoDB'
            });
        }
        
        // Lấy danh sách trường từ collection benchmark_scores
        const universities = await db.collection('benchmark_scores')
            .aggregate([
                { $group: { _id: "$university", code: { $first: "$university_code" } } },
                { $project: { _id: 0, name: "$_id", code: 1 } },
                { $sort: { name: 1 } }
            ])
            .toArray();
        
        return res.status(200).json({
            success: true,
            data: universities
        });
    } catch (error) {
        console.error('Error fetching universities:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách trường đại học',
            error: error.message
        });
    }
});

/**
 * Lấy danh sách ngành từ collection benchmark_scores
 */
router.get('/majors', async (req, res) => {
    try {
        // Connect to MongoDB
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Không thể kết nối đến MongoDB'
            });
        }
        
        // Lấy danh sách ngành từ collection benchmark_scores
        const majors = await db.collection('benchmark_scores')
            .aggregate([
                { $group: { _id: "$major" } },
                { $project: { _id: 0, name: "$_id" } },
                { $sort: { name: 1 } }
            ])
            .toArray();
        
        return res.status(200).json({
            success: true,
            data: majors
        });
    } catch (error) {
        console.error('Error fetching majors:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách ngành học',
            error: error.message
        });
    }
});

/**
 * Lấy danh sách ngành học của một trường đại học
 */
router.get('/universities/:universityCode/majors', async (req, res) => {
    try {
        const { universityCode } = req.params;
        
        // Connect to MongoDB
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Không thể kết nối đến MongoDB'
            });
        }
        
        // Lấy danh sách ngành của trường từ collection benchmark_scores
        const majors = await db.collection('benchmark_scores')
            .aggregate([
                { $match: { university_code: universityCode } },
                { $group: { _id: "$major" } },
                { $project: { _id: 0, name: "$_id" } },
                { $sort: { name: 1 } }
            ])
            .toArray();
        
        return res.status(200).json({
            success: true,
            data: majors
        });
    } catch (error) {
        console.error(`Error fetching majors for university ${req.params.universityCode}:`, error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách ngành học của trường',
            error: error.message
        });
    }
});

/**
 * Lấy danh sách trường đại học có ngành học xác định
 */
router.get('/majors/:majorName/universities', async (req, res) => {
    try {
        const { majorName } = req.params;
        
        // Connect to MongoDB
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Không thể kết nối đến MongoDB'
            });
        }
        
        // Lấy danh sách trường có ngành từ collection benchmark_scores
        const universities = await db.collection('benchmark_scores')
            .aggregate([
                { $match: { major: majorName } },
                { $group: { _id: "$university", code: { $first: "$university_code" } } },
                { $project: { _id: 0, name: "$_id", code: 1 } },
                { $sort: { name: 1 } }
            ])
            .toArray();
        
        return res.status(200).json({
            success: true,
            data: universities
        });
    } catch (error) {
        console.error(`Error fetching universities for major ${req.params.majorName}:`, error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách trường đại học có ngành học',
            error: error.message
        });
    }
});

/**
 * Lấy danh sách môn học
 */
router.get('/subjects', async (req, res) => {
    try {
        // Connect to MongoDB
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Không thể kết nối đến MongoDB'
            });
        }
        
        // Lấy danh sách môn học từ collection subjects
        const subjects = await db.collection('subjects')
            .find({})
            .sort({ name: 1 })
            .toArray();
        
        return res.status(200).json({
            success: true,
            data: subjects
        });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách môn học',
            error: error.message
        });
    }
});

module.exports = router; 