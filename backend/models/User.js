const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, unique: true, required: true },
  userName: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema); 