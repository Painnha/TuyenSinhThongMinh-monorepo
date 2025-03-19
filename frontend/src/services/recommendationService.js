import axios from 'axios';

// URL API cho backend Python
const BASE_URL = 'http://localhost:5001';

// Cấu hình axios
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000 // 10 seconds
});

// Kiểm tra API có hoạt động không
const checkAPI = async () => {
    try {
        console.log('Checking API status...');
        const response = await axiosInstance.get('/api/test');
        console.log('API status response:', response.data);
        return response.data.status === 'ok';
    } catch (error) {
        console.error('API check failed:', error);
        return false;
    }
};

/**
 * Service cho các chức năng gợi ý ngành học
 */
export const recommendationService = {
    /**
     * Gọi API để lấy gợi ý ngành học phù hợp
     * @param {Object} studentData - Dữ liệu của học sinh (điểm số, sở thích, v.v.)
     * @returns {Promise} Kết quả gợi ý ngành học
     */
    getRecommendations: async (studentData) => {
        try {
            // Kiểm tra API trước khi gọi
            const isAPIAvailable = await checkAPI();
            if (!isAPIAvailable) {
                throw new Error('API is not available');
            }

            console.log('Calling recommend API:', `${BASE_URL}/api/recommend`);
            console.log('Request data:', studentData);
            
            const response = await axiosInstance.post('/api/recommend', studentData);
            console.log('Response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting recommendations:', error.response || error);
            throw error;
        }
    },

    /**
     * Gọi API để tạo dữ liệu mẫu cho học sinh
     * @param {Number} numSamples - Số lượng mẫu cần tạo (mặc định: 100)
     * @param {String} method - Phương pháp tạo dữ liệu ('bayesian' hoặc 'neural', mặc định: 'bayesian')
     * @returns {Promise} Kết quả tạo dữ liệu
     */
    generateData: async (numSamples = 100, method = 'bayesian') => {
        try {
            // Kiểm tra API trước khi gọi
            const isAPIAvailable = await checkAPI();
            if (!isAPIAvailable) {
                throw new Error('API is not available');
            }

            console.log('Calling generate-data API:', `${BASE_URL}/api/generate-data`);
            console.log('Request data:', { num_samples: numSamples, method });
            
            const response = await axiosInstance.post('/api/generate-data', {
                num_samples: numSamples,
                method: method
            });
            
            console.log('Response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error generating data:', error.response || error);
            throw error;
        }
    }
}; 