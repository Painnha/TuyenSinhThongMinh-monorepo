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
        try {
            const response = await axios.post(`${PYTHON_API_URL}/api/recommendation/recommend`, req.body, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 90000
            });
            
            console.log('Nhận được phản hồi từ Python API:', response.status);
            
            // Chuyển tiếp kết quả từ Python API
            return res.status(200).json(response.data);
        } catch (pythonApiError) {
            console.error('Error calling Python API:', pythonApiError.message);
            
            // Trả về dữ liệu dự phòng nếu Python API không phản hồi
            console.log('Python API không khả dụng, trả về dữ liệu dự phòng');

            // Tìm các sở thích liên quan đến giáo dục
            const hasEducationInterest = interests.some(interest => 
                ['Giáo dục', 'Dạy học', 'Sư phạm'].includes(interest)
            );

            // Tìm các sở thích liên quan đến khoa học
            const hasScienceInterest = interests.some(interest => 
                ['Khoa học', 'Nghiên cứu', 'Công nghệ'].includes(interest)
            );
            
            // Tạo các gợi ý dựa trên điểm và sở thích
            const recommendations = [];
            
            if (hasEducationInterest && scores.Toan > 7) {
                recommendations.push({ major: 'Sư phạm Toán', score: 0.95, reason: 'Phù hợp với điểm cao môn Toán và sở thích dạy học, giáo dục' });
            }
            
            if (hasEducationInterest && scores.NguVan > 7) {
                recommendations.push({ major: 'Sư phạm Ngữ Văn', score: 0.92, reason: 'Phù hợp với điểm cao môn Ngữ văn và sở thích dạy học, giáo dục' });
            }
            
            if (hasScienceInterest && scores.SinhHoc > 6) {
                recommendations.push({ major: 'Sinh học', score: 0.88, reason: 'Phù hợp với sở thích khoa học và điểm môn Sinh học' });
            }
            
            if (scores.VatLy > 7 && scores.Toan > 7) {
                recommendations.push({ major: 'Kỹ thuật điện tử', score: 0.85, reason: 'Phù hợp với điểm cao môn Vật lý và Toán' });
            }
            
            if (scores.Toan > 7 && scores.NgoaiNgu > 7) {
                recommendations.push({ major: 'Kinh tế', score: 0.82, reason: 'Phù hợp với điểm cao môn Toán và Ngoại ngữ' });
            }
            
            // Thêm một số ngành phổ biến khác nếu chưa đủ 5 gợi ý
            if (recommendations.length < 5) {
                recommendations.push({ major: 'Công nghệ thông tin', score: 0.80, reason: 'Ngành có nhu cầu cao trên thị trường lao động' });
            }
            
            if (recommendations.length < 5) {
                recommendations.push({ major: 'Quản trị kinh doanh', score: 0.78, reason: 'Ngành học đa dạng và linh hoạt với nhiều cơ hội nghề nghiệp' });
            }
            
            return res.status(200).json({
                success: true,
                message: 'Kết quả gợi ý dự phòng (Python API không khả dụng)',
                recommendations: recommendations.slice(0, 5) // Chỉ lấy tối đa 5 gợi ý
            });
        }
    } catch (error) {
        console.error('Error in recommendation route:', error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ khi xử lý yêu cầu',
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