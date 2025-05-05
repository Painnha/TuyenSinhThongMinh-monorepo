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
            
            const response = await axios.post(`${API_URL}/api/recommendation/recommend`, studentData, {
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

    // Dự đoán xác suất đậu đại học khi chọn ngành/trường cụ thể
    predictAdmissionProbability: async (admissionData) => {
        try {
            console.log('API URL:', `${API_URL}/api/data/admission/predict-ai`);
            console.log('Sending data to API:', JSON.stringify(admissionData, null, 2));
            
            // Thêm timeout dài hơn vì mô hình dự đoán có thể cần thời gian
            const response = await axios.post(`${API_URL}/api/data/admission/predict-ai`, admissionData, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000 // 30 giây timeout
            });
            
            console.log('API Response status:', response.status);
            console.log('API Response data:', response.data);
            
            if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Kiểm tra format data trước khi trả về
            if (!response.data || !response.data.success) {
                throw new Error(response.data?.message || 'Phản hồi API không hợp lệ');
            }
            
            return response.data;
        } catch (error) {
            console.error('Không thể kết nối đến API admission:', error);
            
            if (error.code === 'ECONNABORTED') {
                // Lỗi timeout
                throw new Error('Quá thời gian chờ phản hồi từ server. Vui lòng thử lại sau.');
            } else if (error.response) {
                // Có phản hồi nhưng là lỗi
                throw new Error(error.response.data?.message || `Lỗi từ server: ${error.response.status}`);
            } else if (error.request) {
                // Không nhận được phản hồi
                throw new Error('Không nhận được phản hồi từ server. Vui lòng kiểm tra kết nối.');
            }
            
            // Trong quá trình phát triển, trả về dữ liệu giả khi API không hoạt động
            console.warn('Đang sử dụng dữ liệu giả thay thế cho API admission');
            return mockPrediction;
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