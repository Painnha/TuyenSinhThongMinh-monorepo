const BenchmarkScore = require('../models/BenchmarkScore');
const University = require('../models/University');

// Lấy tất cả điểm chuẩn với bộ lọc (nếu có)
exports.getBenchmarkScores = async (req, res) => {
  try {
    const { university, major, subject_combination, year, page, limit } = req.query;
    
    // Xây dựng đối tượng query dựa trên các tham số lọc
    const query = {};
    
    if (university) query.university_code = university;
    if (major) query.major = major;
    if (subject_combination) query.subject_combination = subject_combination;
    if (year) query.year = year;
    
    // Kiểm tra có yêu cầu phân trang hay không
    if (page && limit) {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;
      
      // Đếm tổng số bản ghi theo điều kiện lọc
      const total = await BenchmarkScore.countDocuments(query);
      
      // Lấy dữ liệu phân trang
      const benchmarkScores = await BenchmarkScore.find(query)
        .sort({ year: -1 })
        .skip(skip)
        .limit(limitNum);
      
      // Lấy thêm thông tin đầy đủ về trường đại học cho mỗi bản ghi
      const enhancedScores = await Promise.all(
        benchmarkScores.map(async (score) => {
          const scoreObj = score.toObject();
          const university = await University.findOne({ code: score.university_code });
          scoreObj.university = university ? university.name : score.university_code;
          return scoreObj;
        })
      );
      
      // Trả về kết quả với thông tin phân trang
      return res.status(200).json({
        data: enhancedScores,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      });
    } else {
      // Nếu không có phân trang, trả về tất cả kết quả
      const benchmarkScores = await BenchmarkScore.find(query).sort({ year: -1 });
      
      // Lấy thêm thông tin đầy đủ về trường đại học cho mỗi bản ghi
      const enhancedScores = await Promise.all(
        benchmarkScores.map(async (score) => {
          const scoreObj = score.toObject();
          const university = await University.findOne({ code: score.university_code });
          scoreObj.university = university ? university.name : score.university_code;
          return scoreObj;
        })
      );
      
      res.status(200).json(enhancedScores);
    }
  } catch (error) {
    console.error('Error fetching benchmark scores:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy dữ liệu điểm chuẩn', error: error.message });
  }
};

// Lấy thông tin điểm chuẩn theo ID
exports.getBenchmarkScoreById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const benchmarkScore = await BenchmarkScore.findById(id);
    
    if (!benchmarkScore) {
      return res.status(404).json({ message: 'Không tìm thấy điểm chuẩn với ID đã cho' });
    }
    
    const scoreObj = benchmarkScore.toObject();
    const university = await University.findOne({ code: benchmarkScore.university_code });
    scoreObj.university = university ? university.name : benchmarkScore.university_code;
    
    res.status(200).json(scoreObj);
  } catch (error) {
    console.error('Error fetching benchmark score by id:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy dữ liệu điểm chuẩn', error: error.message });
  }
};

// Tạo điểm chuẩn mới
exports.createBenchmarkScore = async (req, res) => {
  try {
    const { university_code, major, subject_combination, benchmark_score, year, notes } = req.body;
    
    // Kiểm tra xem university_code có tồn tại không
    const university = await University.findOne({ code: university_code });
    if (!university) {
      return res.status(400).json({ message: 'Mã trường không tồn tại' });
    }
    
    // Tạo đối tượng điểm chuẩn mới
    const newBenchmarkScore = new BenchmarkScore({
      university: university.name,
      university_code,
      major,
      subject_combination,
      benchmark_score: parseFloat(benchmark_score),
      year,
      notes,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });
    
    // Lưu vào database
    const savedBenchmarkScore = await newBenchmarkScore.save();
    
    res.status(201).json({
      message: 'Thêm điểm chuẩn thành công',
      data: savedBenchmarkScore,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Lỗi duplicate key (vi phạm unique index)
      return res.status(400).json({ 
        message: 'Điểm chuẩn cho trường, ngành, tổ hợp môn và năm này đã tồn tại' 
      });
    }
    
    console.error('Error creating benchmark score:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo điểm chuẩn', error: error.message });
  }
};

// Cập nhật điểm chuẩn
exports.updateBenchmarkScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { university_code, major, subject_combination, benchmark_score, year, notes } = req.body;
    
    // Kiểm tra xem university_code có tồn tại không
    const university = await University.findOne({ code: university_code });
    if (!university) {
      return res.status(400).json({ message: 'Mã trường không tồn tại' });
    }
    
    // Cập nhật thông tin
    const updatedData = {
      university: university.name,
      university_code,
      major,
      subject_combination,
      benchmark_score: parseFloat(benchmark_score),
      year,
      notes,
    };
    
    const updatedBenchmarkScore = await BenchmarkScore.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    );
    
    if (!updatedBenchmarkScore) {
      return res.status(404).json({ message: 'Không tìm thấy điểm chuẩn với ID đã cho' });
    }
    
    res.status(200).json({
      message: 'Cập nhật điểm chuẩn thành công',
      data: updatedBenchmarkScore,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Lỗi duplicate key (vi phạm unique index)
      return res.status(400).json({ 
        message: 'Điểm chuẩn cho trường, ngành, tổ hợp môn và năm này đã tồn tại' 
      });
    }
    
    console.error('Error updating benchmark score:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật điểm chuẩn', error: error.message });
  }
};

// Xóa điểm chuẩn
exports.deleteBenchmarkScore = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedBenchmarkScore = await BenchmarkScore.findByIdAndDelete(id);
    
    if (!deletedBenchmarkScore) {
      return res.status(404).json({ message: 'Không tìm thấy điểm chuẩn với ID đã cho' });
    }
    
    res.status(200).json({
      message: 'Xóa điểm chuẩn thành công',
      data: deletedBenchmarkScore,
    });
  } catch (error) {
    console.error('Error deleting benchmark score:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa điểm chuẩn', error: error.message });
  }
};

// Lấy danh sách tất cả các trường đại học từ bảng benchmark_scores
exports.getUniversities = async (req, res) => {
  try {
    // Sử dụng aggregation để lấy danh sách university_code và university (tên trường) duy nhất
    const universities = await BenchmarkScore.aggregate([
      { 
        $group: { 
          _id: "$university_code",
          name: { $first: "$university" },
          code: { $first: "$university_code" }
        } 
      },
      { $sort: { name: 1 } }
    ]);
    
    res.status(200).json(universities);
  } catch (error) {
    console.error('Error fetching universities from benchmark scores:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy dữ liệu trường đại học', error: error.message });
  }
};

// Lấy danh sách tất cả các ngành từ bảng benchmark_scores
exports.getMajors = async (req, res) => {
  try {
    // Sử dụng aggregation để lấy danh sách tên ngành duy nhất
    const majors = await BenchmarkScore.aggregate([
      { $group: { _id: "$major", name: { $first: "$major" } } },
      { $sort: { name: 1 } },
      { $project: { _id: 1, name: 1 } }
    ]);
    
    res.status(200).json(majors);
  } catch (error) {
    console.error('Error fetching majors from benchmark scores:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy dữ liệu ngành học', error: error.message });
  }
};

// Lấy danh sách tất cả các tổ hợp môn từ bảng benchmark_scores
exports.getSubjectCombinations = async (req, res) => {
  try {
    // Sử dụng aggregation để lấy danh sách tổ hợp môn duy nhất
    const subjectCombinations = await BenchmarkScore.aggregate([
      { $group: { _id: "$subject_combination", code: { $first: "$subject_combination" } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, code: 1 } }
    ]);
    
    res.status(200).json(subjectCombinations);
  } catch (error) {
    console.error('Error fetching subject combinations from benchmark scores:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy dữ liệu tổ hợp môn', error: error.message });
  }
}; 