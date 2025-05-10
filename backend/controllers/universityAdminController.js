const UniversityAdmin = require('../models/UniversityAdmin');

/**
 * Lấy danh sách tất cả trường đại học
 */
exports.getAllUniversities = async (req, res) => {
  try {
    const { search } = req.query;
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

    const universities = await UniversityAdmin.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      universities,
      count: universities.length
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
exports.getUniversityById = async (req, res) => {
  try {
    const university = await UniversityAdmin.findById(req.params.id);
    
    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin trường'
      });
    }
    
    res.json({
      success: true,
      university
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
    // Tự động thêm timestamp
    const universityData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const university = new UniversityAdmin(universityData);
    const newUniversity = await university.save();
    
    res.status(201).json({
      success: true,
      university: newUniversity
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
    // In log ID được gửi từ client
    console.log('Updating university with ID:', req.params.id);
    console.log('Update data:', req.body);
    
    // Lấy code cũ và code mới
    const { originalCode, code } = req.body;
    
    // Tự động cập nhật timestamp
    const universityData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // Xóa originalCode khỏi dữ liệu lưu vào DB
    if (universityData.originalCode) {
      delete universityData.originalCode;
    }
    
    // Kiểm tra ID có hợp lệ không
    let university = null;
    
    try {
      if (req.params.id && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        console.log('ID is valid MongoDB ObjectId, trying to find by ID...');
        university = await UniversityAdmin.findById(req.params.id);
        console.log('University found by ID?', !!university);
      } else {
        console.log('ID is not a valid MongoDB ObjectId');
      }
    } catch (err) {
      console.error('Error when finding by ID:', err);
    }
    
    // Nếu không tìm thấy bằng ID, thử tìm bằng code cũ
    if (!university && originalCode) {
      console.log('University not found by ID, trying to find by original code:', originalCode);
      try {
        university = await UniversityAdmin.findOne({ code: originalCode });
        console.log('University found by original code?', !!university);
        
        if (university) {
          console.log('Updating existing university with original code:', originalCode);
          university = await UniversityAdmin.findOneAndUpdate(
            { code: originalCode },
            universityData,
            { new: true, runValidators: true }
          );
        }
      } catch (err) {
        console.error('Error when finding/updating by original code:', err);
      }
    }
    
    // Nếu vẫn không tìm thấy, thử tìm bằng code mới (code)
    if (!university) {
      console.log('University not found by ID or original code, trying to find by new code:', code);
      try {
        university = await UniversityAdmin.findOne({ code });
        console.log('University found by new code?', !!university);
        
        if (university) {
          console.log('Updating existing university with new code:', code);
          university = await UniversityAdmin.findOneAndUpdate(
            { code },
            universityData,
            { new: true, runValidators: true }
          );
        } else {
          // Nếu không tìm thấy, tạo mới
          console.log('University not found by any method, creating new one');
          const newUniversity = new UniversityAdmin({
            ...universityData,
            createdAt: new Date()
          });
          university = await newUniversity.save();
          console.log('New university created with ID:', university._id);
        }
      } catch (err) {
        console.error('Error when finding/updating/creating by code:', err);
        throw err;
      }
    } else {
      // Nếu tìm thấy trước đó (bằng ID hoặc originalCode), cập nhật
      if (req.params.id && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        console.log('Updating existing university with ID:', req.params.id);
        university = await UniversityAdmin.findByIdAndUpdate(
          req.params.id,
          universityData,
          { new: true, runValidators: true }
        );
      }
    }

    // Kiểm tra lần cuối
    if (!university) {
      console.error('Failed to update or create university');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin trường hoặc không thể tạo mới'
      });
    }

    console.log('Update successful, returning university:', university);
    res.json({
      success: true,
      university
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
    const university = await UniversityAdmin.findByIdAndDelete(req.params.id);
    
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