/**
 * Các functions dùng chung cho cả frontend và backend
 */

// Hàm định dạng số điện thoại từ 0xxxx sang 84xxxx
const formatPhoneNumber = (phoneNumber) => {
  if (phoneNumber && phoneNumber.startsWith('0')) {
    return '84' + phoneNumber.substring(1);
  }
  return phoneNumber;
};

// Kiểm tra định dạng số điện thoại hợp lệ
const isValidPhone = (phone) => {
  const phoneRegex = /^(0|84)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(phone);
};

// Kiểm tra định dạng mật khẩu hợp lệ
const isValidPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
  return passwordRegex.test(password);
};

// Kiểm tra email hợp lệ
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  formatPhoneNumber,
  isValidPhone,
  isValidPassword,
  isValidEmail
}; 