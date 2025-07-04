import React, { useState } from 'react';
import UserManagement from './UserManagement';
import AdminHeader from '../../layout/AdminHeader';
import BenchmarkScoreManagement from './BenchmarkScoreManagement';
import UniversityManagement from './UniversityManagement';
import PredictionLogManagement from './PredictionLogManagement';

// Đơn giản hóa component để tránh lỗi hooks
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'universities':
        return <UniversityManagement />;
      case 'benchmark':
        return <BenchmarkScoreManagement />;
      case 'predictionLogs':
        return <PredictionLogManagement />;
      case 'statistics':
        return (
          <div>
            <h3>Thống kê</h3>
            <p>Chức năng đang được phát triển...</p>
          </div>
        );
      case 'settings':
        return (
          <div>
            <h3>Cài đặt hệ thống</h3>
            <p>Chức năng đang được phát triển...</p>
          </div>
        );
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="admin-dashboard">
      <AdminHeader />
      <div style={{ padding: '20px', marginTop: '80px' }}>

        
        <div className="admin-container" style={{ display: 'flex' }}>
          <div className="admin-sidebar" style={{ width: '250px', marginRight: '20px' }}>
            <div className="admin-nav">
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '10px' }}>
                  <button 
                    onClick={() => setActiveTab('users')}
                    style={{ 
                      padding: '10px', 
                      width: '100%', 
                      textAlign: 'left',
                      backgroundColor: activeTab === 'users' ? '#007bff' : '#f8f9fa',
                      color: activeTab === 'users' ? 'white' : 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Quản lý tài khoản
                  </button>
                </li>
                <li style={{ marginBottom: '10px' }}>
                  <button 
                    onClick={() => setActiveTab('universities')}
                    style={{ 
                      padding: '10px', 
                      width: '100%', 
                      textAlign: 'left',
                      backgroundColor: activeTab === 'universities' ? '#007bff' : '#f8f9fa',
                      color: activeTab === 'universities' ? 'white' : 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Quản lý trường đại học
                  </button>
                </li>
                <li style={{ marginBottom: '10px' }}>
                  <button 
                    onClick={() => setActiveTab('benchmark')}
                    style={{ 
                      padding: '10px', 
                      width: '100%', 
                      textAlign: 'left',
                      backgroundColor: activeTab === 'benchmark' ? '#007bff' : '#f8f9fa',
                      color: activeTab === 'benchmark' ? 'white' : 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Quản lý điểm chuẩn
                  </button>
                </li>
                <li style={{ marginBottom: '10px' }}>
                  <button 
                    onClick={() => setActiveTab('predictionLogs')}
                    style={{ 
                      padding: '10px', 
                      width: '100%', 
                      textAlign: 'left',
                      backgroundColor: activeTab === 'predictionLogs' ? '#007bff' : '#f8f9fa',
                      color: activeTab === 'predictionLogs' ? 'white' : 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Quản lý logs dự đoán
                  </button>
                </li>
                <li style={{ marginBottom: '10px' }}>
                  <button 
                    onClick={() => setActiveTab('statistics')}
                    style={{ 
                      padding: '10px', 
                      width: '100%', 
                      textAlign: 'left',
                      backgroundColor: activeTab === 'statistics' ? '#007bff' : '#f8f9fa',
                      color: activeTab === 'statistics' ? 'white' : 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Thống kê
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('settings')}
                    style={{ 
                      padding: '10px', 
                      width: '100%', 
                      textAlign: 'left',
                      backgroundColor: activeTab === 'settings' ? '#007bff' : '#f8f9fa',
                      color: activeTab === 'settings' ? 'white' : 'black',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cài đặt hệ thống
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="admin-content" style={{ flex: 1 }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 