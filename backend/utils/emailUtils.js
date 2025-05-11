const nodemailer = require('nodemailer');

/**
 * Cấu hình transporter cho Nodemailer
 * Lưu ý: Cần thêm thông tin email trong file .env:
 * EMAIL_USER=your_email@gmail.com
 * EMAIL_PASS=your_email_app_password
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Gửi OTP qua email
 * @param {string} email - Email người nhận
 * @param {string} otp - Mã OTP
 * @returns {Promise} Kết quả gửi email
 */
const sendOtpViaEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Mã xác thực OTP - Tuyển Sinh Thông Minh',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a4a4a;">Xác thực tài khoản</h2>
          <p>Xin chào,</p>
          <p>Mã xác thực OTP của bạn là:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>Mã này có hiệu lực trong vòng 3 phút.</p>
          <p>Đây là email tự động, vui lòng không trả lời.</p>
          <p>Trân trọng,<br>Đội ngũ Tuyển Sinh Thông Minh</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`OTP đã được gửi đến ${email}: ${otp}`);
    return info;
  } catch (error) {
    console.error('Lỗi gửi OTP qua email:', error);
    throw error;
  }
};

/**
 * Kiểm tra định dạng email hợp lệ
 * @param {string} email - Email cần kiểm tra
 * @returns {boolean} Kết quả kiểm tra
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  sendOtpViaEmail,
  isValidEmail
}; 