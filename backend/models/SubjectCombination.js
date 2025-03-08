const mongoose = require('mongoose');

const subjectCombinationSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    subjects: {
        type: String,
        required: true,
        trim: true
    },
    subjectList: [{
        type: String,
        required: true,
        trim: true
    }],
    schoolCount: {
        type: Number,
        required: true,
        min: 0
    },
    majorCount: {
        type: Number,
        required: true,
        min: 0
    },
    note: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Tạo index cho tìm kiếm
subjectCombinationSchema.index({ code: 1 });
subjectCombinationSchema.index({ subjects: 'text' });

module.exports = mongoose.model('SubjectCombination', subjectCombinationSchema); 