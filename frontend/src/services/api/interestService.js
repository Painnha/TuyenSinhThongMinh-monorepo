import axios from 'axios';
import { API_URL } from '../config/apiConfig';
import mockInterests from '../../mockData/interests';

export const interestService = {
    // Lấy tất cả sở thích
    getAllInterests: async () => {
        try {
            // Thử gọi API thực
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
    }
};

export default interestService; 