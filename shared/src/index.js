/**
 * Các functions dùng chung cho cả frontend và backend
 */

// Hàm định dạng số điện thoại sang định dạng 84xxxxxxxxx
const formatPhoneNumber = (phoneNumber) => {
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

// Kiểm tra định dạng số điện thoại hợp lệ
const isValidPhone = (phone) => {
  // Loại bỏ các ký tự không phải số
  let cleaned = phone.replace(/\D/g, '');
  
  // Kiểm tra định dạng số điện thoại Việt Nam
  if (cleaned.startsWith('0')) {
    // Kiểm tra số bắt đầu bằng 0
    const regex = /^0[3|5|7|8|9][0-9]{8}$/;
    return regex.test(cleaned);
  } else if (cleaned.startsWith('84')) {
    // Kiểm tra số bắt đầu bằng 84
    const regex = /^84[3|5|7|8|9][0-9]{8}$/;
    return regex.test(cleaned);
  }
  
  return false;
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