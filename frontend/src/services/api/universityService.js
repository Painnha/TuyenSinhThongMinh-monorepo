import { API_URL, API_CONFIG, handleResponse } from '../config/apiConfig';

export const universityService = {
    getAllUniversities: async (params = {}) => {
        try {
            let url = `${API_URL}/universities`;
            if (params.search) {
                url += `?search=${encodeURIComponent(params.search)}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                ...API_CONFIG
            });
            
            return await handleResponse(response);
        } catch (error) {
            console.error('Error in getAllUniversities:', error);
            throw error;
        }
    },

    getUniversity: async (code) => {
        try {
            const response = await fetch(`${API_URL}/universities/${code}`, {
                method: 'GET',
                ...API_CONFIG
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Error fetching university:', error);
            throw error;
        }
    },

    getUniversityBenchmarks: async (code, params = {}) => {
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(
                `${API_URL}/universities/${code}/benchmarks${queryString ? `?${queryString}` : ''}`,
                {
                    method: 'GET',
                    ...API_CONFIG
                }
            );
            return await handleResponse(response);
        } catch (error) {
            console.error('Error fetching benchmarks:', error);
            throw error;
        }
    }
}; 