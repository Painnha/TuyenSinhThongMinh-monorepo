import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLogsList from '../../PredictionLogs/UserLogsList';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  useEffect(() => {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userStr || !token) {
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  if (!user) {
    return null;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'logs':
        return <UserLogsList />;
      case 'profile':
      default:
        return (
          <div className="profile-card">
            <div className="profile-info">
              <div className="info-group">
                <span className="info-label">Họ và tên</span>
                <div className="info-value">{user.userName}</div>
              </div>

              <div className="info-group">
                <span className="info-label">Số điện thoại</span>
                <div className="info-value">{user.phone}</div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">Thông tin cá nhân</h1>
        <p className="profile-subtitle">Xem và quản lý thông tin cá nhân của bạn</p>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Thông tin cá nhân
        </button>
        <button 
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Lịch sử dự đoán
        </button>
      </div>

      {renderTabContent()}
    </div>
  );
};

export default Profile; 