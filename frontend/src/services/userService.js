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

// Hàm chuẩn hóa số điện thoại
/*
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return phoneNumber;
  
  // Loại bỏ các ký tự không phải số
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Nếu số điện thoại bắt đầu bằng 0, thay thế bằng 84
  if (cleaned.startsWith('0')) {
    return '84' + cleaned.substring(1);
  }
  // Nếu số điện thoại đã bắt đầu bằng 84, giữ nguyên
  else if (cleaned.startsWith('84')) {
    return cleaned;
  }
  // Trường hợp khác (có thể đã bỏ dấu + từ +84), kiểm tra độ dài
  else if (cleaned.length === 9) {
    // Nếu chỉ có 9 số (thiếu mã quốc gia), thêm 84 vào đầu
    return '84' + cleaned;
  }
  
  // Trả về số sau khi đã làm sạch
  return cleaned;
};
*/

// Lấy danh sách tất cả người dùng
export const getAllUsers = async () => {
  try {
    const response = await authAxios().get('/api/users');
   
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Lấy thông tin một người dùng
export const getUserById = async (userId) => {
  try {
    const response = await authAxios().get(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Tạo người dùng mới
export const createUser = async (userData) => {
  try {
    // Đảm bảo định dạng số điện thoại đúng
    /*
    if (userData.phone) {
      userData.phone = normalizePhoneNumber(userData.phone);
    }
    */

    const response = await authAxios().post('/api/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Cập nhật thông tin người dùng
export const updateUser = async (userId, userData) => {
  try {
    // Đảm bảo định dạng số điện thoại đúng
    /*
    if (userData.phone) {
      userData.phone = normalizePhoneNumber(userData.phone);
    }
    */

    const response = await authAxios().put(`/api/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Đổi mật khẩu người dùng
export const changeUserPassword = async (userId, newPassword) => {
  try {
    const response = await authAxios().put(`/api/users/${userId}/change-password`, { newPassword });
    return response.data;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Xóa người dùng
export const deleteUser = async (userId) => {
  try {
    const response = await authAxios().delete(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
};

// Vô hiệu hóa/kích hoạt tài khoản người dùng
export const toggleUserStatus = async (userId) => {
  try {
    const response = await authAxios().patch(`/api/users/${userId}/toggle-status`);
    return response.data;
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw error.response?.data || { message: 'Lỗi kết nối đến server' };
  }
}; 