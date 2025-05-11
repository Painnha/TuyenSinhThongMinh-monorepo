const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { formatPhoneNumber, isValidPhone, isValidPassword } = require('shared');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateOtp, sendOtpViaInfobip, saveOtp, verifyOtp } = require('../utils/otpUtils');
const { sendOtpViaEmail, isValidEmail } = require('../utils/emailUtils');

/**
 * Kiểm tra số điện thoại và gửi OTP
 */
exports.checkPhone = async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Vui lòng cung cấp số điện thoại' });
  }

  // Kiểm tra định dạng số điện thoại
  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
  }

  try {
    // Format số điện thoại nếu cần
    const formattedPhone = formatPhoneNumber(phone);
    
    // Kiểm tra xem số điện thoại đã đăng ký chưa
    const existingUser = await User.findOne({ phone: formattedPhone });
    if (existingUser) {
      return res.status(400).json({ message: 'Số điện thoại này đã được đăng ký' });
    }

    // Tạo và lưu OTP mới
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 90 * 1000); // Hết hạn sau 90 giây

    await Otp.findOneAndUpdate(
      { phone: formattedPhone },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // Gửi OTP qua SMS
    try {
      await sendOtpViaInfobip(formattedPhone, otp);
    } catch (error) {
      console.error('Lỗi gửi OTP:', error);
      // Mặc dù có lỗi khi gửi SMS, ta vẫn cho phép tiếp tục trong môi trường phát triển
      // Trong production, có thể cần xử lý khác
    }

    res.status(200).json({ message: 'OTP đã được gửi', phone: formattedPhone });
  } catch (error) {
    console.error('Lỗi kiểm tra số điện thoại:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Xác thực OTP
 */
exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    const otpData = await Otp.findOne({ phone: formattedPhone });
    
    if (!otpData) {
      return res.status(400).json({ message: 'OTP không tồn tại' });
    }

    if (new Date() > new Date(otpData.expiresAt)) {
      return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ message: 'OTP không đúng' });
    }

    // OTP hợp lệ
    res.status(200).json({ message: 'Xác thực OTP thành công' });
  } catch (error) {
    console.error('Lỗi xác thực OTP:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Gửi lại OTP
 */
exports.resendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Vui lòng cung cấp số điện thoại' });
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 90 * 1000); // Hết hạn sau 90 giây

    await Otp.findOneAndUpdate(
      { phone: formattedPhone },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // Gửi OTP qua SMS
    try {
      await sendOtpViaInfobip(formattedPhone, otp);
    } catch (error) {
      console.error('Lỗi gửi lại OTP:', error);
    }

    res.status(200).json({ message: 'OTP đã được gửi lại' });
  } catch (error) {
    console.error('Lỗi gửi lại OTP:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Đăng ký người dùng mới
 */
exports.register = async (req, res) => {
  const { phone, userName, password } = req.body;
  if (!phone || !userName || !password) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  // Kiểm tra định dạng số điện thoại
  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
  }

  // Kiểm tra độ mạnh mật khẩu
  if (!isValidPassword(password)) {
    return res.status(400).json({ 
      message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số' 
    });
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    const existingUser = await User.findOne({ phone: formattedPhone });
    if (existingUser) {
      return res.status(400).json({ message: 'Số điện thoại này đã được đăng ký' });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo người dùng mới
    const newUser = new User({
      phone: formattedPhone,
      userName,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Đăng nhập
 */
exports.login = async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    const user = await User.findOne({ phone: formattedPhone });
    if (!user) {
      return res.status(400).json({ message: 'Số điện thoại hoặc mật khẩu không đúng' });
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Số điện thoại hoặc mật khẩu không đúng' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        userName: user.userName,
        role: user.role
      },
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Quên mật khẩu - Gửi OTP
 */
exports.forgotPassword = async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Vui lòng cung cấp số điện thoại' });
  }

  // Kiểm tra định dạng số điện thoại
  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    
    // Kiểm tra số điện thoại có tồn tại trong hệ thống không
    const user = await User.findOne({ phone: formattedPhone });
    if (!user) {
      return res.status(400).json({ message: 'Số điện thoại không tồn tại trong hệ thống' });
    }

    // Tạo và lưu OTP mới
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 90 * 1000); // Hết hạn sau 90 giây

    await Otp.findOneAndUpdate(
      { phone: formattedPhone },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // Gửi OTP qua SMS
    try {
      await sendOtpViaInfobip(formattedPhone, otp);
    } catch (error) {
      console.error('Lỗi gửi OTP cho quên mật khẩu:', error);
    }

    res.status(200).json({ message: 'OTP đã được gửi để đặt lại mật khẩu', phone: formattedPhone });
  } catch (error) {
    console.error('Lỗi quên mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Reset mật khẩu sau khi xác thực OTP
 */
exports.resetPassword = async (req, res) => {
  const { phone, otp, newPassword, confirmPassword } = req.body;
  
  if (!phone || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu mới không khớp' });
  }

  // Kiểm tra độ mạnh mật khẩu
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ 
      message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số' 
    });
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    
    // Kiểm tra xem số điện thoại có tồn tại không
    const user = await User.findOne({ phone: formattedPhone });
    if (!user) {
      return res.status(400).json({ message: 'Số điện thoại không tồn tại' });
    }

    // Kiểm tra OTP
    const otpData = await Otp.findOne({ phone: formattedPhone });
    if (!otpData) {
      return res.status(400).json({ message: 'OTP không tồn tại' });
    }

    if (new Date() > new Date(otpData.expiresAt)) {
      return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ message: 'OTP không đúng' });
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Cập nhật mật khẩu
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Kiểm tra email và gửi OTP
 */
exports.checkEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Vui lòng cung cấp email' });
  }

  // Kiểm tra định dạng email
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Email không hợp lệ' });
  }

  try {
    // Kiểm tra xem email đã đăng ký chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được đăng ký' });
    }

    // Tạo OTP mới
    const otp = generateOtp();
    
    // Lưu OTP vào cơ sở dữ liệu
    await saveOtp({ email, otp });

    // Gửi OTP qua email
    try {
      await sendOtpViaEmail(email, otp);
    } catch (error) {
      console.error('Lỗi gửi OTP qua email:', error);
      return res.status(500).json({ message: 'Không thể gửi OTP qua email' });
    }

    res.status(200).json({ message: 'OTP đã được gửi qua email', email });
  } catch (error) {
    console.error('Lỗi kiểm tra email:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Gửi lại OTP qua email
 */
exports.resendEmailOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Vui lòng cung cấp email' });
  }

  // Kiểm tra định dạng email
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Email không hợp lệ' });
  }

  try {
    // Tạo OTP mới
    const otp = generateOtp();
    
    // Lưu OTP vào cơ sở dữ liệu
    await saveOtp({ email, otp });

    // Gửi OTP qua email
    try {
      await sendOtpViaEmail(email, otp);
    } catch (error) {
      console.error('Lỗi gửi lại OTP qua email:', error);
      return res.status(500).json({ message: 'Không thể gửi OTP qua email' });
    }

    res.status(200).json({ message: 'OTP đã được gửi lại qua email' });
  } catch (error) {
    console.error('Lỗi gửi lại OTP qua email:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Xác thực OTP cho email
 */
exports.verifyEmailOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  try {
    // Xác thực OTP
    await verifyOtp({ email, otp });
    
    // OTP hợp lệ
    res.status(200).json({ message: 'Xác thực OTP thành công' });
  } catch (error) {
    console.error('Lỗi xác thực OTP email:', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Đăng ký tài khoản bằng email
 */
exports.registerWithEmail = async (req, res) => {
  const { email, userName, password } = req.body;
  if (!email || !userName || !password) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  // Kiểm tra định dạng email
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Email không hợp lệ' });
  }

  // Kiểm tra độ mạnh mật khẩu
  if (!isValidPassword(password)) {
    return res.status(400).json({ 
      message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số' 
    });
  }

  try {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được đăng ký' });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo người dùng mới
    const newUser = new User({
      email,
      userName,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (error) {
    console.error('Lỗi đăng ký với email:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Đăng nhập bằng email
 */
exports.loginWithEmail = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  try {
    // Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        userName: user.userName,
        role: user.role
      },
    });
  } catch (error) {
    console.error('Lỗi đăng nhập với email:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}; 