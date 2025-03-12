require('dotenv').config();
const mongoose = require('mongoose');
const SubjectCombination = require('../models/SubjectCombination');

console.log('Bắt đầu script import dữ liệu mẫu...');
console.log('URI MongoDB:', process.env.MONGODB_URI ? 'Tồn tại' : 'Không tồn tại');

// Sample data
const sampleCombinations = [
    {
        code: 'A00',
        subjects: 'Toán, Lý, Hóa',
        subjectList: ['Toán', 'Lý', 'Hóa'],
        schoolCount: 120,
        majorCount: 500,
        note: 'Phổ biến cho khối kỹ thuật'
    },
    {
        code: 'A01',
        subjects: 'Toán, Lý, Tiếng Anh',
        subjectList: ['Toán', 'Lý', 'Tiếng Anh'],
        schoolCount: 100,
        majorCount: 450,
        note: 'Phổ biến cho khối kỹ thuật, CNTT'
    },
    {
        code: 'B00',
        subjects: 'Toán, Hóa học, Sinh học',
        subjectList: ['Toán', 'Hóa học', 'Sinh học'],
        schoolCount: 80,
        majorCount: 350,
        note: 'Phổ biến cho khối y dược'
    },
    {
        code: 'C00',
        subjects: 'Văn, Sử, Địa',
        subjectList: ['Văn', 'Sử', 'Địa'],
        schoolCount: 70,
        majorCount: 300,
        note: 'Phổ biến cho khối xã hội'
    },
    {
        code: 'D01',
        subjects: 'Toán, Văn, Tiếng Anh',
        subjectList: ['Toán', 'Văn', 'Tiếng Anh'],
        schoolCount: 150,
        majorCount: 600,
        note: 'Phổ biến nhất, nhiều ngành'
    },
    {
        code: 'D07',
        subjects: 'Toán, Hóa, Tiếng Anh',
        subjectList: ['Toán', 'Hóa', 'Tiếng Anh'],
        schoolCount: 65,
        majorCount: 250,
        note: 'Phù hợp cho nhiều ngành'
    },
    {
        code: 'D08',
        subjects: 'Toán, Sinh, Tiếng Anh',
        subjectList: ['Toán', 'Sinh', 'Tiếng Anh'],
        schoolCount: 60,
        majorCount: 200,
        note: 'Phù hợp cho y sinh, dược'
    },
    {
        code: 'A02',
        subjects: 'Toán, Lý, Sinh',
        subjectList: ['Toán', 'Lý', 'Sinh'],
        schoolCount: 50,
        majorCount: 180,
        note: 'Kỹ thuật, công nghệ'
    },
    {
        code: 'A03',
        subjects: 'Toán, Lý, Sử',
        subjectList: ['Toán', 'Lý', 'Sử'],
        schoolCount: 30,
        majorCount: 100,
        note: 'Ít phổ biến'
    },
    {
        code: 'A05',
        subjects: 'Toán, Hóa, Sử',
        subjectList: ['Toán', 'Hóa', 'Sử'],
        schoolCount: 25,
        majorCount: 80,
        note: 'Ít phổ biến'
    }
];

console.log(`Đã chuẩn bị ${sampleCombinations.length} tổ hợp môn để import`);

// Connect to MongoDB
const connectDB = async () => {
    try {
        console.log('Đang kết nối MongoDB với URI:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Kết nối MongoDB thành công');
    } catch (err) {
        console.error('Lỗi kết nối MongoDB:', err);
        process.exit(1);
    }
};

// Main function
const importData = async () => {
    try {
        await connectDB();
        
        // Xóa dữ liệu cũ trong collection
        console.log('Đang xóa dữ liệu cũ...');
        await SubjectCombination.deleteMany({});
        
        // Import dữ liệu mẫu
        console.log('Đang import dữ liệu mẫu...');
        const result = await SubjectCombination.insertMany(sampleCombinations);
        
        console.log(`Đã import thành công ${result.length} tổ hợp môn`);
        console.log('Dữ liệu mẫu đã được thêm vào cơ sở dữ liệu');
        
        // Đóng kết nối
        mongoose.connection.close();
        console.log('Kết nối đã đóng');
    } catch (err) {
        console.error('Lỗi khi import dữ liệu mẫu:', err);
        process.exit(1);
    }
};

// Chạy script
importData(); 