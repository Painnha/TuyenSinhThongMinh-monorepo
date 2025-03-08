require('dotenv').config();
const mongoose = require('mongoose');

const connectWithRetry = async () => {
  // Sử dụng MONGODB_URI từ file .env - đây là kết nối đến MongoDB Atlas
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('MONGODB_URI không được định nghĩa trong biến môi trường');
  }
  
  console.log('Connecting to MongoDB with URI:', uri.substring(0, 20) + '...');
  
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Tăng timeout lên 30 giây
    socketTimeoutMS: 60000, // Tăng timeout cho socket
  };

  return mongoose.connect(uri, options);
};

const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      await connectWithRetry();
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      retries++;
      console.log(`MongoDB connection attempt ${retries} failed. Retrying in 5 seconds...`);
      console.error('Error:', error.message);
      // Đợi 5 giây trước khi thử lại
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.error('Failed to connect to MongoDB after multiple attempts');
  process.exit(1);
};

module.exports = connectDB;