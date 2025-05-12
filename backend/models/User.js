const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String },
  email: { type: String },
  userName: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true
});

// Đảm bảo ít nhất có một trường phone hoặc email
userSchema.pre('save', function(next) {
  if (!this.phone && !this.email) {
    next(new Error('Phải có ít nhất số điện thoại hoặc email'));
  } else {
    // Xóa các trường null hoặc chuỗi rỗng
    if (this.phone === null || this.phone === '') {
      // Bỏ hoàn toàn trường phone khỏi document
      this.phone = undefined;
      delete this.phone;
    }
    if (this.email === null || this.email === '') {
      // Bỏ hoàn toàn trường email khỏi document
      this.email = undefined;
      delete this.email;
    }
    next();
  }
});

// XÓA index cũ trước khi tạo mới - chạy một lần khi khởi động ứng dụng
const clearIndexes = async () => {
  try {
    // Khi bắt đầu ứng dụng, đảm bảo index được thiết lập đúng
    const User = mongoose.model('User', userSchema, 'users');
    const collection = User.collection;
    
    // Lấy danh sách index hiện tại
    const indexes = await collection.indexes();
    
    // Xóa phone_1 và email_1 index nếu có
    for (const index of indexes) {
      if (index.name === 'phone_1' || index.name === 'email_1') {
        await collection.dropIndex(index.name);
        console.log(`Đã xóa index: ${index.name}`);
      }
    }
    
    // Tạo lại index với sparse: true
    await User.createIndexes();
    console.log('Đã tạo lại các index với sparse: true');
  } catch (error) {
    console.error('Lỗi khi xóa/tạo lại index:', error);
  }
};

// Tạo index cho phone và email
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema, 'users');

// Thực hiện xóa và tạo lại index
clearIndexes();

module.exports = User;