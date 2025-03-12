/**
 * Script để tạo tài khoản admin
 * Chạy lệnh: node scripts/createAdmin.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');

// Hàm chuẩn hóa số điện thoại thành 84xxxxxxxxx
const formatPhoneNumber = (phone) => {
  if (!phone) return phone;
  
  // Loại bỏ các ký tự không phải số
  let cleaned = phone.replace(/\D/g, '');
  
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

// Thông tin tài khoản admin
const adminData = {
  phone: '0352433944', // Thay đổi số điện thoại theo ý muốn
  userName: 'Admin',
  password: 'Admin123', // Thay đổi mật khẩu theo ý muốn
  role: 'admin',
  isActive: true
};

// Kết nối đến MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Tạo tài khoản admin
const createAdmin = async () => {
  try {
    // Kết nối đến database
    await connectDB();

    // Format số điện thoại
    const formattedPhone = formatPhoneNumber(adminData.phone);
    console.log(`Số điện thoại đã format: ${formattedPhone}`);

    // Kiểm tra xem tài khoản đã tồn tại chưa
    const existingUser = await User.findOne({ phone: formattedPhone });
    if (existingUser) {
      console.log('Tài khoản admin đã tồn tại!');
      
      // Cập nhật quyền admin nếu tài khoản đã tồn tại
      if (existingUser.role !== 'admin') {
        await User.findByIdAndUpdate(existingUser._id, { role: 'admin' });
        console.log('Đã cập nhật quyền admin cho tài khoản!');
      }
    } else {
      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // Tạo tài khoản admin mới
      const newAdmin = new User({
        phone: formattedPhone,
        userName: adminData.userName,
        password: hashedPassword,
        role: adminData.role,
        isActive: adminData.isActive
      });

      await newAdmin.save();
      console.log('Tạo tài khoản admin thành công!');
    }

    // Đóng kết nối
    mongoose.connection.close();
    console.log('Đã đóng kết nối đến database');
  } catch (error) {
    console.error('Lỗi:', error);
  }
};

// Chạy hàm tạo admin
createAdmin(); 