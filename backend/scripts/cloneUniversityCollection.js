require('dotenv').config();
const { MongoClient } = require('mongodb');

console.log('Script clone collection universities từ database test sang tuyen_sinh_thong_minh');

// Hàm clone collection
const cloneCollection = async () => {
  try {
    // Lấy MONGODB_URI từ biến môi trường
    const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    
    // Kết nối đến MongoDB
    console.log('Đang kết nối đến MongoDB...');
    const client = new MongoClient(connectionString);
    await client.connect();
    
    console.log('Kết nối MongoDB thành công!');
    
    // Kết nối đến database nguồn và đích
    const sourceDB = client.db('test');
    const targetDB = client.db('tuyen_sinh_thong_minh');
    
    console.log('Đang đọc dữ liệu từ collection universities (database test)...');
    
    // Đọc tất cả dữ liệu từ collection nguồn
    const sourceCollection = sourceDB.collection('universities');
    const documents = await sourceCollection.find({}).toArray();
    
    console.log(`Tìm thấy ${documents.length} documents từ collection nguồn`);
    
    if (documents.length === 0) {
      console.log('Không tìm thấy dữ liệu nào để clone');
      await client.close();
      return;
    }
    
    // Xóa collection đích nếu tồn tại
    console.log('Xóa collection đích nếu tồn tại...');
    try {
      await targetDB.collection('universities_benchmark_full').drop();
      console.log('Đã xóa collection cũ');
    } catch (err) {
      console.log('Collection chưa tồn tại, bỏ qua bước xóa');
    }
    
    // Tạo collection mới và insert dữ liệu
    console.log('Đang insert dữ liệu vào collection đích...');
    const targetCollection = targetDB.collection('universities_benchmark_full');
    const insertResult = await targetCollection.insertMany(documents);
    
    console.log(`Đã clone thành công ${insertResult.insertedCount} documents từ 'test.universities' sang 'tuyen_sinh_thong_minh.universities_benchmark_full'`);
    
    // Tạo index cho collection mới
    console.log('Đang tạo index...');
    await targetCollection.createIndex({ code: 1 });
    console.log('Đã tạo index cho trường code');
    
    // Đóng kết nối
    await client.close();
    console.log('Quá trình clone hoàn tất!');
    
  } catch (error) {
    console.error('Lỗi khi clone collection:', error);
    process.exit(1);
  }
};

// Chạy hàm clone
cloneCollection(); 