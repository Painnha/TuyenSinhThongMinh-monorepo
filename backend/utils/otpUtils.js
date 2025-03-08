const axios = require('axios');

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

module.exports = {
  generateOtp,
  sendOtpViaInfobip
}; 