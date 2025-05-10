// Sử dụng biến môi trường hoặc URL mặc định
const API_URL = (process.env.REACT_APP_API_URL || 'https://tuyensinhthongminh-api.onrender.com') + '/api';

// University service
export const universityService = {
    // Get all universities with optional search params
    getAllUniversities: async (params = {}) => {
        try {
            let url = `${API_URL}/universities`;
            if (params.search) {
                url += `?search=${encodeURIComponent(params.search)}`;
            }
            // console.log('Calling API:', url); // Debug log

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API Response data:', data); // Debug log
            
            if (!data) {
                throw new Error('No data received from server');
            }

            return data;
        } catch (error) {
            console.error('Error in getAllUniversities:', error);
            throw error;
        }
    },

    // Get single university by code
    getUniversity: async (code) => {
        try {
            const response = await fetch(`${API_URL}/universities/${code}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching university:', error);
            throw error;
        }
    },

    // Get university benchmarks
    getUniversityBenchmarks: async (code, params = {}) => {
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(
                `${API_URL}/universities/${code}/benchmarks${queryString ? `?${queryString}` : ''}`
            );
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching benchmarks:', error);
            throw error;
        }
    }
};

// Interest service
export const interestService = {
    getAllInterests: async () => {
        try {
            console.log('Calling interests API...'); // Debug log
            const response = await fetch(`${API_URL}/interests`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // console.log('Interests API response:', data); // Debug log
            return data;
        } catch (error) {
            console.error('Error fetching interests:', error);
            throw error;
        }
    }
};

// Subject combination service
export const subjectCombinationService = {
    getAllCombinations: async () => {
        try {
            console.log('Calling subject combinations API...'); // Debug log
            const response = await fetch(`${API_URL}/subject-combinations`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // console.log('Subject combinations API response:', data); // Debug log
            return data;
        } catch (error) {
            console.error('Error fetching subject combinations:', error);
            throw error;
        }
    }
}; 