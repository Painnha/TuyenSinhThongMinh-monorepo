const axios = require('axios');
const Otp = require('../models/Otp');

/**
 * Tạo OTP 6 chữ số ngẫu nhiên
 * @returns {string} OTP 6 chữ số
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Gửi OTP qua SMS sử dụng Infobip API
 * @param {string} phone - Số điện thoại nhận OTP
 * @param {string} otp - Mã OTP
 * @returns {Promise} Kết quả gửi OTP
 */
const sendOtpViaInfobip = async (phone, otp) => {
  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL;

  try {
    const response = await axios.post(
      `https://${baseUrl}/sms/2/text/single`,
      {
        from: 'InfoSMS',
        to: phone,
        text: `Mã OTP của bạn là: ${otp}`,
      },
      {
        headers: {
          'Authorization': `App ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`OTP đã được gửi đến ${phone} qua Infobip: ${otp}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi gửi OTP qua Infobip:', error.response ? error.response.data : error.message);
    throw error;
  }
};

/**
 * Lưu OTP vào cơ sở dữ liệu
 * @param {Object} data - Dữ liệu OTP (phone hoặc email và otp)
 * @returns {Promise} Kết quả lưu OTP
 */
const saveOtp = async (data) => {
  try {
    // Tính thời gian hết hạn (3 phút)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3);
    
    // Tạo object dữ liệu
    const otpData = {
      ...data,
      expiresAt
    };
    
    // Tìm và cập nhật OTP hiện có hoặc tạo mới
    const filter = data.phone ? { phone: data.phone } : { email: data.email };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    
    const result = await Otp.findOneAndUpdate(filter, otpData, options);
    return result;
  } catch (error) {
    console.error('Lỗi lưu OTP:', error);
    throw error;
  }
};

/**
 * Xác thực OTP
 * @param {Object} data - Dữ liệu xác thực (phone hoặc email, và otp)
 * @returns {Promise<boolean>} Kết quả xác thực
 */
const verifyOtp = async (data) => {
  try {
    // Tạo điều kiện tìm kiếm dựa trên phone hoặc email
    const filter = data.phone ? { phone: data.phone } : { email: data.email };
    
    // Tìm OTP trong database
    const otpRecord = await Otp.findOne(filter);
    
    // Kiểm tra nếu không tìm thấy OTP
    if (!otpRecord) {
      throw new Error('OTP không tồn tại');
    }
    
    // Kiểm tra OTP đã hết hạn chưa
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      throw new Error('OTP đã hết hạn');
    }
    
    // Kiểm tra OTP có khớp không
    if (otpRecord.otp !== data.otp) {
      throw new Error('OTP không đúng');
    }
    
    // Xóa OTP sau khi xác thực thành công
    await Otp.deleteOne(filter);
    
    return true;
  } catch (error) {
    console.error('Lỗi xác thực OTP:', error.message);
    throw error;
  }
};

module.exports = {
  generateOtp,
  sendOtpViaInfobip,
  saveOtp,
  verifyOtp
}; 