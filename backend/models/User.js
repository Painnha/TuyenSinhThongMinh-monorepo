const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, unique: true, required: true },
  userName: { type: String, required: true },
  password: { type: String, required: true },
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema); 