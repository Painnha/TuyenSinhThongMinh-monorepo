require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const SubjectCombination = require('../models/SubjectCombination');

console.log('Bắt đầu script import dữ liệu từ CSV...');
console.log('URI MongoDB:', process.env.MONGODB_URI ? 'Tồn tại' : 'Không tồn tại');

// Đường dẫn đến file CSV
const csvFilePath = path.join(__dirname, '../data/subject-combinations.csv');
console.log('Đường dẫn file CSV:', csvFilePath);

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
        
        console.log('Đang đọc file CSV...');
        
        // Kiểm tra file tồn tại
        if (!fs.existsSync(csvFilePath)) {
            console.error(`File CSV không tồn tại: ${csvFilePath}`);
            process.exit(1);
        }
        
        const combinations = [];
        
        // Đọc file CSV và parse dữ liệu
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (data) => {
                    // Transform CSV data
                    const combination = {
                        code: data.SubjectGroup,
                        subjects: data['Môn chi tiết'],
                        subjectList: data['Môn chi tiết'].split(',').map(s => s.trim()),
                        schoolCount: parseInt(data.Trường.split(' ')[0]),
                        majorCount: parseInt(data.Ngành.split(' ')[0]),
                        note: data['Ghi chú']
                    };
                    combinations.push(combination);
                })
                .on('error', (error) => {
                    console.error('Lỗi khi đọc file CSV:', error);
                    reject(error);
                })
                .on('end', () => {
                    console.log(`Đã đọc xong ${combinations.length} bản ghi từ CSV`);
                    resolve();
                });
        });
        
        // Import dữ liệu vào MongoDB
        console.log('Đang import dữ liệu vào MongoDB...');
        if (combinations.length === 0) {
            console.log('Không có dữ liệu để import!');
        } else {
            const result = await SubjectCombination.insertMany(combinations);
            console.log(`Đã import thành công ${result.length} tổ hợp môn`);
        }
        
        // Kiểm tra dữ liệu đã import
        const count = await SubjectCombination.countDocuments();
        console.log(`Tổng số bản ghi trong database: ${count}`);
        
        // Đóng kết nối
        mongoose.connection.close();
        console.log('Kết nối đã đóng');
    } catch (err) {
        console.error('Lỗi khi import dữ liệu từ CSV:', err);
        process.exit(1);
    }
};

// Chạy script
importData(); 