require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const connectDB = async () => {
    try {
        // Kết nối trực tiếp đến database tuyen_sinh_thong_minh
        const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        
        // Ẩn thông tin đăng nhập khi log URI
        const maskedUri = connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log('Connecting to MongoDB:', maskedUri);
        
        // Kết nối và chỉ định database name
        const client = await mongoose.connect(connectionString, {
            dbName: 'tuyen_sinh_thong_minh',
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        // Lưu mongoose connection vào app.locals để dùng cho native MongoDB queries
        app.locals.db = client.connection.db;
        
        console.log(`MongoDB connected successfully to database: ${mongoose.connection.db.databaseName}`);
        return true;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        return false;
    }
};

// Start server after successful DB connection
const startServer = async () => {
  try {
    // Connect to MongoDB with retry logic
    await connectDB();
    
    // Import routes
    const authRoutes = require('./routes/authRoutes');
    const subjectCombinationsRouter = require('./routes/subjectCombinations');
    const universityRoutes = require('./routes/universityRoutes');
    const userRoutes = require('./routes/userRoutes');
    const interestsRouter = require('./routes/interests');
    const admissionRoutes = require('./routes/admissionRoutes');
    const recommendationRoutes = require('./routes/recommendationRoutes');
    const benchmarkScoreRoutes = require('./routes/benchmarkScoreRoutes');
    const universityAdminRoutes = require('./routes/universityAdminRoutes');

    // Use routes
    app.use('/api/auth', authRoutes);
    app.use('/api/subject-combinations', subjectCombinationsRouter);
    app.use('/api/universities', universityRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/interests', interestsRouter);
    app.use('/api/data/admission', admissionRoutes);
    app.use('/api/recommendation', recommendationRoutes);
    app.use('/api/benchmark-scores', benchmarkScoreRoutes);
    app.use('/api/admin/universities', universityAdminRoutes);

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({
        success: false,
        error: 'Something went wrong!'
      });
    });

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();