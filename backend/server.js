require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Cấu hình CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Import connectDB từ app.js
const connectDB = require('./app');

// Khởi động server sau khi kết nối DB thành công
const startServer = async () => {
  try {
    // Kết nối đến MongoDB với retry logic
    await connectDB();
    
    // Import routes
    const authRoutes = require('./routes/authRoutes');
    const subjectCombinationsRouter = require('./routes/subjectCombinations');
    const universityRoutes = require('./routes/universityRoutes');

    // Sử dụng routes
    app.use('/api/auth', authRoutes);
    app.use('/api/subject-combinations', subjectCombinationsRouter);
    app.use('/api/universities', universityRoutes);

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({
        success: false,
        error: 'Something went wrong!'
      });
    });

    // Khởi động server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server chạy trên cổng ${PORT}`);
    });
  } catch (error) {
    console.error('Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
};

startServer();