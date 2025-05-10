import axios from 'axios';
import { API_URL } from './config/apiConfig';

// Cấu hình axios với token
const authAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL, // Loại bỏ '/api' nếu có
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
  });
};

// Lấy danh sách tất cả trường đại học
export const getAllUniversities = async () => {
  try {
    const response = await authAxios().get('/api/admin/universities');
    return response.data;
  } catch (error) {
    console.error('Error fetching universities:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Lấy thông tin một trường đại học
export const getUniversityById = async (universityId) => {
  try {
    const response = await authAxios().get(`/api/admin/universities/${universityId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching university:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Tạo trường đại học mới
export const createUniversity = async (universityData) => {
  try {
    const response = await authAxios().post('/api/admin/universities', universityData);
    return response.data;
  } catch (error) {
    console.error('Error creating university:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Cập nhật thông tin trường đại học
export const updateUniversity = async (universityId, universityData) => {
  try {
    const response = await authAxios().put(`/api/admin/universities/${universityId}`, universityData);
    return response.data;
  } catch (error) {
    console.error('Error updating university:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Xóa trường đại học
export const deleteUniversity = async (universityId) => {
  try {
    const response = await authAxios().delete(`/api/admin/universities/${universityId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting university:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
}; 