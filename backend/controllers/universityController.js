const University = require('../models/University');

/**
 * Lấy danh sách tất cả trường đại học với khả năng tìm kiếm
 */
exports.getAllUniversities = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    let query = {};

    // Xử lý tìm kiếm
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { code: searchRegex },
          { name: searchRegex }
        ]
      };
    }

    // Nếu có yêu cầu phân trang
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const universities = await University.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await University.countDocuments(query);

      return res.json({
        success: true,
        data: universities,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    }

    // Nếu không có phân trang, lấy tất cả
    const universities = await University.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      data: universities,
      pagination: {
        total: universities.length,
        page: 1,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách trường:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách trường',
      error: error.message
    });
  }
};

/**
 * Lấy thông tin chi tiết một trường
 */
exports.getUniversityByCode = async (req, res) => {
  try {
    const university = await University.findOne({ code: req.params.code.toUpperCase() });
    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin trường'
      });
    }
    res.json({
      success: true,
      data: university
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin trường:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin trường',
      error: error.message
    });
  }
};

/**
 * Tạo mới một trường
 */
exports.createUniversity = async (req, res) => {
  try {
    const university = new University(req.body);
    const newUniversity = await university.save();
    res.status(201).json({
      success: true,
      data: newUniversity
    });
  } catch (error) {
    console.error('Lỗi khi tạo trường mới:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Mã trường đã tồn tại'
      });
    }
    res.status(400).json({
      success: false,
      message: 'Lỗi khi tạo trường mới',
      error: error.message
    });
  }
};

/**
 * Cập nhật thông tin trường
 */
exports.updateUniversity = async (req, res) => {
  try {
    const university = await University.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      req.body,
      { new: true, runValidators: true }
    );

    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin trường'
      });
    }

    res.json({
      success: true,
      data: university
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật thông tin trường:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi cập nhật thông tin trường',
      error: error.message
    });
  }
};

/**
 * Xóa một trường
 */
exports.deleteUniversity = async (req, res) => {
  try {
    const university = await University.findOneAndDelete({ code: req.params.code.toUpperCase() });
    
    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin trường'
      });
    }

    res.json({
      success: true,
      message: 'Đã xóa thông tin trường thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa thông tin trường:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thông tin trường',
      error: error.message
    });
  }
};

/**
 * Import nhiều trường
 */
exports.importUniversities = async (req, res) => {
  try {
    const universities = req.body;
    if (!Array.isArray(universities)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu import phải là một mảng'
      });
    }

    const result = await University.insertMany(universities, { ordered: false });
    res.status(201).json({
      success: true,
      message: `Đã import thành công ${result.length} trường`,
      data: result
    });
  } catch (error) {
    console.error('Lỗi khi import dữ liệu trường:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi import dữ liệu trường',
      error: error.message
    });
  }
}; 