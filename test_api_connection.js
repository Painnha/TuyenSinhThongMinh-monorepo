const axios = require('axios');

// Config
const PYTHON_API_URL = 'http://localhost:5001';
const NODE_API_URL = 'http://localhost:5000';

async function testNodeAPI() {
    try {
        console.log('Kiểm tra kết nối đến Node.js API...');
        const response = await axios.get(`${NODE_API_URL}/api/data/admission/universities`);
        console.log('Kết quả Node API:', response.status);
        console.log('Số lượng trường:', response.data.data?.length || 0);
        return true;
    } catch (error) {
        console.error('Lỗi kết nối đến Node.js API:', error.message);
        return false;
    }
}

async function testPythonAPI() {
    try {
        console.log('Kiểm tra kết nối đến Python API...');
        const response = await axios.get(`${PYTHON_API_URL}`);
        console.log('Kết quả Python API:', response.status);
        console.log('Python API response:', response.data);
        return true;
    } catch (error) {
        console.error('Lỗi kết nối đến Python API:', error.message);
        return false;
    }
}

async function testPredictionAPI() {
    try {
        console.log('Kiểm tra API dự đoán...');
        
        // Data mẫu
        const testData = {
            "universityCode": "IUH",
            "majorName": "công nghệ kỹ thuật ô tô",
            "scores": {
                "TOAN": 9,
                "ANH": 8,
                "HOA": 7,
                "LY": 7,
                "VAN": 7,
                "SINH": 7
            },
            "priorityScore": 0
        };
        
        // Test trực tiếp Python API
        console.log('Gọi trực tiếp Python API...');
        try {
            const pythonResponse = await axios.post(`${PYTHON_API_URL}/api/admission/predict`, testData, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('Python API trả về:', pythonResponse.status);
            console.log('Python API data:', pythonResponse.data);
        } catch (pError) {
            console.error('Lỗi Python API direct:', pError.message);
            if (pError.response) {
                console.log('Python response error:', pError.response.status, pError.response.data);
            }
        }
        
        // Test thông qua Node.js API
        console.log('Gọi thông qua Node.js API...');
        try {
            const nodeResponse = await axios.post(`${NODE_API_URL}/api/data/admission/predict-ai`, testData, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('Node.js API trả về:', nodeResponse.status);
            console.log('Node.js API data:', nodeResponse.data);
        } catch (nError) {
            console.error('Lỗi Node API:', nError.message);
            if (nError.response) {
                console.log('Node response error:', nError.response.status, nError.response.data);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Lỗi kiểm tra API dự đoán:', error.message);
        return false;
    }
}

async function main() {
    console.log('===== BẮT ĐẦU KIỂM TRA KẾT NỐI API =====');
    
    const nodeResult = await testNodeAPI();
    const pythonResult = await testPythonAPI();
    
    if (nodeResult && pythonResult) {
        console.log('Cả hai API đều hoạt động, kiểm tra dự đoán...');
        await testPredictionAPI();
    }
    
    console.log('===== KẾT THÚC KIỂM TRA =====');
}

main().catch(console.error); 