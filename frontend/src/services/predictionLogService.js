import axios from 'axios';
import { API_URL } from './config/apiConfig';

// Cấu hình axios với token
const authAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
  });
};

// Lấy danh sách logs của người dùng hiện tại
export const getUserLogs = async (params = {}) => {
  try {
    // Tạo query string từ params
    const queryParams = new URLSearchParams();
    if (params.modelType) queryParams.append('modelType', params.modelType);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    // Thêm userId vào query params để server có thể xác định người dùng dựa trên cả phone hoặc email
    if (params.userId) queryParams.append('userId', params.userId);
    
    const queryString = queryParams.toString();
    const url = `/api/prediction-logs/logs${queryString ? `?${queryString}` : ''}`;
    
    console.log("Calling API URL:", url);
    const response = await authAxios().get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching user logs:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Lấy chi tiết một log của người dùng
export const getUserLogDetail = async (logId) => {
  try {
    const response = await authAxios().get(`/api/prediction-logs/logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching log detail:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Lấy chi tiết một log (cho admin)
export const getLogDetail = async (logId) => {
  try {
    const response = await authAxios().get(`/api/admin/prediction-logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching log detail for admin:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Cập nhật đánh giá (feedback) cho một log
export const updateLogFeedback = async (logId, feedbackData) => {
  try {
    const response = await authAxios().put(`/api/prediction-logs/logs/${logId}/feedback`, feedbackData);
    return response.data;
  } catch (error) {
    console.error('Error updating feedback:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
}; 