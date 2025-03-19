import React, { useState } from 'react';
import axios from 'axios';
import './GenerateData.css';

const GenerateData = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleGenerateData = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      const response = await axios.post('/api/admin/generate-data');
      setMessage('Tạo dữ liệu giả định thành công!');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo dữ liệu giả định');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generate-data-container">
      <h2>Tạo dữ liệu giả định</h2>
      <div className="generate-data-description">
        <p>
          Chức năng này sẽ tạo ra dữ liệu giả định để huấn luyện mô hình gợi ý ngành học.
          Dữ liệu được tạo sẽ bao gồm:
        </p>
        <ul>
          <li>Điểm số các môn học theo phân phối thực tế</li>
          <li>Thông tin ưu tiên khu vực và đối tượng</li>
          <li>Sở thích và tổ hợp môn thi mong muốn</li>
          <li>Kết quả gợi ý ngành học</li>
        </ul>
      </div>

      <div className="generate-data-form">
        <button 
          className="generate-button"
          onClick={handleGenerateData}
          disabled={loading}
        >
          {loading ? 'Đang tạo dữ liệu...' : 'Tạo dữ liệu giả định'}
        </button>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default GenerateData; 