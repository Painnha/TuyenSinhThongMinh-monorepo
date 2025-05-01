require('dotenv').config();

module.exports = {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/tuyen_sinh_thong_minh',
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
}; 