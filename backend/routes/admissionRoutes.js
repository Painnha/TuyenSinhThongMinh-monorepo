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
        
        try {
            // Gửi request đến API Python
            const response = await axios.post(`${PYTHON_API_URL}/api/data/admission/predict-ai`, req.body, {
                headers: {
                    'Content-Type': 'application/json'
                },
                // Tăng timeout để đợi mô hình dự đoán
                timeout: 90000
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
        } catch (pythonApiError) {
            console.error('Error calling Python API:', pythonApiError.message);
            
            // Trả về dữ liệu dự phòng nếu Python API không phản hồi
            console.log('Python API không khả dụng, trả về dữ liệu dự phòng');
            
            // Tính tổng điểm từ các môn phù hợp với ngành
            let totalScore = 0;
            let subjectCount = 0;
            
            // Định nghĩa bộ môn theo ngành
            const majorSubjects = {
                'Công nghệ thông tin': ['Toan', 'VatLy'],
                'Kỹ thuật điện tử': ['Toan', 'VatLy'],
                'Kinh tế': ['Toan', 'NgoaiNgu'],
                'Ngôn ngữ': ['NguVan', 'NgoaiNgu'],
                'Y khoa': ['SinhHoc', 'HoaHoc', 'Toan'],
                'default': ['Toan', 'NguVan', 'NgoaiNgu']
            };
            
            // Chọn bộ môn phù hợp hoặc mặc định
            const subjects = majorSubjects[majorName] || majorSubjects.default;
            
            // Tính điểm từ các môn phù hợp
            subjects.forEach(subject => {
                if (scores[subject]) {
                    totalScore += scores[subject];
                    subjectCount++;
                }
            });
            
            // Tính điểm trung bình
            const averageScore = subjectCount > 0 ? totalScore / subjectCount : 0;
            
            // Tạo điểm chuẩn giả lập dựa trên mã trường
            // Các trường top có điểm chuẩn cao hơn
            const topUniversities = ['BKA', 'QHI', 'FTU', 'NEU', 'UMP'];
            const isTopUniversity = topUniversities.includes(universityCode);
            const benchmark = isTopUniversity ? 23.5 : 21.0;
            
            // Tính xác suất trúng tuyển
            let probability = 0;
            if (totalScore >= benchmark * 3) {
                probability = 0.9;
            } else if (totalScore >= benchmark * 2.8) {
                probability = 0.75;
            } else if (totalScore >= benchmark * 2.5) {
                probability = 0.5;
            } else {
                probability = 0.25;
            }
            
            // Tạo kết quả dự phòng
            return res.status(200).json({
                success: true,
                message: 'Kết quả dự đoán dự phòng (Python API không khả dụng)',
                prediction: {
                    probability: probability,
                    quota: isTopUniversity ? 120 : 150,
                    q0: isTopUniversity ? 108 : 135,
                    benchmark: benchmark,
                    totalScore: totalScore,
                    averageScore: averageScore
                }
            });
        }
    } catch (error) {
        console.error('Error in admission prediction route:', error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ khi xử lý yêu cầu',
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
            },
            timeout: 90000
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

/**
 * Gửi feedback về kết quả dự đoán đến Python API
 */
router.post('/feedback', async (req, res) => {
    try {
        console.log('Feedback request received:', req.body);
        const response = await axios.post(`${PYTHON_API_URL}/api/data/admission/feedback`, req.body, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        console.log('Feedback response from Python API:', response.data);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error forwarding feedback to Python API:', error.message);
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.message || 'Lỗi từ Python API',
                error: error.response.data
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Không thể kết nối đến Python API',
            error: error.message
        });
    }
});

module.exports = router; 