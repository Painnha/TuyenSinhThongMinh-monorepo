const mongoose = require('mongoose');

const predictionLogSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  modelType: { 
    type: String, 
    enum: ['admission_prediction', 'major_recommendation'],
    required: true,
    index: true
  },
  inputs: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  outputs: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  dataToPredict: {
    type: mongoose.Schema.Types.Mixed
  },
  isUseful: {
    type: Boolean,
    default: null
  },
  feedback: {
    type: String,
    default: ''
  },
  feedbackDate: {
    type: Date
  }
}, { timestamps: false });

// Tạo indexes cho tìm kiếm
predictionLogSchema.index({ 'timestamp': -1 });
predictionLogSchema.index({ 'userId': 1, 'timestamp': -1 });
predictionLogSchema.index({ 'modelType': 1, 'timestamp': -1 });
predictionLogSchema.index({ 'isUseful': 1 });

module.exports = mongoose.model('PredictionLog', predictionLogSchema, 'prediction_logs'); 