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
                    // Sử dụng cả email, phone hoặc _id, ưu tiên theo thứ tự
                    userId = user.phone || user.email || user._id;
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
            console.error('Error recommending majors:', error);
            throw error;
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
            console.log('API URL:', `${API_URL}/api/data/admission/predict-ai`);
            console.log('Sending data to API:', JSON.stringify(data, null, 2));
            
            // Lấy thông tin người dùng từ localStorage nếu không có trong data
            if (!data.userId) {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        // Sử dụng cả email, phone hoặc _id, ưu tiên theo thứ tự
                        data.userId = user.phone || user.email || user._id;
                        console.log('Đã lấy được userId từ localStorage:', data.userId);
                    } catch (e) {
                        console.error('Lỗi khi parse thông tin user từ localStorage:', e);
                    }
                }
            }
            
            const response = await axios.post(`${API_URL}/api/data/admission/predict-ai`, data, {
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
            console.error('Error predicting admission probability:', error);
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