import { API_URL, API_CONFIG, handleResponse } from '../config/apiConfig';

export const subjectCombinationService = {
    getAllCombinations: async () => {
        try {
            const response = await fetch(`${API_URL}/subject-combinations`, {
                method: 'GET',
                ...API_CONFIG
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Error fetching subject combinations:', error);
            throw error;
        }
    }
}; 