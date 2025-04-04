const mongoose = require('mongoose');

const subjectCombinationSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    subjects: {
        type: [String],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Cập nhật thời gian khi document được update
subjectCombinationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('SubjectCombination', subjectCombinationSchema, 'subject_combinations'); 