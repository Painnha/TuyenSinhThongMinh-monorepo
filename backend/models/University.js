const mongoose = require('mongoose');

const benchmarkSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  majorCode: { type: String, required: true },
  majorName: { type: String, required: true },
  method: { type: String, required: true },
  subjectGroup: { type: String, required: true },
  score: { type: Number },
  note: { type: String }
});

const universitySchema = new mongoose.Schema({
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
  type: { 
    type: String, 
    required: true,
    default: 'Đại học'
  },
  location: String,
  website: String,
  description: String,
  admissionMethods: [{
    type: String,
    default: ['Xét điểm thi THPT']
  }],
  benchmarks: [benchmarkSchema]
}, {
  timestamps: true
});

// Tạo index cho tìm kiếm
universitySchema.index({ code: 1 });
universitySchema.index({ name: 'text' });
universitySchema.index({ 'benchmarks.majorCode': 1 });
universitySchema.index({ 'benchmarks.year': 1 });

// Chuyển đến database mới và collection mới
module.exports = mongoose.model('University', universitySchema, 'universities_benchmark_full');