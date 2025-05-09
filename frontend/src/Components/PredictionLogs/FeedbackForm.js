import React, { useState } from 'react';
import { aiService } from '../../services/api/aiService';
import './FeedbackForm.css';

/**
 * Component hiển thị form gửi feedback cho kết quả dự đoán
 * @param {Object} props
 * @param {string} props.predictionId - ID của bản ghi dự đoán
 * @param {string} props.modelType - Loại mô hình ('major_recommendation' hoặc 'admission_prediction')
 * @param {Function} props.onFeedbackSubmitted - Callback khi feedback được gửi
 */
const FeedbackForm = ({ predictionId, modelType, onFeedbackSubmitted }) => {
  const [feedback, setFeedback] = useState('');
  const [isUseful, setIsUseful] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // Hàm gửi feedback
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isUseful === null) {
      setError('Vui lòng chọn đánh giá của bạn về kết quả dự đoán.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Xác định API endpoint dựa vào loại mô hình
      const endpointPath = modelType === 'admission_prediction' 
        ? 'data/admission/feedback' 
        : 'recommendation/feedback';

      // Gọi API gửi feedback
      const response = await aiService.submitFeedback(endpointPath, {
        predictionId,
        isUseful,
        feedback
      });

      if (response && response.success) {
        setIsSubmitted(true);
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted(isUseful, feedback);
        }
      } else {
        throw new Error(response?.message || 'Không thể gửi phản hồi.');
      }
    } catch (err) {
      console.error('Lỗi khi gửi feedback:', err);
      setError(err.message || 'Đã xảy ra lỗi khi gửi phản hồi. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nếu không có predictionId, không hiển thị form
  if (!predictionId) {
    return null;
  }

  // Nếu đã gửi feedback thành công
  if (isSubmitted) {
    return (
      <div className="feedback-form submitted">
        <div className="feedback-success">
          <h3>Cảm ơn bạn đã gửi phản hồi!</h3>
          <p>Phản hồi của bạn giúp chúng tôi cải thiện hệ thống ngày càng thông minh hơn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-form">
      <h3 className="feedback-title">Đánh giá kết quả dự đoán</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="feedback-rating">
          <p>Kết quả dự đoán có hữu ích với bạn không?</p>
          
          <div className="rating-buttons">
            <button 
              type="button"
              className={`rating-button ${isUseful === true ? 'selected' : ''}`}
              onClick={() => setIsUseful(true)}
            >
              <span role="img" aria-label="Có">👍</span> Có, rất hữu ích
            </button>
            
            <button 
              type="button"
              className={`rating-button ${isUseful === false ? 'selected' : ''}`}
              onClick={() => setIsUseful(false)}
            >
              <span role="img" aria-label="Không">👎</span> Không, chưa chính xác
            </button>
          </div>
        </div>
        
        <div className="feedback-comment">
          <label htmlFor="feedback-text">Góp ý thêm (không bắt buộc):</label>
          <textarea
            id="feedback-text"
            rows="3"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Nhập góp ý của bạn để chúng tôi cải thiện hệ thống..."
          ></textarea>
        </div>
        
        {error && (
          <div className="feedback-error">
            {error}
          </div>
        )}
        
        <div className="feedback-submit">
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang gửi..." : "Gửi phản hồi"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm; 