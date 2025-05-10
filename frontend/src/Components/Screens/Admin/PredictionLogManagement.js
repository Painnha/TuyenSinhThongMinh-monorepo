import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Import các component con
import LogsList from '../../PredictionLogs/LogsList';
import Statistics from '../../PredictionLogs/Statistics';
import FeedbacksList from '../../PredictionLogs/FeedbacksList';
import LogDetailModal from '../../PredictionLogs/LogDetailModal';
import DeleteConfirmModal from '../../PredictionLogs/DeleteConfirmModal';

// CSS
import './PredictionLogManagement.css';

// Lấy API URL từ biến môi trường
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Component Tab tùy chỉnh
const CustomTab = ({ active, onClick, title }) => {
  return (
    <div 
      className={`custom-tab ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {title}
    </div>
  );
};

const PredictionLogManagement = () => {
  // State cho danh sách logs
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State cho phân trang
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // State cho lọc và sắp xếp
  const [filters, setFilters] = useState({
    userId: '',
    modelType: '',
    startDate: '',
    endDate: '',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
  
  // State cho modal chi tiết
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  
  // State cho tab thống kê
  const [activeTab, setActiveTab] = useState('logsList');
  const [statistics, setStatistics] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  
  // State cho phản hồi
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [feedbacksPagination, setFeedbacksPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [feedbackFilters, setFeedbackFilters] = useState({
    isUseful: '',
    startDate: '',
    endDate: ''
  });
  
  // State cho xóa log
  const [selectedLogIds, setSelectedLogIds] = useState([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  
  // Fetch logs khi component mount hoặc khi filters/pagination thay đổi
  useEffect(() => {
    fetchLogs();
  }, [pagination.page, pagination.limit, filters]);
  
  // Fetch thống kê khi tab thống kê được chọn
  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchStatistics();
    } else if (activeTab === 'feedbacks') {
      fetchFeedbacks();
    }
  }, [activeTab, feedbackFilters, feedbacksPagination.page]);
  
  // Fetch danh sách logs
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { userId, modelType, startDate, endDate, sortBy, sortOrder } = filters;
      const { page, limit } = pagination;
      
      const response = await axios.get(`${API_URL}/api/admin/prediction-logs`, {
        params: {
          userId,
          modelType,
          startDate,
          endDate,
          page,
          limit,
          sortBy,
          sortOrder
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setLogs(response.data.data.logs);
      setPagination({
        ...pagination,
        total: response.data.data.pagination.total,
        pages: response.data.data.pagination.pages
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải dữ liệu');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch chi tiết log
  const fetchLogDetail = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/prediction-logs/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSelectedLog(response.data.data);
      setShowDetailModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải chi tiết log');
      console.error('Error fetching log detail:', err);
    }
  };
  
  // Fetch thống kê
  const fetchStatistics = async () => {
    setStatisticsLoading(true);
    setError(null);
    
    try {
      const { startDate, endDate } = filters;
      
      const response = await axios.get(`${API_URL}/api/admin/prediction-logs/statistics/summary`, {
        params: {
          startDate,
          endDate
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Log dữ liệu thống kê để debug
      console.log('Dữ liệu thống kê nhận được:', response.data.data);
      
      setStatistics(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải thống kê');
      console.error('Error fetching statistics:', err);
    } finally {
      setStatisticsLoading(false);
    }
  };
  
  // Fetch danh sách phản hồi
  const fetchFeedbacks = async () => {
    setFeedbacksLoading(true);
    
    try {
      const { isUseful, startDate, endDate } = feedbackFilters;
      const { page, limit } = feedbacksPagination;
      
      const response = await axios.get(`${API_URL}/api/admin/prediction-logs/feedback/list`, {
        params: {
          isUseful,
          startDate,
          endDate,
          page,
          limit
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setFeedbacks(response.data.data.feedbacks);
      setFeedbacksPagination({
        ...feedbacksPagination,
        total: response.data.data.pagination.total,
        pages: response.data.data.pagination.pages
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải phản hồi');
      console.error('Error fetching feedbacks:', err);
    } finally {
      setFeedbacksLoading(false);
    }
  };
  
  // Xóa log
  const deleteSelectedLogs = async () => {
    try {
      if (selectedLogIds.length === 1) {
        await axios.delete(`${API_URL}/api/admin/prediction-logs/${selectedLogIds[0]}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      } else {
        await axios.delete(`${API_URL}/api/admin/prediction-logs`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          data: { ids: selectedLogIds }
        });
      }
      
      setShowDeleteConfirmModal(false);
      setSelectedLogIds([]);
      fetchLogs();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi xóa log');
      console.error('Error deleting logs:', err);
    }
  };
  
  return (
    <div className="custom-container prediction-log-management">
      <h1 className="page-title">Quản lý Log Dự Đoán</h1>
      
      <div className="custom-tabs-container">
        <div className="custom-tabs">
          <CustomTab 
            active={activeTab === 'logsList'} 
            onClick={() => setActiveTab('logsList')}
            title={
              <div>
                📋 <span>Danh sách Log</span>
              </div>
            }
          />
          <CustomTab 
            active={activeTab === 'statistics'} 
            onClick={() => setActiveTab('statistics')}
            title={
              <div>
                📊 <span>Thống kê</span>
              </div>
            }
          />

        </div>

        <div className="tab-content">
          {activeTab === 'logsList' && (
            <LogsList 
              logs={logs}
              loading={loading}
              error={error}
              pagination={pagination}
              setPagination={setPagination}
              filters={filters}
              setFilters={setFilters}
              selectedLogIds={selectedLogIds}
              setSelectedLogIds={setSelectedLogIds}
              fetchLogs={fetchLogs}
              fetchLogDetail={fetchLogDetail}
              setShowDeleteConfirmModal={setShowDeleteConfirmModal}
            />
          )}
          
          {activeTab === 'statistics' && (
            <Statistics 
              statistics={statistics} 
              statisticsLoading={statisticsLoading} 
            />
          )}
          
          {activeTab === 'feedbacks' && (
            <FeedbacksList 
              feedbacks={feedbacks}
              feedbacksLoading={feedbacksLoading}
              feedbacksPagination={feedbacksPagination}
              setFeedbacksPagination={setFeedbacksPagination}
              feedbackFilters={feedbackFilters}
              setFeedbackFilters={setFeedbackFilters}
              fetchFeedbacks={fetchFeedbacks}
              fetchLogDetail={fetchLogDetail}
              error={error}
            />
          )}
        </div>
      </div>
      
      {/* Modal chi tiết log */}
      {showDetailModal && selectedLog && (
        <LogDetailModal 
          logId={selectedLog?._id}
          onClose={() => setShowDetailModal(false)}
          isUserLog={false}
        />
      )}
      
      {/* Modal xác nhận xóa */}
      <DeleteConfirmModal 
        showDeleteConfirmModal={showDeleteConfirmModal}
        setShowDeleteConfirmModal={setShowDeleteConfirmModal}
        selectedLogIds={selectedLogIds}
        deleteSelectedLogs={deleteSelectedLogs}
      />
    </div>
  );
};

export default PredictionLogManagement; 