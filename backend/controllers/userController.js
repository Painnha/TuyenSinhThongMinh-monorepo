const bcrypt = require('bcrypt');
const User = require('../models/User');
const { formatPhoneNumber, isValidPhone, isValidPassword, isValidEmail } = require('shared');

/**
 * Lấy danh sách tất cả người dùng
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ users });
  } catch (error) {
    console.error('Lỗi lấy danh sách người dùng:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Lấy thông tin một người dùng
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Lỗi lấy thông tin người dùng:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Tạo người dùng mới (chỉ admin)
 */
exports.createUser = async (req, res) => {
  const { email, userName, password, role, phone } = req.body;

  if (!email || !userName || !password) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  // Kiểm tra định dạng email
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Email không hợp lệ' });
  }

  // Kiểm tra mật khẩu
  if (!isValidPassword(password)) {
    return res.status(400).json({ 
      message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số' 
    });
  }

  try {
    // Kiểm tra email đã tồn tại chưa
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return res.status(400).json({ message: 'Email này đã được đăng ký' });
    }

    // Xử lý số điện thoại nếu có
    let formattedPhone = null;
    if (phone && phone !== 'not_provided') {
      formattedPhone = formatPhoneNumber(phone);
      
      // Kiểm tra số điện thoại đã tồn tại
      const existingPhoneUser = await User.findOne({ phone: formattedPhone });
      if (existingPhoneUser) {
        return res.status(400).json({ message: 'Số điện thoại này đã được đăng ký' });
      }
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo người dùng mới
    const newUser = new User({
      email,
      phone: formattedPhone || 'not_provided',
      userName,
      password: hashedPassword,
      role: role || 'user',
      isActive: true
    });
    
    await newUser.save();
    
    // Trả về thông tin người dùng không bao gồm mật khẩu
    const userResponse = { ...newUser.toObject() };
    delete userResponse.password;
    
    res.status(201).json({ 
      message: 'Tạo người dùng thành công', 
      user: userResponse 
    });
  } catch (error) {
    console.error('Lỗi tạo người dùng:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Cập nhật thông tin người dùng
 */
exports.updateUser = async (req, res) => {
  const { userName, phone, email, role, isActive } = req.body;
  const userId = req.params.id;

  try {
    // Kiểm tra người dùng tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData = {};
    
    if (userName) updateData.userName = userName;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Nếu có cập nhật email
    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Email không hợp lệ' });
      }
      
      // Kiểm tra email đã tồn tại (nếu khác email hiện tại)
      if (email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: 'Email này đã được đăng ký' });
        }
        updateData.email = email;
      }
    }
    
    // Nếu có cập nhật số điện thoại
    if (phone) {
      if (phone !== 'not_provided' && !isValidPhone(phone)) {
        return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
      }
      
      const formattedPhone = phone === 'not_provided' ? phone : formatPhoneNumber(phone);
      
      // Kiểm tra số điện thoại đã tồn tại (nếu khác số hiện tại)
      if (formattedPhone !== user.phone) {
        const existingUser = await User.findOne({ phone: formattedPhone });
        if (existingUser) {
          return res.status(400).json({ message: 'Số điện thoại này đã được đăng ký' });
        }
        updateData.phone = formattedPhone;
      }
    }

    // Cập nhật người dùng
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    res.status(200).json({ 
      message: 'Cập nhật người dùng thành công', 
      user: updatedUser 
    });
  } catch (error) {
    console.error('Lỗi cập nhật người dùng:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Đổi mật khẩu người dùng
 */
exports.changeUserPassword = async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.params.id;

  if (!newPassword) {
    return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu mới' });
  }

  // Kiểm tra mật khẩu
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ 
      message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số' 
    });
  }

  try {
    // Kiểm tra người dùng tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Xóa người dùng
 */
exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    // Kiểm tra người dùng tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Xóa người dùng
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('Lỗi xóa người dùng:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Vô hiệu hóa/kích hoạt tài khoản người dùng
 */
exports.toggleUserStatus = async (req, res) => {
  const userId = req.params.id;

  try {
    // Kiểm tra người dùng tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Đảo trạng thái kích hoạt
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isActive: !user.isActive },
      { new: true }
    ).select('-password');

    const statusMessage = updatedUser.isActive ? 'kích hoạt' : 'vô hiệu hóa';
    
    res.status(200).json({ 
      message: `Đã ${statusMessage} tài khoản thành công`, 
      user: updatedUser 
    });
  } catch (error) {
    console.error('Lỗi thay đổi trạng thái người dùng:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}; 