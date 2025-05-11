const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, sparse: true },
  email: { type: String, sparse: true },
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
    next();
  }
});

// Tạo index cho phone và email
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema, 'users'); 