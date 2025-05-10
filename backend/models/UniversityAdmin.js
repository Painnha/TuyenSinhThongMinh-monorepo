const mongoose = require('mongoose');

const universityAdminSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    uppercase: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  level: {
    type: String,
    enum: ['cao', 'trung bình', 'thấp'],
    default: 'trung bình'
  },
  location: {
    city: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      enum: ['Bắc', 'Trung', 'Nam'],
      default: 'Nam'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: false, updatedAt: false } // Sử dụng các trường createdAt và updatedAt tự định nghĩa
});

// Tạo index cho tìm kiếm
universityAdminSchema.index({ code: 1 });
universityAdminSchema.index({ name: 'text' });

// Sử dụng collection "universities"
module.exports = mongoose.model('UniversityAdmin', universityAdminSchema, 'universities'); 