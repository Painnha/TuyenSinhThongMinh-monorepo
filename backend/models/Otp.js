const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String },
  email: { type: String },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, {
  timestamps: true
});

// Đảm bảo ít nhất có một trường phone hoặc email
otpSchema.pre('save', function(next) {
  if (!this.phone && !this.email) {
    next(new Error('Phải có ít nhất số điện thoại hoặc email'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Otp', otpSchema, 'otps'); 