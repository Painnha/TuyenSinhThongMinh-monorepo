require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

console.log('Script thiết lập database tuyen_sinh_thong_minh');

// Khởi tạo dữ liệu user
const users = [
  {
    phone: '0352433944', // Admin
    userName: 'Admin',
    password: 'Admin@123',
    role: 'admin',
    isActive: true
  },
  {
    phone: '0987654321', // User thông thường
    userName: 'User',
    password: 'User@123',
    role: 'user',
    isActive: true
  }
];

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

// Thiết lập database và tạo người dùng
const setupDatabase = async () => {
  try {
    // Lấy MONGODB_URI từ biến môi trường
    const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    
    // Sử dụng MongoClient trực tiếp thay vì Mongoose để thiết lập database
    console.log('Đang kết nối đến MongoDB...');
    const client = new MongoClient(connectionString);
    await client.connect();
    
    console.log('Kết nối MongoDB thành công!');
    
    // Lấy hoặc tạo database tuyen_sinh_thong_minh
    const db = client.db('tuyen_sinh_thong_minh');
    console.log(`Đã chọn database: ${db.databaseName}`);
    
    // Xóa dữ liệu cũ từ collections
    console.log('Xóa dữ liệu cũ...');
    await db.collection('users').deleteMany({});
    await db.collection('otps').deleteMany({});
    console.log('Đã xóa dữ liệu cũ');
    
    // Tạo người dùng mới
    console.log('Tạo người dùng mới...');
    for (const userData of users) {
      const formattedPhone = formatPhoneNumber(userData.phone);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const newUser = {
        phone: formattedPhone,
        userName: userData.userName,
        password: hashedPassword,
        role: userData.role,
        isActive: userData.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('users').insertOne(newUser);
      console.log(`Đã tạo người dùng: ${userData.userName} (${userData.role})`);
    }
    
    console.log('Thiết lập database hoàn tất!');
    await client.close();
    console.log('Đã đóng kết nối MongoDB');
    
  } catch (error) {
    console.error('Lỗi thiết lập database:', error);
    process.exit(1);
  }
};

// Chạy script
setupDatabase(); 