const SubjectCombination = require('../models/SubjectCombination');

/**
 * Lấy danh sách tất cả tổ hợp môn với khả năng tìm kiếm và phân trang
 */
exports.getAllCombinations = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    let query = { isActive: true };

    // Xử lý tìm kiếm
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        ...query,
        $or: [
          { code: searchRegex },
          { subjects: searchRegex }
        ]
      };
    }

    // Nếu có yêu cầu phân trang
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const combinations = await SubjectCombination.find(query)
        .sort({ code: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await SubjectCombination.countDocuments(query);

      return res.json({
        success: true,
        data: combinations,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    }

    // Nếu không có phân trang, lấy tất cả
    const combinations = await SubjectCombination.find(query).sort({ code: 1 });
    
    res.json({
      success: true,
      data: combinations,
      pagination: {
        total: combinations.length,
        page: 1,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tổ hợp môn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách tổ hợp môn',
      error: error.message
    });
  }
};

/**
 * Lấy thông tin chi tiết một tổ hợp môn
 */
exports.getCombinationByCode = async (req, res) => {
  try {
    const combination = await SubjectCombination.findOne({
      code: req.params.code.toUpperCase(),
      isActive: true
    });

    if (!combination) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tổ hợp môn'
      });
    }

    res.json({
      success: true,
      data: combination
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin tổ hợp môn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin tổ hợp môn',
      error: error.message
    });
  }
};

/**
 * Tạo mới một tổ hợp môn
 */
exports.createCombination = async (req, res) => {
  try {
    // Xử lý subjectList từ subjects nếu không được cung cấp
    if (!req.body.subjectList && req.body.subjects) {
      req.body.subjectList = req.body.subjects.split(',').map(subject => subject.trim());
    }

    const combination = new SubjectCombination(req.body);
    const newCombination = await combination.save();

    res.status(201).json({
      success: true,
      data: newCombination
    });
  } catch (error) {
    console.error('Lỗi khi tạo tổ hợp môn:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Mã tổ hợp môn đã tồn tại'
      });
    }
    res.status(400).json({
      success: false,
      message: 'Lỗi khi tạo tổ hợp môn',
      error: error.message
    });
  }
};

/**
 * Cập nhật thông tin tổ hợp môn
 */
exports.updateCombination = async (req, res) => {
  try {
    // Xử lý subjectList từ subjects nếu được cung cấp
    if (!req.body.subjectList && req.body.subjects) {
      req.body.subjectList = req.body.subjects.split(',').map(subject => subject.trim());
    }

    const combination = await SubjectCombination.findOneAndUpdate(
      { code: req.params.code.toUpperCase(), isActive: true },
      req.body,
      { new: true, runValidators: true }
    );

    if (!combination) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tổ hợp môn'
      });
    }

    res.json({
      success: true,
      data: combination
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật tổ hợp môn:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi cập nhật tổ hợp môn',
      error: error.message
    });
  }
};

/**
 * Xóa mềm một tổ hợp môn
 */
exports.deleteCombination = async (req, res) => {
  try {
    const combination = await SubjectCombination.findOneAndUpdate(
      { code: req.params.code.toUpperCase(), isActive: true },
      { isActive: false },
      { new: true }
    );
    
    if (!combination) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tổ hợp môn'
      });
    }

    res.json({
      success: true,
      message: 'Đã xóa tổ hợp môn thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa tổ hợp môn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tổ hợp môn',
      error: error.message
    });
  }
};

/**
 * Import nhiều tổ hợp môn
 */
exports.importCombinations = async (req, res) => {
  try {
    const combinations = req.body;
    if (!Array.isArray(combinations)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu import phải là một mảng'
      });
    }

    // Xử lý subjectList cho mỗi item
    const processedCombinations = combinations.map(combination => ({
      ...combination,
      subjectList: combination.subjects.split(',').map(subject => subject.trim())
    }));

    const result = await SubjectCombination.insertMany(processedCombinations, { ordered: false });
    res.status(201).json({
      success: true,
      message: `Đã import thành công ${result.length} tổ hợp môn`,
      data: result
    });
  } catch (error) {
    console.error('Lỗi khi import dữ liệu tổ hợp môn:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi import dữ liệu tổ hợp môn',
      error: error.message
    });
  }
}; 