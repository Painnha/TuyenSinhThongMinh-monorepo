import React from 'react';
import './LogsList.css';

const LogsList = ({ 
  logs, 
  loading, 
  error, 
  pagination, 
  setPagination, 
  filters, 
  setFilters, 
  selectedLogIds, 
  setSelectedLogIds,
  fetchLogs,
  fetchLogDetail,
  setShowDeleteConfirmModal
}) => {

  // Xử lý thay đổi filter
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
    setPagination({
      ...pagination,
      page: 1
    });
  };
  
  // Xử lý thay đổi sort
  const handleSortChange = (field) => {
    if (filters.sortBy === field) {
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setFilters({
        ...filters,
        sortBy: field,
        sortOrder: 'desc'
      });
    }
  };
  
  // Xử lý chọn tất cả logs
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLogIds(logs.map(log => log._id));
    } else {
      setSelectedLogIds([]);
    }
  };
  
  // Xử lý chọn một log
  const handleSelectLog = (id) => {
    if (selectedLogIds.includes(id)) {
      setSelectedLogIds(selectedLogIds.filter(logId => logId !== id));
    } else {
      setSelectedLogIds([...selectedLogIds, id]);
    }
  };

  return (
    <div>
      <div className="custom-card filter-card">
        <div className="card-header">
          <h5>Bộ lọc</h5>
        </div>
        <div className="card-body">
          <form>
            <div className="row">
              <div className="col-md-3">
                <div className="form-group">
                  <label>Mã người dùng</label>
                  <input
                    type="text"
                    name="userId"
                    value={filters.userId}
                    onChange={handleFilterChange}
                    placeholder="Nhập mã người dùng"
                    className="form-control"
                  />
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Loại mô hình</label>
                  <select
                    name="modelType"
                    value={filters.modelType}
                    onChange={handleFilterChange}
                    className="form-control"
                  >
                    <option value="">Tất cả</option>
                    <option value="admission_prediction">Dự đoán tỷ lệ trúng tuyển</option>
                    <option value="major_recommendation">Gợi ý ngành học</option>
                  </select>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Từ ngày</label>
                  <input
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    className="form-control"
                  />
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Đến ngày</label>
                  <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    className="form-control"
                  />
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col d-flex justify-content-end">
                <button 
                  type="button" 
                  className="custom-button secondary-button"
                  onClick={() => {
                    setFilters({
                      userId: '',
                      modelType: '',
                      startDate: '',
                      endDate: '',
                      sortBy: 'timestamp',
                      sortOrder: 'desc'
                    });
                    setPagination({
                      ...pagination,
                      page: 1
                    });
                  }}
                >
                  🔄 Đặt lại
                </button>
                <button 
                  type="button" 
                  className="custom-button primary-button"
                  onClick={fetchLogs}
                >
                  🔍 Lọc
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      <div className="custom-card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>Danh sách log dự đoán</h5>
          <div>
            {selectedLogIds.length > 0 && (
              <button 
                type="button" 
                className="custom-button danger-button"
                onClick={() => setShowDeleteConfirmModal(true)}
              >
                🗑️ Xóa ({selectedLogIds.length})
              </button>
            )}
          </div>
        </div>
        <div className="card-body">
          {error && <div className="custom-alert error-alert">{error}</div>}
          
          {loading ? (
            <div className="loading-container">
              <div className="custom-spinner"></div>
            </div>
          ) : (
            <div>
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th width="30">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={selectedLogIds.length === logs.length && logs.length > 0}
                          className="custom-checkbox"
                        />
                      </th>
                      <th 
                        className="sortable-header"
                        onClick={() => handleSortChange('userId')}
                      >
                        Mã người dùng
                        {filters.sortBy === 'userId' && (
                          <span className="sort-icon-wrapper">
                            {filters.sortOrder === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </th>
                      <th width="180"
                        className="sortable-header"
                        onClick={() => handleSortChange('timestamp')}
                      >
                        Thời gian
                        {filters.sortBy === 'timestamp' && (
                          <span className="sort-icon-wrapper">
                            {filters.sortOrder === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </th>
                      <th width="120"
                        className="sortable-header"
                        onClick={() => handleSortChange('modelType')}
                      >
                        Loại mô hình
                        {filters.sortBy === 'modelType' && (
                          <span className="sort-icon-wrapper">
                            {filters.sortOrder === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </th>
                      <th>Tóm tắt đầu vào</th>
                      <th>Tóm tắt kết quả</th>
                      <th width="100">Phản hồi</th>
                      <th width="80">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <tr key={log._id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedLogIds.includes(log._id)}
                              onChange={() => handleSelectLog(log._id)}
                              className="custom-checkbox"
                            />
                          </td>
                          <td>{log.userId}</td>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={`custom-badge ${log.modelType === 'admission_prediction' ? 'info-badge' : 'success-badge'}`}>
                              {log.modelType === 'admission_prediction' ? 'Dự đoán tỷ lệ' : 'Gợi ý ngành'}
                            </span>
                          </td>
                          <td>
                            {log.modelType === 'admission_prediction' ? (
                              <div>
                                <div><strong>Trường:</strong> {log.inputSummary.universityCode}</div>
                                <div><strong>Ngành:</strong> {log.inputSummary.majorName}</div>
                                <div><strong>Tổ hợp:</strong> {log.inputSummary.combination}</div>
                              </div>
                            ) : (
                              <div>
                                <div><strong>Sở thích:</strong> {log.inputSummary.interests?.join(', ')}</div>
                                <div><strong>Tổ hợp môn:</strong> {log.inputSummary.subject_groups?.join(', ')}</div>
                              </div>
                            )}
                          </td>
                          <td>
                            {log.modelType === 'admission_prediction' ? (
                              <div>
                                <div><strong>Xác suất:</strong> {(log.outputSummary.admissionProbability * 100).toFixed(2)}%</div>
                                <div><strong>Điểm chuẩn dự kiến:</strong> {log.outputSummary.expectedScore}</div>
                              </div>
                            ) : (
                              <div>
                                <div><strong>Ngành gợi ý:</strong></div>
                                <ul className="mb-0 ps-3">
                                  {log.outputSummary.recommendedMajors?.map((major, idx) => (
                                    <li key={idx}>{major}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                          <td>
                            {log.isUseful === true && (
                              <span className="custom-badge success-badge">
                                ✅ Hài lòng
                              </span>
                            )}
                            {log.isUseful === false && (
                              <span className="custom-badge danger-badge">
                                ❌ Không hài lòng
                              </span>
                            )}
                            {log.hasFeedback && (
                              <span className="custom-badge info-badge mt-1">
                                Có phản hồi
                              </span>
                            )}
                          </td>
                          <td>
                            <button 
                              type="button" 
                              className="custom-button outline-button"
                              onClick={() => fetchLogDetail(log._id)}
                            >
                              👁️
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center">
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {pagination.pages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Hiển thị {logs.length} trên tổng số {pagination.total} log
                  </div>
                  <div className="custom-pagination">
                    <button 
                      className={`pagination-button ${pagination.page === 1 ? 'disabled' : ''}`}
                      onClick={() => setPagination({...pagination, page: 1})}
                      disabled={pagination.page === 1}
                    >
                      &laquo;
                    </button>
                    <button 
                      className={`pagination-button ${pagination.page === 1 ? 'disabled' : ''}`}
                      onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                      disabled={pagination.page === 1}
                    >
                      &lsaquo;
                    </button>
                    
                    {[...Array(pagination.pages).keys()].map(x => {
                      const pageNumber = x + 1;
                      // Chỉ hiển thị 5 trang xung quanh trang hiện tại
                      if (
                        pageNumber === 1 ||
                        pageNumber === pagination.pages ||
                        (pageNumber >= pagination.page - 2 && pageNumber <= pagination.page + 2)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            className={`pagination-button ${pageNumber === pagination.page ? 'active' : ''}`}
                            onClick={() => setPagination({...pagination, page: pageNumber})}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        (pageNumber === pagination.page - 3 && pagination.page > 3) ||
                        (pageNumber === pagination.page + 3 && pagination.page < pagination.pages - 2)
                      ) {
                        return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                      }
                      return null;
                    })}
                    
                    <button 
                      className={`pagination-button ${pagination.page === pagination.pages ? 'disabled' : ''}`}
                      onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                      disabled={pagination.page === pagination.pages}
                    >
                      &rsaquo;
                    </button>
                    <button 
                      className={`pagination-button ${pagination.page === pagination.pages ? 'disabled' : ''}`}
                      onClick={() => setPagination({...pagination, page: pagination.pages})}
                      disabled={pagination.page === pagination.pages}
                    >
                      &raquo;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsList; 