const PredictionLog = require('../models/PredictionLog');

// Lấy danh sách logs với các tùy chọn lọc và sắp xếp
exports.getLogs = async (req, res) => {
  try {
    const { 
      userId, 
      modelType, 
      startDate, 
      endDate,
      page = 1, 
      limit = 10,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Xây dựng filter
    const filter = {};
    
    if (userId) filter.userId = userId;
    if (modelType) filter.modelType = modelType;
    
    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Xây dựng sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Đếm tổng số bản ghi thỏa mãn điều kiện
    const total = await PredictionLog.countDocuments(filter);
    
    // Truy vấn với phân trang
    const logs = await PredictionLog.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Chuẩn bị dữ liệu trả về
    const formattedLogs = logs.map(log => {
      // Tạo tóm tắt inputs và outputs
      let inputSummary = {};
      let outputSummary = {};

      if (log.modelType === 'admission_prediction') {
        inputSummary = {
          universityCode: log.inputs.universityCode,
          majorName: log.inputs.majorName,
          combination: log.inputs.combination,
          totalScore: log.inputs.scores ? Object.values(log.inputs.scores).reduce((a, b) => a + b, 0) : null
        };
        
        outputSummary = {
          admissionProbability: log.outputs.admissionProbability,
          expectedScore: log.outputs.expectedScore,
          totalScore: log.outputs.totalScore
        };
      } else if (log.modelType === 'major_recommendation') {
        inputSummary = {
          interests: log.inputs.interests,
          subject_groups: log.inputs.subject_groups
        };
        
        if (log.outputs && Array.isArray(log.outputs) && log.outputs.length > 0) {
          outputSummary = {
            recommendedMajors: log.outputs.slice(0, 3).map(o => o.major_name)
          };
        }
      }

      return {
        _id: log._id,
        userId: log.userId,
        timestamp: log.timestamp,
        modelType: log.modelType,
        inputSummary,
        outputSummary,
        isUseful: log.isUseful,
        hasFeedback: !!log.feedback
      };
    });

    res.status(200).json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error in getLogs:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách logs',
      error: error.message
    });
  }
};

// Lấy chi tiết của một log cụ thể
exports.getLogDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await PredictionLog.findById(id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy log với ID này'
      });
    }
    
    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error in getLogDetail:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết log',
      error: error.message
    });
  }
};

// Xóa một log
exports.deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await PredictionLog.findByIdAndDelete(id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy log với ID này'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Đã xóa log thành công',
      data: { id }
    });
  } catch (error) {
    console.error('Error in deleteLog:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa log',
      error: error.message
    });
  }
};

// Xóa nhiều logs
exports.deleteManyLogs = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu cung cấp mảng IDs hợp lệ'
      });
    }
    
    const result = await PredictionLog.deleteMany({ _id: { $in: ids } });
    
    res.status(200).json({
      success: true,
      message: `Đã xóa ${result.deletedCount} logs thành công`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('Error in deleteManyLogs:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa nhiều logs',
      error: error.message
    });
  }
};

// Lấy thống kê về logs
exports.getStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Xây dựng filter theo khoảng thời gian
    const timeFilter = {};
    if (startDate || endDate) {
      timeFilter.timestamp = {};
      if (startDate) timeFilter.timestamp.$gte = new Date(startDate);
      if (endDate) timeFilter.timestamp.$lte = new Date(endDate);
    }
    
    // Thống kê tổng số logs theo loại mô hình
    const modelTypeCounts = await PredictionLog.aggregate([
      { $match: timeFilter },
      { $group: { _id: '$modelType', count: { $sum: 1 } } }
    ]);
    
    // Thống kê tỷ lệ hài lòng
    const feedbackStats = await PredictionLog.aggregate([
      { $match: { ...timeFilter, isUseful: { $ne: null } } },
      { $group: { 
          _id: '$isUseful', 
          count: { $sum: 1 } 
        } 
      }
    ]);
    
    // Tạo tỷ lệ hài lòng
    const totalFeedback = feedbackStats.reduce((sum, stat) => sum + stat.count, 0);
    const satisfactionRate = totalFeedback > 0 
      ? feedbackStats.find(stat => stat._id === true)?.count / totalFeedback || 0
      : 0;
    
    // Ngành học được dự đoán nhiều nhất (top 5)
    const topMajors = await PredictionLog.aggregate([
      { 
        $match: { 
          ...timeFilter, 
          modelType: 'admission_prediction',
          'inputs.majorName': { $exists: true }
        } 
      },
      { $group: { _id: '$inputs.majorName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Trường đại học được dự đoán nhiều nhất (top 5)
    const topUniversities = await PredictionLog.aggregate([
      { 
        $match: { 
          ...timeFilter, 
          modelType: 'admission_prediction',
          'inputs.universityCode': { $exists: true }
        } 
      },
      { $group: { _id: '$inputs.universityCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Thống kê phản hồi tiêu cực
    const negativeFeedbacks = await PredictionLog.aggregate([
      { 
        $match: { 
          ...timeFilter, 
          isUseful: false,
          feedback: { $ne: "" }
        } 
      },
      { $group: { _id: '$feedback', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        modelTypeCounts: modelTypeCounts.reduce((obj, item) => {
          obj[item._id] = item.count;
          return obj;
        }, {}),
        feedbackStats: {
          totalWithFeedback: totalFeedback,
          positive: feedbackStats.find(stat => stat._id === true)?.count || 0,
          negative: feedbackStats.find(stat => stat._id === false)?.count || 0,
          satisfactionRate
        },
        topMajors,
        topUniversities,
        negativeFeedbacks
      }
    });
  } catch (error) {
    console.error('Error in getStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê',
      error: error.message
    });
  }
};

// Lấy danh sách phản hồi
exports.getFeedbacks = async (req, res) => {
  try {
    const { 
      isUseful, 
      startDate, 
      endDate,
      page = 1, 
      limit = 10
    } = req.query;

    // Xây dựng filter
    const filter = {
      feedback: { $ne: "" }
    };
    
    if (isUseful !== undefined) {
      filter.isUseful = isUseful === 'true';
    }
    
    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      filter.feedbackDate = {};
      if (startDate) filter.feedbackDate.$gte = new Date(startDate);
      if (endDate) filter.feedbackDate.$lte = new Date(endDate);
    }

    // Đếm tổng số bản ghi thỏa mãn điều kiện
    const total = await PredictionLog.countDocuments(filter);
    
    // Truy vấn với phân trang
    const feedbacks = await PredictionLog.find(filter)
      .sort({ feedbackDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error in getFeedbacks:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phản hồi',
      error: error.message
    });
  }
};

// Lấy danh sách logs của người dùng
exports.getUserLogs = async (req, res) => {
  try {
    const { 
      userId: queryUserId, // Nhận userId từ query params
      modelType, 
      startDate, 
      endDate,
      page = 1, 
      limit = 10,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Ưu tiên userId từ query nếu có, nếu không thì lấy từ thông tin người dùng
    // Hỗ trợ cả trường hợp người dùng dùng email hoặc phone
    let userId;
    
    if (queryUserId) {
      // Nếu client truyền userId qua query params, ưu tiên sử dụng
      userId = queryUserId;
    } else if (req.user) {
      // Nếu không có trong query, lấy từ thông tin người dùng đăng nhập
      userId = req.user.phone || req.user.email || req.user._id;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    // Xây dựng filter với userId đã xác định
    const filter = { userId };
    
    if (modelType) filter.modelType = modelType;
    
    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Xây dựng sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Đếm tổng số bản ghi thỏa mãn điều kiện
    const total = await PredictionLog.countDocuments(filter);
    
    // Truy vấn với phân trang
    const logs = await PredictionLog.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Chuẩn bị dữ liệu trả về
    const formattedLogs = logs.map(log => {
      // Tạo tóm tắt inputs và outputs
      let inputSummary = {};
      let outputSummary = {};

      if (log.modelType === 'admission_prediction') {
        inputSummary = {
          universityCode: log.inputs.universityCode,
          majorName: log.inputs.majorName,
          combination: log.inputs.combination,
          totalScore: log.inputs.scores ? Object.values(log.inputs.scores).reduce((a, b) => a + b, 0) : null
        };
        
        outputSummary = {
          admissionProbability: log.outputs.admissionProbability,
          expectedScore: log.outputs.expectedScore,
          totalScore: log.outputs.totalScore
        };
      } else if (log.modelType === 'major_recommendation') {
        inputSummary = {
          interests: log.inputs.interests,
          subject_groups: log.inputs.subject_groups
        };
        
        if (log.outputs && Array.isArray(log.outputs) && log.outputs.length > 0) {
          outputSummary = {
            recommendedMajors: log.outputs.slice(0, 3).map(o => o.major_name)
          };
        }
      }

      return {
        _id: log._id,
        userId: log.userId,
        timestamp: log.timestamp,
        modelType: log.modelType,
        inputSummary,
        outputSummary,
        isUseful: log.isUseful,
        feedback: log.feedback,
        hasFeedback: !!log.feedback
      };
    });

    res.status(200).json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error in getUserLogs:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách logs',
      error: error.message
    });
  }
};

// Lấy chi tiết của một log của người dùng
exports.getUserLogDetail = async (req, res) => {
  try {
    const { id } = req.params;
    // Lấy userId từ người dùng đã đăng nhập - hỗ trợ cả email và phone
    const userId = req.user.phone || req.user.email || req.user._id;
    
    const log = await PredictionLog.findOne({ _id: id, userId });
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy log với ID này hoặc bạn không có quyền xem'
      });
    }
    
    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error in getUserLogDetail:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết log',
      error: error.message
    });
  }
};

// Cập nhật đánh giá feedback của người dùng
exports.updateUserFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    // Lấy userId từ người dùng đã đăng nhập - hỗ trợ cả email và phone
    const userId = req.user.phone || req.user.email || req.user._id;
    const { isUseful, feedback } = req.body;
    
    if (isUseful === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp trường isUseful'
      });
    }
    
    // Tìm log và kiểm tra quyền sở hữu
    const log = await PredictionLog.findOne({ _id: id, userId });
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy log với ID này hoặc bạn không có quyền chỉnh sửa'
      });
    }
    
    // Cập nhật feedback
    log.isUseful = isUseful;
    log.feedback = feedback || '';
    log.feedbackDate = new Date();
    
    await log.save();
    
    res.status(200).json({
      success: true,
      message: 'Đã cập nhật đánh giá thành công',
      data: {
        _id: log._id,
        isUseful: log.isUseful,
        feedback: log.feedback,
        feedbackDate: log.feedbackDate
      }
    });
  } catch (error) {
    console.error('Error in updateUserFeedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật đánh giá',
      error: error.message
    });
  }
}; 