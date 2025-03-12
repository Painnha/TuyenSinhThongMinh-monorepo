const API_URL = 'http://localhost:5000/api';

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

export const subjectCombinationService = {
    getAllCombinations: async () => {
        try {
         
            
            const response = await fetch(`${API_URL}/subject-combinations`);
            
       
            
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
     
            
            // Nếu API chưa hoạt động, trả về dữ liệu mẫu để UI không bị lỗi
            if (!data || !data.success) {
                console.log('API chưa sẵn sàng, sử dụng dữ liệu mẫu');
                return {
                    success: true,
                    data: [
                        { code: 'A00', subjects: 'Toán, Lý, Hóa' },
                        { code: 'A01', subjects: 'Toán, Lý, Anh' },
                        { code: 'B00', subjects: 'Toán, Hóa, Sinh' },
                        { code: 'C00', subjects: 'Văn, Sử, Địa' },
                        { code: 'D01', subjects: 'Toán, Văn, Anh' }
                    ]
                };
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching subject combinations:', error);
            
            // Trả về dữ liệu mẫu nếu có lỗi
            console.log('Lỗi khi gọi API, sử dụng dữ liệu mẫu');
            return {
                success: true,
                data: [
                    { code: 'A00', subjects: 'Toán, Lý, Hóa' },
                    { code: 'A01', subjects: 'Toán, Lý, Anh' },
                    { code: 'B00', subjects: 'Toán, Hóa, Sinh' },
                    { code: 'C00', subjects: 'Văn, Sử, Địa' },
                    { code: 'D01', subjects: 'Toán, Văn, Anh' }
                ]
            };
        }
    }
}; 