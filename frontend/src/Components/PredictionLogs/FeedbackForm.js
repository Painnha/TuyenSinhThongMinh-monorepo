import React, { useState } from 'react';
import './FeedbackForm.css';
import { updateLogFeedback } from '../../services/predictionLogService';

/**
 * Component hiển thị form gửi feedback cho kết quả dự đoán
 * @param {Object} props
 * @param {string} props.logId - ID của bản ghi dự đoán
 * @param {string} props.predictionId - ID của bản ghi dự đoán (tương đương với logId)
 * @param {Object} props.initialData - Dữ liệu ban đầu của form
 * @param {Function} props.onClose - Callback khi đóng form
 * @param {Function} props.onSubmitted - Callback khi feedback được gửi
 * @param {boolean} props.standalone - Nếu true, sẽ hiển thị dạng modal độc lập
 */
const FeedbackForm = ({ logId, predictionId, initialData = {}, onClose, onSubmitted, standalone = true }) => {
  const actualLogId = logId || predictionId;
  
  const [formData, setFormData] = useState({
    isUseful: initialData.isUseful !== undefined ? initialData.isUseful : null,
    feedback: initialData.feedback || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === 'true',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.isUseful === null) {
      setError('Vui lòng chọn đánh giá của bạn');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await updateLogFeedback(actualLogId, formData);
      
      if (response.status === 200) {
        alert('Đã cập nhật đánh giá thành công');
        if (onSubmitted) onSubmitted(response.data);
        onClose();
      } else {
        setError(response.message || 'Đã xảy ra lỗi khi cập nhật đánh giá');
      }
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi khi cập nhật đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    return (
      <>
        <div className="feedback-modal-header">
          <h2>{initialData.isUseful !== undefined ? 'Cập nhật đánh giá' : 'Thêm đánh giá mới'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="feedback-modal-body">
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Dự đoán này có hữu ích với bạn không?</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isUseful"
                    value="true"
                    checked={formData.isUseful === true}
                    onChange={handleRadioChange}
                  />
                  <span>Có, dự đoán này hữu ích</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isUseful"
                    value="false"
                    checked={formData.isUseful === false}
                    onChange={handleRadioChange}
                  />
                  <span>Không, dự đoán này không hữu ích</span>
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Nhận xét chi tiết (không bắt buộc):</label>
              <textarea
                name="feedback"
                value={formData.feedback}
                onChange={handleInputChange}
                rows={5}
                placeholder="Chia sẻ thêm nhận xét của bạn..."
              />
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="loading-spinner" />
                    Đang gửi...
                  </>
                ) : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        </div>
      </>
    );
  };

  // Nếu standalone = true, hiển thị dạng modal độc lập
  if (standalone) {
    return (
      <div className="feedback-modal-overlay">
        <div className="feedback-modal">
          {renderContent()}
        </div>
      </div>
    );
  }

  // Nếu không, chỉ render nội dung form
  return renderContent();
};

export default FeedbackForm; 