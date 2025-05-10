import React from 'react';
import './Statistics.css';

const Statistics = ({ statistics, statisticsLoading }) => {
  if (statisticsLoading) {
    return (
      <div className="loading-container">
        <div className="custom-spinner"></div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="custom-alert info-alert">
        Không có dữ liệu thống kê.
      </div>
    );
  }

  // Tính toán tổng số logs
  const totalLogs = statistics.modelTypeCounts ? 
    Object.values(statistics.modelTypeCounts).reduce((sum, count) => sum + count, 0) : 0;

  // Chuẩn bị dữ liệu cho bảng loại mô hình
  const modelTypeStats = [];
  if (statistics.modelTypeCounts) {
    Object.entries(statistics.modelTypeCounts).forEach(([type, count]) => {
      modelTypeStats.push({
        modelType: type,
        count,
        percentage: totalLogs > 0 ? ((count / totalLogs) * 100).toFixed(1) : 0
      });
    });
  }

  // Chuẩn bị dữ liệu cho top majors và universities
  const topMajors = statistics.topMajors ? statistics.topMajors.map(item => ({
    majorName: item._id,
    count: item.count
  })) : [];

  const topUniversities = statistics.topUniversities ? statistics.topUniversities.map(item => ({
    universityCode: item._id,
    count: item.count
  })) : [];

  return (
    <div className="statistics-single-container">
      <h2 className="statistics-main-title">Thống kê Log Dự Đoán</h2>

      <div className="statistics-section">
        <h3 className="section-title">Tổng Quan</h3>
        
        <div className="overview-stats">
          <div className="stat-item">
            <div className="stat-value">{totalLogs}</div>
            <div className="stat-label">Tổng số log</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{statistics.feedbackStats?.totalWithFeedback || 0}</div>
            <div className="stat-label">Phản hồi</div>
          </div>
          <div className="stat-item">
            <div className="stat-value positive">{statistics.feedbackStats?.positive || 0}</div>
            <div className="stat-label">Phản hồi tích cực</div>
          </div>
          <div className="stat-item">
            <div className="stat-value negative">{statistics.feedbackStats?.negative || 0}</div>
            <div className="stat-label">Phản hồi tiêu cực</div>
          </div>
        </div>
        
        <div className="satisfaction-rate-container">
          <div className="satisfaction-label">Tỷ lệ hài lòng:</div>
          <div className="satisfaction-progress">
            <div 
              className="satisfaction-bar" 
              style={{width: `${(statistics.feedbackStats?.satisfactionRate || 0) * 100}%`}}
            ></div>
          </div>
          <div className="satisfaction-value">
            {((statistics.feedbackStats?.satisfactionRate || 0) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="statistics-section">
        <h3 className="section-title">Thống kê theo loại mô hình</h3>
        
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Loại mô hình</th>
                <th>Số lượng</th>
                <th>Tỷ lệ</th>
              </tr>
            </thead>
            <tbody>
              {modelTypeStats.map((stat) => (
                <tr key={stat.modelType}>
                  <td>{stat.modelType === 'admission_prediction' ? 'Dự đoán tỷ lệ trúng tuyển' : 'Gợi ý ngành học'}</td>
                  <td>{stat.count}</td>
                  <td>{stat.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="statistics-section">
        <h3 className="section-title">Các trường đại học được tìm kiếm nhiều nhất</h3>
        
        {topUniversities && topUniversities.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mã trường</th>
                  <th>Số lượt tìm kiếm</th>
                </tr>
              </thead>
              <tbody>
                {topUniversities.map((uni, index) => (
                  <tr key={index}>
                    <td>{uni.universityCode}</td>
                    <td>{uni.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="custom-alert info-alert">
            Không có dữ liệu về trường đại học.
          </div>
        )}
      </div>

      <div className="statistics-section">
        <h3 className="section-title">Các ngành học được tìm kiếm nhiều nhất</h3>
        
        {topMajors && topMajors.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tên ngành</th>
                  <th>Số lượt tìm kiếm</th>
                </tr>
              </thead>
              <tbody>
                {topMajors.map((major, index) => (
                  <tr key={index}>
                    <td>{major.majorName}</td>
                    <td>{major.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="custom-alert info-alert">
            Không có dữ liệu về ngành học.
          </div>
        )}
      </div>

      <div className="statistics-section">
        <h3 className="section-title">Phản hồi tiêu cực thường gặp</h3>
        
        {statistics.negativeFeedbacks && statistics.negativeFeedbacks.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nội dung phản hồi</th>
                  <th>Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {statistics.negativeFeedbacks.map((feedback, index) => (
                  <tr key={index}>
                    <td>{feedback._id}</td>
                    <td>{feedback.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="custom-alert info-alert">
            Không có dữ liệu phản hồi tiêu cực.
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics; 