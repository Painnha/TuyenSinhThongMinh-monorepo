import React, { useState, useEffect } from 'react';
import './LogDetailModal.css';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getUserLogDetail, getLogDetail } from '../../services/predictionLogService';

const LogDetailModal = ({ logId, onClose, isUserLog = false }) => {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch log details when component mounts
  useEffect(() => {
    if (logId) {
      fetchLogDetail();
    } else {
      setLoading(false);
      setError('Không tìm thấy ID log hợp lệ');
    }
  }, [logId]);

  const fetchLogDetail = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra logId hợp lệ
      if (!logId) {
        setError('ID log không hợp lệ');
        setLoading(false);
        return;
      }
      
      // Use the appropriate API based on whether it's a user log or admin view
      let response;
      if (isUserLog) {
        response = await getUserLogDetail(logId);
      } else {
        response = await getLogDetail(logId);
      }

      if (response.success) {
        setLog(response.data);
      } else {
        setError('Không thể tải chi tiết log');
      }
    } catch (err) {
      console.error('Error fetching log details:', err);
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Render admission prediction inputs
  const renderAdmissionInputs = (inputs) => {
    if (!inputs) return <p>Không có dữ liệu đầu vào</p>;

    return (
      <div className="detail-section">
        <h3>Dữ liệu đầu vào</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Trường đại học:</span>
            <span className="detail-value">{inputs.universityCode || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Ngành học:</span>
            <span className="detail-value">{inputs.majorName || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Tổ hợp môn:</span>
            <span className="detail-value">{inputs.combination || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Điểm ưu tiên:</span>
            <span className="detail-value">{inputs.priorityScore?.toFixed(1) || '0.0'}</span>
          </div>
          
          {inputs.scores && (
            <div className="detail-item wide">
              <span className="detail-label">Điểm các môn:</span>
              <div className="scores-container">
                {Object.entries(inputs.scores).map(([subject, score], idx) => (
                  <div key={idx} className="score-item">
                    <span className="score-subject">{subject}:</span>
                    <span className="score-value">{score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render major recommendation inputs
  const renderRecommendationInputs = (inputs) => {
    if (!inputs) return <p>Không có dữ liệu đầu vào</p>;

    return (
      <div className="detail-section">
        <h3>Dữ liệu đầu vào</h3>
        <div className="detail-grid">
          {inputs.interests && (
            <div className="detail-item wide">
              <span className="detail-label">Sở thích:</span>
              <div className="tags-container">
                {inputs.interests.map((interest, idx) => (
                  <span key={idx} className="tag-item">{interest}</span>
                ))}
              </div>
            </div>
          )}
          
          {inputs.subject_groups && (
            <div className="detail-item wide">
              <span className="detail-label">Tổ hợp môn:</span>
              <div className="tags-container">
                {inputs.subject_groups.map((group, idx) => (
                  <span key={idx} className="tag-item">{group}</span>
                ))}
              </div>
            </div>
          )}

          {inputs.scores && (
            <div className="detail-item wide">
              <span className="detail-label">Điểm các môn:</span>
              <div className="scores-container">
                {Object.entries(inputs.scores).map(([subject, score], idx) => (
                  <div key={idx} className="score-item">
                    <span className="score-subject">{subject}:</span>
                    <span className="score-value">{score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render admission prediction outputs
  const renderAdmissionOutputs = (outputs) => {
    if (!outputs) return <p>Không có dữ liệu đầu ra</p>;

    return (
      <div className="detail-section">
        <h3>Kết quả dự đoán</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Trường:</span>
            <span className="detail-value">{outputs.universityName || outputs.universityCode || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Ngành học:</span>
            <span className="detail-value">{outputs.majorName || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Tổ hợp môn:</span>
            <span className="detail-value">{outputs.selectedCombination || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Xác suất trúng tuyển:</span>
            <span className="detail-value probability">
              {(outputs.admissionProbability * 100).toFixed(2)}%
              <div className="probability-bar">
                <div 
                  className="probability-fill" 
                  style={{ width: `${outputs.admissionProbability * 100}%` }}
                ></div>
              </div>
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Tổng điểm của bạn:</span>
            <span className="detail-value">{outputs.totalScore?.toFixed(2) || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Điểm chuẩn dự kiến:</span>
            <span className="detail-value">{outputs.expectedScore?.toFixed(2) || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Chênh lệch điểm:</span>
            <span className="detail-value score-diff">
              {outputs.scoreDiff > 0 ? 
                <span className="positive">+{outputs.scoreDiff.toFixed(2)}</span> : 
                <span className="negative">{outputs.scoreDiff.toFixed(2)}</span>}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Điểm trung bình lịch sử:</span>
            <span className="detail-value">{outputs.averageHistoricalScore?.toFixed(2) || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Xu hướng điểm:</span>
            <span className="detail-value">
              {outputs.scoreTrend > 0 ? 
                <span className="positive">+{outputs.scoreTrend.toFixed(2)}</span> : 
                <span className="negative">{outputs.scoreTrend.toFixed(2)}</span>}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Chỉ tiêu:</span>
            <span className="detail-value">{outputs.quota || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Xu hướng thị trường:</span>
            <span className="detail-value">
              {outputs.marketTrend > 0 ? 
                <span className="positive">+{outputs.marketTrend.toFixed(2)}</span> : 
                outputs.marketTrend < 0 ?
                <span className="negative">{outputs.marketTrend.toFixed(2)}</span> :
                <span>0.00</span>}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Mức độ cạnh tranh:</span>
            <span className="detail-value">{outputs.entryLevel || '---'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Đánh giá:</span>
            <span className="detail-value status-text">{outputs.assessment || '---'}</span>
          </div>
          
          {outputs.historicalScores && outputs.historicalScores.length > 0 && (
            <div className="detail-item wide">
              <span className="detail-label">Điểm chuẩn qua các năm:</span>
              <div className="historical-data">
                {outputs.historicalScores.map((item, idx) => (
                  <div key={idx} className="history-item">
                    <span className="history-year">Năm {item[0]}:</span>
                    <span className="history-value">{item[1].toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render major recommendation outputs
  const renderRecommendationOutputs = (outputs) => {
    if (!outputs || !Array.isArray(outputs) || outputs.length === 0) {
      return <p>Không có dữ liệu đầu ra</p>;
    }

    return (
      <div className="detail-section">
        <h3>Kết quả gợi ý ngành học</h3>
        
        <div className="recommendations-list">
          {outputs.map((recommendation, idx) => (
            <div key={idx} className="recommendation-item">
              <div className="recommendation-header">
                <span className="recommendation-rank">{idx + 1}</span>
                <h4 className="recommendation-name">{recommendation.major_name}</h4>
                <span className="recommendation-score">
                  Độ phù hợp: {(recommendation.confidence * 100).toFixed(2)}%
                </span>
              </div>
              
              <div className="recommendation-details">
                <div className="recommendation-category">
                  <span className="detail-label">Nhóm ngành:</span>
                  <span>{recommendation.category || '---'}</span>
                </div>
                
                {recommendation.description && (
                  <div className="recommendation-description">
                    <span className="detail-label">Mô tả:</span>
                    <span>{recommendation.description}</span>
                  </div>
                )}
                
                {recommendation.matching_interests && recommendation.matching_interests.length > 0 && (
                  <div className="recommendation-interests">
                    <span className="detail-label">Sở thích phù hợp:</span>
                    <div className="tags-container">
                      {recommendation.matching_interests.map((interest, i) => (
                        <span key={i} className="tag-item">{interest}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="recommendation-confidence">
                  <span className="detail-label">Độ phù hợp:</span>
                  <div className="match-bar">
                    <div 
                      className="match-fill" 
                      style={{ width: `${recommendation.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {recommendation.suitable_universities && recommendation.suitable_universities.length > 0 && (
                  <div className="suitable-universities">
                    <span className="detail-label">Các trường đại học phù hợp:</span>
                    <div className="universities-list">
                      {recommendation.suitable_universities.map((uni, i) => (
                        <div key={i} className="university-item">
                          <div className="university-name">{uni.university_name}</div>
                          <div className="university-details">
                            <span>Điểm chuẩn: <strong>{uni.benchmark_score.toFixed(2)}</strong></span>
                            <span>Tổ hợp: <strong>{uni.combination}</strong></span>
                            <span>Chênh lệch: <strong className={uni.score_difference > 0 ? 'positive' : 'negative'}>
                              {uni.score_difference > 0 ? `+${uni.score_difference.toFixed(2)}` : uni.score_difference.toFixed(2)}
                            </strong></span>
                            <span>Đánh giá: <strong className={`safety-${uni.safety_level === 'An toàn' ? 'safe' : 'risky'}`}>
                              {uni.safety_level}
                            </strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render feedback section
  const renderFeedback = (log) => {
    if (!log) return null;
    
    return (
      <div className="detail-section feedback-section">
        <h3>Đánh giá người dùng</h3>
        
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Hữu ích:</span>
            <span className="detail-value">
              {log.isUseful === true && <span className="feedback-useful">Có</span>}
              {log.isUseful === false && <span className="feedback-not-useful">Không</span>}
              {log.isUseful === null && <span className="feedback-none">Chưa đánh giá</span>}
            </span>
          </div>
          
          {log.feedbackDate && (
            <div className="detail-item">
              <span className="detail-label">Thời điểm đánh giá:</span>
              <span className="detail-value">
                {format(new Date(log.feedbackDate), 'dd/MM/yyyy HH:mm', { locale: vi })}
              </span>
            </div>
          )}
          
          {log.feedback && (
            <div className="detail-item wide">
              <span className="detail-label">Nhận xét:</span>
              <div className="feedback-text">{log.feedback}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="log-detail-overlay">
      <div className="log-detail-modal">
        <div className="modal-header">
          <h2>Chi tiết log dự đoán</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div className="loading">Đang tải dữ liệu...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : log ? (
            <>
              <div className="detail-section">
                <h3>Thông tin chung</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">ID:</span>
                    <span className="detail-value">{log._id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Người dùng:</span>
                    <span className="detail-value">{log.userId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Thời gian:</span>
                    <span className="detail-value">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Loại dự đoán:</span>
                    <span className="detail-value">
                      {log.modelType === 'admission_prediction' ? 'Dự đoán trúng tuyển' : 
                      log.modelType === 'major_recommendation' ? 'Gợi ý ngành học' : 
                      log.modelType}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Hiển thị inputs dựa vào loại dự đoán */}
              {log.modelType === 'admission_prediction' ? 
                renderAdmissionInputs(log.inputs) : 
                renderRecommendationInputs(log.inputs)}
              
              {/* Hiển thị outputs dựa vào loại dự đoán */}
              {log.modelType === 'admission_prediction' ? 
                renderAdmissionOutputs(log.outputs) : 
                renderRecommendationOutputs(log.outputs)}
              
              {/* Hiển thị feedback nếu có */}
              {renderFeedback(log)}
            </>
          ) : (
            <div>Không tìm thấy dữ liệu</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogDetailModal; 