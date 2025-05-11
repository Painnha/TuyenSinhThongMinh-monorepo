import React, { useState, useEffect } from 'react';
import { getUserLogs } from '../../services/predictionLogService';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import LogDetailModal from './LogDetailModal';
import './LogsList.css';
import FeedbackForm from './FeedbackForm';

const UserLogsList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    modelType: '',
    startDate: '',
    endDate: '',
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [userId, setUserId] = useState(null);

  // Lấy userID khi component mount
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // Ưu tiên lấy userID theo thứ tự: phone > email > _id
        setUserId(user.phone || user.email || user._id);
        console.log('User ID được sử dụng:', user.phone || user.email || user._id);
      } else {
        console.warn('Không tìm thấy thông tin người dùng trong localStorage');
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin người dùng:', err);
    }
  }, []);

  // Gọi API để lấy logs khi component được render hoặc có thay đổi về filter/phân trang
  useEffect(() => {
    if (userId) {
      fetchLogs();
    }
  }, [currentPage, filters, userId]);

  const fetchLogs = async () => {
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getUserLogs({
        page: currentPage,
        limit: 10,
        modelType: filters.modelType || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        sortBy: 'timestamp',
        sortOrder: 'desc',
        userId: userId // Truyền userId vào request
      });

      if (response.success) {
        setLogs(response.data.logs);
        setTotalPages(response.data.pagination.pages);
      } else {
        setError('Không thể tải dữ liệu logs');
      }
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý thay đổi bộ lọc
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1); // Reset về trang 1 khi lọc
  };

  // Xử lý việc áp dụng bộ lọc
  const handleApplyFilters = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  // Xử lý reset bộ lọc
  const handleResetFilters = () => {
    setFilters({
      modelType: '',
      startDate: '',
      endDate: '',
    });
    setCurrentPage(1);
  };

  // Xử lý khi click vào một log để xem chi tiết
  const handleViewDetail = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  // Xử lý khi click vào nút feedback
  const handleFeedback = (log) => {
    setSelectedLog(log);
    setShowFeedbackModal(true);
  };

  // Xử lý khi submit feedback thành công
  const handleFeedbackSubmitted = () => {
    fetchLogs(); // Tải lại dữ liệu sau khi đã cập nhật feedback
    setShowFeedbackModal(false);
  };

  // Hiển thị loại dự đoán dưới dạng text thân thiện
  const renderModelTypeText = (modelType) => {
    switch (modelType) {
      case 'admission_prediction':
        return 'Dự đoán trúng tuyển';
      case 'major_recommendation':
        return 'Gợi ý ngành học';
      default:
        return modelType;
    }
  };

  // Render nút phân trang
  const renderPagination = () => {
    const pages = [];
    const displayPages = 5; // Số trang hiển thị tối đa
    
    let startPage = Math.max(1, currentPage - Math.floor(displayPages / 2));
    let endPage = Math.min(totalPages, startPage + displayPages - 1);
    
    if (endPage - startPage + 1 < displayPages) {
      startPage = Math.max(1, endPage - displayPages + 1);
    }
    
    // Nút first page
    if (startPage > 1) {
      pages.push(
        <button key="first" className="pagination-btn" onClick={() => setCurrentPage(1)}>
          &laquo;
        </button>
      );
    }
    
    // Danh sách các trang
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>
      );
    }
    
    // Nút last page
    if (endPage < totalPages) {
      pages.push(
        <button key="last" className="pagination-btn" onClick={() => setCurrentPage(totalPages)}>
          &raquo;
        </button>
      );
    }
    
    return <div className="pagination">{pages}</div>;
  };

  return (
    <div className="logs-container">
      <h1>Lịch sử dự đoán của tôi</h1>
      
      {/* Phần filter */}
      <div className="filter-section">
        <form onSubmit={handleApplyFilters}>
          <div className="filters">
            <div className="filter-group">
              <label>Loại dự đoán:</label>
              <select 
                name="modelType" 
                value={filters.modelType} 
                onChange={handleFilterChange}
              >
                <option value="">Tất cả</option>
                <option value="admission_prediction">Dự đoán trúng tuyển</option>
                <option value="major_recommendation">Gợi ý ngành học</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Từ ngày:</label>
              <input 
                type="date" 
                name="startDate" 
                value={filters.startDate} 
                onChange={handleFilterChange} 
              />
            </div>
            
            <div className="filter-group">
              <label>Đến ngày:</label>
              <input 
                type="date" 
                name="endDate" 
                value={filters.endDate} 
                onChange={handleFilterChange} 
              />
            </div>
            
            <div className="filter-buttons">
              <button type="submit" className="btn-primary">Áp dụng</button>
              <button type="button" className="btn-secondary" onClick={handleResetFilters}>Đặt lại</button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Hiển thị lỗi */}
      {error && <div className="error-message">{error}</div>}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="loading">Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* Bảng logs */}
          {logs.length > 0 ? (
            <div className="logs-table-wrapper">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Loại dự đoán</th>
                    <th>Dữ liệu đầu vào</th>
                    <th>Kết quả dự đoán</th>
                    <th>Đánh giá</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: vi })}</td>
                      <td>{renderModelTypeText(log.modelType)}</td>
                      <td>
                        {log.modelType === 'admission_prediction' ? (
                          <div>
                            <div><strong>Trường:</strong> {log.inputSummary.universityCode}</div>
                            <div><strong>Ngành:</strong> {log.inputSummary.majorName}</div>
                            <div><strong>Tổ hợp:</strong> {log.inputSummary.combination}</div>
                          </div>
                        ) : log.modelType === 'major_recommendation' ? (
                          <div>
                            <div><strong>Sở thích:</strong> {log.inputSummary.interests?.join(', ')}</div>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td>
                        {log.modelType === 'admission_prediction' ? (
                          <div>
                            <div><strong>Xác suất:</strong> {(log.outputSummary.admissionProbability * 100).toFixed(2)}%</div>
                            <div><strong>Điểm kỳ vọng:</strong> {log.outputSummary.expectedScore?.toFixed(2)}</div>
                          </div>
                        ) : log.modelType === 'major_recommendation' ? (
                          <div>
                            <strong>Ngành gợi ý:</strong>
                            <ul>
                              {log.outputSummary.recommendedMajors?.map((major, idx) => (
                                <li key={idx}>{major}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td>
                        {log.isUseful === true && (
                          <span className="feedback-useful">Hữu ích</span>
                        )}
                        {log.isUseful === false && (
                          <span className="feedback-not-useful">Không hữu ích</span>
                        )}
                        {log.isUseful === null && (
                          <span className="feedback-none">Chưa đánh giá</span>
                        )}
                      </td>
                      <td className="action-buttons">
                        <button 
                          className="btn-view" 
                          onClick={() => handleViewDetail(log)}
                        >
                          Xem chi tiết
                        </button>
                        <button 
                          className="btn-feedback" 
                          onClick={() => handleFeedback(log)}
                        >
                          {log.hasFeedback ? 'Sửa đánh giá' : 'Thêm đánh giá'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">Không có dữ liệu nào phù hợp với điều kiện tìm kiếm.</div>
          )}
          
          {/* Phân trang */}
          {totalPages > 1 && renderPagination()}
        </>
      )}
      
      {/* Modal chi tiết log */}
      {showDetailModal && selectedLog && (
        <LogDetailModal 
          logId={selectedLog._id}
          onClose={() => setShowDetailModal(false)}
          isUserLog={true}
        />
      )}
      
      {/* Modal thêm/sửa feedback */}
      {showFeedbackModal && selectedLog && (
        <FeedbackForm
          logId={selectedLog._id}
          initialData={{
            isUseful: selectedLog.isUseful,
            feedback: selectedLog.feedback || ''
          }}
          onClose={() => setShowFeedbackModal(false)}
          onSubmitted={handleFeedbackSubmitted}
        />
      )}
    </div>
  );
};

export default UserLogsList; 