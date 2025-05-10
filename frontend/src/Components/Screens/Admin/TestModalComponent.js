import React, { useState } from 'react';
import './BenchmarkScoreManagement.css';

const TestModalComponent = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    console.log('Showing modal');
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    console.log('Closing modal');
    setIsModalVisible(false);
  };

  return (
    <div className="benchmark-score-management">
      <div className="card">
        <div className="card-header">
          <h2>Test Modal Component</h2>
          <button className="btn-primary" onClick={showModal}>
            Mở Modal
          </button>
        </div>

        <div>
          <p>Đây là component thử nghiệm để kiểm tra xem vấn đề modal có phải là do React hay trong component chính.</p>
          <p>Trạng thái modal hiện tại: {isModalVisible ? 'Đang mở' : 'Đóng'}</p>
        </div>
      </div>

      {isModalVisible && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Modal thử nghiệm</h3>
              <button className="close-btn" onClick={handleCancel}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Nội dung modal thử nghiệm</p>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={handleCancel}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestModalComponent; 