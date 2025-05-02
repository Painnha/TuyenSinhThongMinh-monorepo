import { API_URL, API_CONFIG, handleResponse } from '../config/apiConfig';
import mockSubjectCombinations from '../../mockData/subjectCombinations';

export const subjectCombinationService = {
    getAllCombinations: async () => {
        try {
            // Thử gọi API thực
            const response = await fetch(`${API_URL}/api/subject-combinations`, {
                method: 'GET',
                ...API_CONFIG
            });
            return await handleResponse(response);
        } catch (error) {
            console.warn('Không thể kết nối đến API subject-combinations, sử dụng dữ liệu giả thay thế:', error);
            // Trả về dữ liệu giả khi API không hoạt động
            return {
                success: true,
                data: mockSubjectCombinations
            };
        }
    }
}; 