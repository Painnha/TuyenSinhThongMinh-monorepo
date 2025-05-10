import axios from 'axios';
import { API_URL } from '../config/apiConfig';
import mockInterests from '../../mockData/interests';
import mockSubjectCombinations from '../../mockData/subjectCombinations';

// Dữ liệu giả cho recommendMajors
const mockRecommendations = {
    recommendations: [
        {
            major_name: "Khoa học máy tính",
            category: "Công nghệ thông tin",
            confidence: 0.85,
            matching_interests: ["Khoa học máy tính", "Trí tuệ nhân tạo", "Khoa học dữ liệu"],
            description: "Ngành học về các nguyên lý và ứng dụng của máy tính, thuật toán, và phát triển phần mềm.",
            suitable_universities: [
                {
                    university_name: "Đại học Bách Khoa Hà Nội",
                    subject_groups: [
                        { code: "A00", min_score: 26.5, result: "Đạt" },
                        { code: "A01", min_score: 25.75, result: "Không đạt" }
                    ]
                },
                {
                    university_name: "Đại học Công nghệ - ĐHQGHN",
                    subject_groups: [
                        { code: "A00", min_score: 25.75, result: "Đạt" },
                        { code: "A01", min_score: 25.5, result: "Đạt" }
                    ]
                }
            ]
        },
        {
            major_name: "Kỹ thuật phần mềm",
            category: "Công nghệ thông tin",
            confidence: 0.78,
            matching_interests: ["Kỹ thuật phần mềm", "Khoa học máy tính"],
            description: "Ngành học tập trung vào quy trình phát triển phần mềm chuyên nghiệp, từ phân tích yêu cầu đến thiết kế, triển khai và bảo trì.",
            suitable_universities: [
                {
                    university_name: "Đại học FPT",
                    subject_groups: [
                        { code: "A00", min_score: 24, result: "Đạt" },
                        { code: "A01", min_score: 23.5, result: "Đạt" }
                    ]
                }
            ]
        }
    ]
};

// Dữ liệu giả cho predictAdmissionProbability
const mockPrediction = {
    prediction: {
        universityName: "Đại học Bách Khoa Hà Nội",
        majorName: "Khoa học máy tính",
        combination: "A00",
        year: 2023,
        studentScore: 25.5,
        benchmarkScore: 26.5,
        scoreDifference: -1.0,
        admissionQuota: 200,
        probability: 0.45,
        assessment: "Khả năng trúng tuyển trung bình. Bạn cần cải thiện điểm hoặc xem xét các trường khác."
    }
};

// AI Recommendation Service
export const aiService = {
    // Gợi ý ngành học dựa trên điểm số, sở thích và tổ hợp môn
    recommendMajors: async (studentData) => {
        try {
            console.log('API URL:', `${API_URL}/api/recommendation/recommend`);
            console.log('Sending data to API:', JSON.stringify(studentData, null, 2));
            
            // Lấy thông tin người dùng từ localStorage và trích xuất userId
            let userId = null;
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    userId = user.phone || user._id; // Sử dụng số điện thoại hoặc _id
                    console.log('Đã lấy được userId từ localStorage:', userId);
                } catch (e) {
                    console.error('Lỗi khi parse thông tin user từ localStorage:', e);
                }
            } else {
                console.log('Không tìm thấy thông tin user trong localStorage');
            }
            
            // Chuẩn bị dữ liệu gửi đi với userId đúng
            const requestData = {
                ...studentData,
                userId: userId
            };
            
            console.log('Dữ liệu gửi đi cuối cùng:', JSON.stringify(requestData, null, 2));
            
            const response = await axios.post(`${API_URL}/api/recommendation/recommend`, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            console.log('API Response status:', response.status);
            console.log('API Response data:', response.data);
            
            if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response.data;
        } catch (error) {
            console.warn('Không thể kết nối đến API recommendation, sử dụng dữ liệu giả thay thế:', error);
            // Trả về dữ liệu giả khi API không hoạt động
            return mockRecommendations;
        }
    },

    /**
     * Dự đoán xác suất trúng tuyển vào trường đại học
     * @param {Object} data - Dữ liệu gửi đi
     * @param {string} data.universityCode - Mã trường đại học
     * @param {string} data.majorName - Tên ngành học
     * @param {string} data.combination - Tổ hợp môn thi
     * @param {number} data.studentScore - Điểm của học sinh
     * @param {Object} data.scores - Chi tiết điểm các môn học
     * @returns {Promise} - Kết quả dự đoán
     */
    predictAdmissionProbability: async (data) => {
        try {
            // Kiểm tra dữ liệu đầu vào - sửa để chấp nhận giá trị studentScore = 0
            if (!data.universityCode || !data.majorName || !data.scores) {
                throw new Error('Thiếu thông tin bắt buộc: universityCode, majorName hoặc scores');
            }
            
            // Lấy thông tin người dùng từ localStorage và trích xuất userId
            let userId = null;
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    userId = user.phone || user._id; // Sử dụng số điện thoại hoặc _id
                    console.log('Đã lấy được userId từ localStorage:', userId);
                    // Thêm userId vào data
                    data.userId = userId;
                } catch (e) {
                    console.error('Lỗi khi parse thông tin user từ localStorage:', e);
                }
            } else {
                console.log('Không tìm thấy thông tin user trong localStorage');
            }
            
            const ADMISSION_API_URL = `${API_URL}/api/data/admission/predict-ai`;
            console.log('API URL:', ADMISSION_API_URL);
            console.log('Sending data to API:', JSON.stringify(data, null, 2));
            
            const response = await axios.post(ADMISSION_API_URL, data);
            
            // Kiểm tra cấu trúc response
            console.log('\n===== DEBUG - FULL RESPONSE STRUCTURE =====');
            console.log('Response structure:', JSON.stringify(response.data, null, 2));
            
            // Xác định vị trí dữ liệu thực tế
            let predictionData = response.data;
            
            // Kiểm tra nếu dữ liệu nằm trong data.data
            if (response.data && response.data.data) {
                predictionData = response.data.data;
                console.log('Data found in response.data.data');
            } 
            // Kiểm tra nếu dữ liệu nằm trong data.prediction
            else if (response.data && response.data.prediction) {
                predictionData = response.data.prediction;
                console.log('Data found in response.data.prediction');
            }
            
            // Kiểm tra và tính toán q0 nếu không có
            if (predictionData && !predictionData.q0 && predictionData.quota) {
                // Công thức tính q0 tạm thời: q0 = quota * 0.9
                // Đây là ước lượng dựa trên giả định chỉ tiêu trung bình ngành
                // thường thấp hơn chỉ tiêu của trường top khoảng 10%
                
                // Trong thực tế, q0 được tính bằng cách lấy trung bình chỉ tiêu
                // của tất cả các trường có đào tạo ngành đó
                
                // Cải thiện công thức dựa trên phân tích thống kê
                // Trường top: quota cao hơn trung bình 10-20%
                // Trường trung bình: quota xấp xỉ q0
                // Trường dưới trung bình: quota thấp hơn q0 10-20%
                
                let universityTier = 'top'; // Giả định mặc định
                
                // Thử xác định tier của trường từ tên hoặc mã
                const uniCode = predictionData.universityCode || '';
                const uniName = predictionData.universityName || '';
                
                // Các trường top thường là đại học quốc gia, bách khoa, ngoại thương...
                const topUniversityPatterns = ['QSH', 'QSB', 'QST', 'QSC', 'BKA', 'BKH', 'NTU', 'VNU', 'FTU', 'UEH', 'HCMUS'];
                const midUniversityPatterns = ['TDT', 'NEU', 'FPT', 'UEF', 'IUH', 'TMU', 'DTU'];
                
                if (topUniversityPatterns.some(code => uniCode.includes(code) || uniName.toLowerCase().includes(code.toLowerCase()))) {
                    universityTier = 'top';
                } else if (midUniversityPatterns.some(code => uniCode.includes(code) || uniName.toLowerCase().includes(code.toLowerCase()))) {
                    universityTier = 'mid';
                } else {
                    universityTier = 'lower';
                }
                
                // Tính q0 dựa trên tier
                if (universityTier === 'top') {
                    predictionData.q0 = predictionData.quota / 1.15; // Trường top: q0 thấp hơn 15%
                } else if (universityTier === 'mid') {
                    predictionData.q0 = predictionData.quota * 1.0; // Trường trung bình: q0 ~ quota
                } else {
                    predictionData.q0 = predictionData.quota * 1.2; // Trường dưới trung bình: q0 cao hơn 20%
                }
                
                console.log('q0 missing from API, calculated with tier formula:', {
                    tier: universityTier,
                    quota: predictionData.quota,
                    q0: predictionData.q0
                });
            }
            
            console.log('Raw q0 value in prediction data:', predictionData.q0);
            console.log('All keys in prediction data:', Object.keys(predictionData));
            console.log('===========================================\n');
            
            // Debug dữ liệu trả về từ API
            console.log('\n===== DEBUG INFO - ADMISSION PREDICTION =====');
            
            // 1. Data kết quả trả về từ model
            console.log('1. DATA KẾT QUẢ TRẢ VỀ TỪ MODEL:');
            console.log('   - Xác suất trúng tuyển:', 
                        predictionData?.admissionProbability || predictionData?.probability, 
                        `(${predictionData?.admissionPercentage || (predictionData?.admissionProbability ? `${(predictionData.admissionProbability*100).toFixed(2)}%` : 'N/A')})`);
            console.log('   - Điểm của học sinh:', predictionData?.studentScore || predictionData?.totalScore);
            console.log('   - Trường:', predictionData?.universityName);
            console.log('   - Ngành:', predictionData?.majorName);
            console.log('   - Tổ hợp:', predictionData?.combination || predictionData?.selectedCombination);
            
            // 2. Điểm chuẩn tìm thấy
            console.log('\n2. ĐIỂM CHUẨN TÌM THẤY:');
            console.log('   - Điểm chuẩn trung bình:', predictionData?.averageHistoricalScore || predictionData?.benchmarkScore);
            console.log('   - Điểm chuẩn dự kiến:', predictionData?.expectedScore);
            console.log('   - Xu hướng điểm chuẩn:', predictionData?.scoreTrend);
            console.log('   - Lịch sử điểm chuẩn:', predictionData?.historicalScores);
            
            // 3. Market trend
            console.log('\n3. MARKET TREND:');
            console.log('   - Market trend:', predictionData?.marketTrend);
            
            // 4. Chỉ tiêu tìm thấy
            console.log('\n4. CHỈ TIÊU TÌM THẤY:');
            console.log('   - Chỉ tiêu (quota):', predictionData?.quota || predictionData?.admissionQuota);
            console.log('   - Chỉ tiêu trung bình (q0):', predictionData?.q0);
            
            // 5. Data truyền vào model để dự đoán
            console.log('\n5. DATA TRUYỀN VÀO MODEL:');
            console.log('   - student_score:', predictionData?.studentScore || predictionData?.totalScore);
            console.log('   - average_score:', predictionData?.averageHistoricalScore || predictionData?.benchmarkScore);
            console.log('   - expected_score:', predictionData?.expectedScore);
            console.log('   - score_diff:', predictionData?.scoreDiff || predictionData?.scoreDifference);
            console.log('   - quota:', predictionData?.quota || predictionData?.admissionQuota);
            console.log('   - q0:', predictionData?.q0);
            console.log('   - market_trend:', predictionData?.marketTrend);
            console.log('   - score_trend:', predictionData?.scoreTrend);
            console.log('===============================================\n');
            
            return response.data;
        } catch (error) {
            console.error('Không thể kết nối đến API admission:', error);
            
            // Thêm thông tin lỗi cụ thể
            if (error.response) {
                console.error('Error response status:', error.response.status);
                console.error('Error response data:', error.response.data);
                
                // Nếu API trả về thông báo lỗi cụ thể
                if (error.response.data && error.response.data.message) {
                    throw new Error(error.response.data.message);
                }
            }
            
            throw error;
        }
    },

    /**
     * Gửi feedback về kết quả dự đoán
     * @param {string} endpoint - Đường dẫn API (recommendation/feedback hoặc data/admission/feedback)
     * @param {Object} feedbackData - Dữ liệu feedback
     * @param {string} feedbackData.predictionId - ID của bản ghi dự đoán
     * @param {boolean} feedbackData.isUseful - Đánh giá có hữu ích hay không
     * @param {string} feedbackData.feedback - Nội dung feedback chi tiết (nếu có)
     */
    submitFeedback: async (endpoint, feedbackData) => {
        try {
            // Kiểm tra dữ liệu đầu vào
            if (!feedbackData.predictionId) {
                throw new Error('Thiếu thông tin predictionId');
            }
            
            // Lấy thông tin người dùng từ localStorage và trích xuất userId
            let userId = null;
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    userId = user.phone || user._id; // Sử dụng số điện thoại hoặc _id
                    console.log('Đã lấy được userId từ localStorage:', userId);
                    // Thêm userId vào feedbackData
                    feedbackData.userId = userId;
                } catch (e) {
                    console.error('Lỗi khi parse thông tin user từ localStorage:', e);
                }
            } else {
                console.log('Không tìm thấy thông tin user trong localStorage');
            }
            
            // Sửa đổi: Kiểm tra và xử lý endpoint
            let fullEndpoint;
            
            // Nếu endpoint là recommendation/feedback mà chưa được implement
            // thì thử dùng data/admission/feedback thay thế
            if (endpoint === 'recommendation/feedback') {
                try {
                    fullEndpoint = `${API_URL}/api/${endpoint}`;
                    console.log(`Thử gửi feedback đến API: ${fullEndpoint}`);
                    console.log('Feedback data:', JSON.stringify(feedbackData, null, 2));
                    
                    const response = await axios.post(fullEndpoint, feedbackData, {
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });
                    
                    console.log('Kết quả gửi feedback:', response.data);
                    return response.data;
                } catch (error) {
                    if (error.response && error.response.status === 404) {
                        console.log('API recommendation/feedback không tồn tại, thử dùng data/admission/feedback');
                        // Thử dùng endpoint thay thế
                        endpoint = 'data/admission/feedback';
                    } else {
                        throw error;
                    }
                }
            }
            
            fullEndpoint = `${API_URL}/api/${endpoint}`;
            console.log(`Gửi feedback đến API: ${fullEndpoint}`);
            console.log('Feedback data:', JSON.stringify(feedbackData, null, 2));
            
            const response = await axios.post(fullEndpoint, feedbackData, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('Kết quả gửi feedback:', response.data);
            
            return response.data;
        } catch (error) {
            console.error('Lỗi khi gửi feedback:', error);
            
            // Thêm thông tin lỗi cụ thể
            if (error.response) {
                console.error('Error response status:', error.response.status);
                console.error('Error response data:', error.response.data);
                
                // Nếu API trả về thông báo lỗi cụ thể
                if (error.response.data && error.response.data.message) {
                    throw new Error(error.response.data.message);
                }
            }
            
            throw error;
        }
    },

    // Lấy dữ liệu về tổ hợp môn
    getSubjectCombinations: async () => {
        try {
            const response = await axios.get(`${API_URL}/api/subject-combinations`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            return response.data;
        } catch (error) {
            console.warn('Không thể kết nối đến API subject-combinations, sử dụng dữ liệu giả thay thế:', error);
            // Trả về dữ liệu giả khi API không hoạt động
            return {
                success: true,
                data: mockSubjectCombinations
            };
        }
    },

    // Lấy dữ liệu về sở thích
    getInterests: async () => {
        try {
            const response = await axios.get(`${API_URL}/api/interests`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            return response.data;
        } catch (error) {
            console.warn('Không thể kết nối đến API interests, sử dụng dữ liệu giả thay thế:', error);
            // Trả về dữ liệu giả khi API không hoạt động
            return mockInterests;
        }
    },

    // Lấy danh sách trường đại học
    getUniversities: async () => {
        try {
            const response = await axios.get(`${API_URL}/api/data/admission/universities`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            return response.data;
        } catch (error) {
            console.warn('Không thể kết nối đến API universities:', error);
            return {
                success: false,
                message: 'Không thể lấy danh sách trường đại học',
                error: error.message
            };
        }
    },

    // Lấy danh sách ngành học
    getMajors: async () => {
        try {
            const response = await axios.get(`${API_URL}/api/data/admission/majors`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            return response.data;
        } catch (error) {
            console.warn('Không thể kết nối đến API majors:', error);
            return {
                success: false,
                message: 'Không thể lấy danh sách ngành học',
                error: error.message
            };
        }
    },

    // Lấy danh sách ngành học của một trường
    getMajorsByUniversity: async (universityCode) => {
        try {
            const response = await axios.get(`${API_URL}/api/data/admission/universities/${universityCode}/majors`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            return response.data;
        } catch (error) {
            console.warn(`Không thể kết nối đến API majors by university (${universityCode}):`, error);
            return {
                success: false,
                message: 'Không thể lấy danh sách ngành học của trường',
                error: error.message
            };
        }
    },

    // Lấy danh sách trường có một ngành học
    getUniversitiesByMajor: async (majorName) => {
        try {
            const response = await axios.get(`${API_URL}/api/data/admission/majors/${encodeURIComponent(majorName)}/universities`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            return response.data;
        } catch (error) {
            console.warn(`Không thể kết nối đến API universities by major (${majorName}):`, error);
            return {
                success: false,
                message: 'Không thể lấy danh sách trường đại học có ngành học',
                error: error.message
            };
        }
    },

    // Lấy danh sách môn học
    getSubjects: async () => {
        try {
            const response = await axios.get(`${API_URL}/api/data/admission/subjects`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            return response.data;
        } catch (error) {
            console.warn('Không thể kết nối đến API subjects:', error);
            return {
                success: false,
                message: 'Không thể lấy danh sách môn học',
                error: error.message
            };
        }
    }
};

export default aiService; 