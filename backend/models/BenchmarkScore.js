const mongoose = require('mongoose');

const benchmarkScoreSchema = new mongoose.Schema({
  university: {
    type: String,
    required: true,
  },
  university_code: {
    type: String,
    required: true,
  },
  major: {
    type: String,
    required: true,
  },
  subject_combination: {
    type: String,
    required: true,
  },
  benchmark_score: {
    type: Number,
    required: true,
    min: 0,
  },
  year: {
    type: String,
    required: true,
    match: /^\d{4}$/,
  },
  notes: {
    type: String,
  },
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }
});

// Middleware để tự động cập nhật updatedAt
benchmarkScoreSchema.pre('save', function(next) {
  this.metadata.updatedAt = Date.now();
  next();
});

benchmarkScoreSchema.pre('findOneAndUpdate', function(next) {
  this.set({ 'metadata.updatedAt': Date.now() });
  next();
});

// Tạo compound index để đảm bảo không có dữ liệu trùng lặp
benchmarkScoreSchema.index(
  { university_code: 1, major: 1, subject_combination: 1, year: 1 },
  { unique: true }
);

const BenchmarkScore = mongoose.model('BenchmarkScore', benchmarkScoreSchema,'benchmark_scores');

module.exports = BenchmarkScore; 