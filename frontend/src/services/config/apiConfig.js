// Lấy API URL từ biến môi trường hoặc sử dụng giá trị mặc định cho production
const apiUrl = process.env.REACT_APP_API_URL || 'https://tuyensinhthongminh-api.onrender.com';

// Log thông tin API URL để debug
console.log('=== API Configuration ===');
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('Using API_URL:', apiUrl);
console.log('=== End API Configuration ===');

export const API_URL = apiUrl;

export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export const handleResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  if (!data) {
    throw new Error('No data received from server');
  }
  return data;
}; 