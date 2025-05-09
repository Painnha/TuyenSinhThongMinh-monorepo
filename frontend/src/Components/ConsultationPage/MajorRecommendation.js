import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/api/aiService';
import './MajorRecommendation.css'; // Thêm một file CSS riêng cho component này
import FeedbackForm from '../PredictionLogs/FeedbackForm';

const SUBJECTS = [
  { id: 'Toan', name: 'Toán' },
  { id: 'NguVan', name: 'Ngữ Văn' },
  { id: 'VatLy', name: 'Vật Lý' },
  { id: 'HoaHoc', name: 'Hóa Học' },
  { id: 'SinhHoc', name: 'Sinh Học' },
  { id: 'LichSu', name: 'Lịch Sử' },
  { id: 'DiaLy', name: 'Địa Lý' },
  { id: 'GDCD', name: 'GDCD' },
  { id: 'NgoaiNgu', name: 'Ngoại Ngữ' }
];

// Component chip tùy chỉnh
const CustomChip = ({ label, onDelete, ...rest }) => {
  return (
    <span className="custom-chip" {...rest}>
      {label}
      {onDelete && (
        <button className="chip-delete" onClick={onDelete}>×</button>
      )}
    </span>
  );
};

// Component select tùy chỉnh với checkbox
const CustomSelect = ({ label, options, value, onChange, multiple = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleToggle = () => setIsOpen(!isOpen);
  
  const handleChange = (optionValue) => {
    if (multiple) {
      const newValue = value.includes(optionValue)
        ? value.filter(v => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };
  
  return (
    <div className="custom-select-container">
      <label className="custom-select-label">{label}</label>
      <div className="custom-select" onClick={handleToggle}>
        <div className="custom-select-value">
          {multiple ? 
            (value.length > 0 ? 
              <div className="chips-container">
                {value.map(v => (
                  <CustomChip 
                    key={v} 
                    label={options.find(opt => opt.value === v)?.label || v} 
                    onDelete={() => handleChange(v)}
                  />
                ))}
              </div> 
            : 'Chọn...') 
          : (options.find(opt => opt.value === value)?.label || 'Chọn...')}
        </div>
        <span className="custom-select-arrow">▼</span>
      </div>
      
      {isOpen && (
        <div className="custom-select-options">
          {options.map(option => (
            <div 
              key={option.value}
              className={`custom-select-option ${
                multiple 
                  ? value.includes(option.value) ? 'selected' : '' 
                  : value === option.value ? 'selected' : ''
              }`}
              onClick={() => handleChange(option.value)}
            >
              {multiple && (
                <input 
                  type="checkbox" 
                  checked={value.includes(option.value)} 
                  readOnly 
                />
              )}
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MajorRecommendation = ({ initialRecommendations, studentScores }) => {
  const [formData, setFormData] = useState({
    scores: studentScores || {},
    interests: [],
    subject_groups: [],
    tohopthi: 'TN',
    priority: {
      area: 'KV3',
      subject: '00'
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(initialRecommendations || null);
  const [error, setError] = useState(null);
  const [interests, setInterests] = useState([]);
  const [subjectCombinations, setSubjectCombinations] = useState([]);
  
  // Thêm state cho việc hiển thị xác suất trúng tuyển
  const [admissionPrediction, setAdmissionPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [predictionId, setPredictionId] = useState(null);
  const [admissionPredictionId, setAdmissionPredictionId] = useState(null);
  
  // Cập nhật khi nhận initialRecommendations mới
  useEffect(() => {
    if (initialRecommendations) {
      setRecommendations(initialRecommendations);
    }
  }, [initialRecommendations]);
  
  useEffect(() => {
    // Lấy danh sách sở thích
    aiService.getInterests()
      .then((data) => {
        if (data && data.success && data.data) {
          setInterests(data.data);
        }
      })
      .catch((err) => {
        console.error('Error fetching interests:', err);
      });
    
    // Lấy danh sách tổ hợp môn
    aiService.getSubjectCombinations()
      .then((data) => {
        if (data && data.success && data.data) {
          setSubjectCombinations(data.data);
        }
      })
      .catch((err) => {
        console.error('Error fetching subject combinations:', err);
      });
  }, []);
  
  // Cập nhật formData khi studentScores thay đổi
  useEffect(() => {
    if (studentScores) {
      setFormData(prev => ({
        ...prev,
        scores: studentScores
      }));
    }
  }, [studentScores]);
  
  const handleScoreChange = (subjectId, value) => {
    setFormData({
      ...formData,
      scores: {
        ...formData.scores,
        [subjectId]: parseFloat(value) || 0
      }
    });
  };
  
  const handleInterestChange = (values) => {
    setFormData({
      ...formData,
      interests: values.slice(0, 3) // Giới hạn tối đa 3 sở thích
    });
  };
  
  const handleSubjectGroupChange = (values) => {
    setFormData({
      ...formData,
      subject_groups: values.slice(0, 2) // Giới hạn tối đa 2 tổ hợp môn
    });
  };
  
  const handleToHopThiChange = (value) => {
    setFormData({
      ...formData,
      tohopthi: value
    });
  };
  
  const handleAreaPriorityChange = (value) => {
    setFormData({
      ...formData,
      priority: {
        ...formData.priority,
        area: value
      }
    });
  };
  
  const handleSubjectPriorityChange = (value) => {
    setFormData({
      ...formData,
      priority: {
        ...formData.priority,
        subject: value
      }
    });
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      console.log("Gửi dữ liệu:", formData);
      
      // Chuẩn bị dữ liệu gửi đi
      const requestData = {
        ...formData,
        // Thêm userId từ localStorage nếu đã đăng nhập
        userId: localStorage.getItem('userId') || null,
        // Chuyển đổi điểm từ chuỗi sang số
        scores: Object.entries(formData.scores).reduce((acc, [key, value]) => {
          acc[key] = parseFloat(value) || 0;
          return acc;
        }, {})
      };
      
      console.log("Đang gọi API với dữ liệu:", requestData);
      
      const response = await aiService.recommendMajors(requestData);
      console.log("Kết quả từ API:", response);
      
      if (response && response.recommendations) {
        console.log("Đã nhận được recommendations:", response.recommendations);
        setRecommendations(response.recommendations);
        
        // Lưu ID bản ghi prediction để sử dụng cho feedback
        if (response._id) {
          console.log("Setting predictionId:", response._id);
          setPredictionId(response._id);
          // Reset admission prediction ID khi có kết quả gợi ý ngành học mới
          setAdmissionPredictionId(null);
          setAdmissionPrediction(null);
        } else {
          console.warn("Không có _id trong response:", response);
        }
      } else {
        console.error("Định dạng phản hồi không hợp lệ:", response);
        throw new Error('Định dạng phản hồi không hợp lệ. Không có dữ liệu recommendations.');
      }
    } catch (err) {
      console.error('Lỗi khi gửi form:', err);
      setError(`Có lỗi xảy ra khi gợi ý ngành học: ${err.message || 'Vui lòng thử lại sau.'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Hàm xử lý khi click vào button xem xác suất
  const handlePredictAdmission = async (university, majorName) => {
    setPredictionLoading(true);
    setPredictionError(null);
    setSelectedUniversity(university);
    
    try {
      // Trích xuất mã trường từ tên trường (mã nằm trước dấu "-")
      const universityNameParts = university.university_name.split('-');
      const universityCode = universityNameParts[0].trim();
      
      // Lấy tổ hợp môn
      const combination = university.combination || '';
      
      // In chi tiết thông tin điểm học sinh được truyền vào (chỉ hiển thị trong console)
      console.log("===== KIỂM TRA ĐIỂM HỌC SINH =====");
      console.log("studentScores prop:", studentScores); 
      console.log("formData.scores:", formData.scores);
      console.log("Keys trong studentScores:", studentScores ? Object.keys(studentScores) : "null");
      console.log("Giá trị Toán:", studentScores?.Toan);
      console.log("Giá trị Văn:", studentScores?.NguVan);
      console.log("Giá trị Ngoại ngữ:", studentScores?.NgoaiNgu);
      
      // Tạo điểm các môn theo tổ hợp - sử dụng điểm gốc từ studentScores
      const scores = {};
      
      // Mapping từ tên field tiếng Việt sang tiếng Anh cho API
      const subjectMapping = {
        'Toan': 'TOAN',
        'NguVan': 'VAN',
        'VatLy': 'LY',
        'HoaHoc': 'HOA',
        'SinhHoc': 'SINH',
        'LichSu': 'SU',
        'DiaLy': 'DIA',
        'GDCD': 'GDCD',
        'NgoaiNgu': 'ANH'
      };
      
      // Ánh xạ tên tổ hợp môn sang danh sách các môn học
      const combinationMap = {
        'A00': ['TOAN', 'LY', 'HOA'],
        'A01': ['TOAN', 'LY', 'ANH'],
        'B00': ['TOAN', 'HOA', 'SINH'],
        'C00': ['VAN', 'SU', 'DIA'],
        'D01': ['TOAN', 'VAN', 'ANH']
      };
      
      // Lấy điểm từ điểm gốc của học sinh
      if (combination && combinationMap[combination] && studentScores) {
        const subjectsInCombination = combinationMap[combination];
        
        // Chuyển đổi điểm từ tiếng Việt sang tiếng Anh
        for (const [viKey, enKey] of Object.entries(subjectMapping)) {
          // Chỉ lấy điểm của môn nằm trong tổ hợp
          if (subjectsInCombination.includes(enKey)) {
            // Sử dụng trực tiếp từ studentScores thay vì formData
            scores[enKey] = studentScores[viKey] !== undefined ? parseFloat(studentScores[viKey]) : 0;
          }
        }
        
        console.log("Chi tiết điểm theo tổ hợp:", combination);
        Object.entries(scores).forEach(([subject, score]) => {
          console.log(`  - ${subject}: ${score} (từ ${Object.entries(subjectMapping).find(([_, v]) => v === subject)?.[0]})`);
        });
      } else {
        console.warn("Không thể lấy điểm theo tổ hợp:", { 
          combination, 
          hasMap: !!combinationMap[combination], 
          hasScores: !!studentScores 
        });
      }
      
      // Tạo điểm các môn theo tổ hợp - sử dụng điểm gốc từ studentScores
      const calculatedStudentScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
      
      // Dữ liệu gửi đi theo đúng format API backend yêu cầu (universityCode, majorName, scores)
      const predictionData = {
        universityCode: universityCode,
        majorName: majorName.toLowerCase(),
        combination: combination,
        studentScore: calculatedStudentScore, // Sử dụng điểm đã tính
        scores: scores,
        // Thêm userId từ localStorage nếu đã đăng nhập
        userId: localStorage.getItem('userId') || null
      };
      
      // In chi tiết các thông số gửi đến API
      console.log('=====================================');
      console.log('THÔNG TIN THAM SỐ GỬI ĐẾN API DỰ ĐOÁN XÁC SUẤT:');
      console.log('-------------------------------------');
      console.log('Mã trường:', universityCode);
      console.log('Tên trường:', university.university_name);
      console.log('Tên ngành:', majorName);
      console.log('Tổ hợp môn:', combination);
      console.log('Điểm của học sinh:', calculatedStudentScore); // Log điểm đã tính
      console.log('Chi tiết điểm các môn:', JSON.stringify(scores, null, 2));
      console.log('Dữ liệu gửi đi:', JSON.stringify(predictionData, null, 2));
      console.log('=====================================');
      
      // Xóa phần hiển thị debug trên giao diện, chỉ giữ lại log trong console
      
      // Gọi API dự đoán
      const response = await aiService.predictAdmissionProbability(predictionData);
      
      console.log('Kết quả dự đoán xác suất:', response);
      
      if (response && response.success && response.prediction) {
        setAdmissionPrediction(response.prediction);
        // Lưu predictionId mới từ API dự đoán xác suất
        if (response._id) {
          setAdmissionPredictionId(response._id);
        }
      } else {
        throw new Error(response?.message || 'Không nhận được kết quả dự đoán hợp lệ');
      }
    } catch (err) {
      console.error('Lỗi khi dự đoán xác suất trúng tuyển:', err);
      setPredictionError(err.message || 'Có lỗi xảy ra khi dự đoán xác suất trúng tuyển');
    } finally {
      setPredictionLoading(false);
    }
  };
  
  // Hàm xử lý khi người dùng gửi feedback
  const handleFeedbackSubmitted = (isUseful, feedbackText) => {
    console.log('Feedback submitted:', isUseful, feedbackText);
    
    // Gửi feedback cho mô hình gợi ý ngành học
    if (predictionId) {
      console.log('Gửi feedback cho mô hình gợi ý ngành học với ID:', predictionId);
      aiService.submitFeedback('recommendation/feedback', {
        predictionId: predictionId,
        isUseful,
        feedback: feedbackText
      }).then(response => {
        console.log('Đã gửi feedback cho mô hình gợi ý ngành học:', response);
      }).catch(err => {
        console.error('Lỗi khi gửi feedback cho mô hình gợi ý ngành học:', err);
      });
    } else {
      console.warn('Không có predictionId cho mô hình gợi ý ngành học');
    }
    
    // Nếu người dùng đã xem xác suất trúng tuyển, lưu feedback cả cho mô hình xác suất
    if (admissionPredictionId) {
      console.log('Gửi feedback cho mô hình dự đoán xác suất với ID:', admissionPredictionId);
      aiService.submitFeedback('data/admission/feedback', {
        predictionId: admissionPredictionId,
        isUseful,
        feedback: feedbackText
      }).then(response => {
        console.log('Đã gửi feedback cho mô hình dự đoán xác suất:', response);
      }).catch(err => {
        console.error('Lỗi khi gửi feedback cho mô hình dự đoán xác suất:', err);
      });
    }
  };
  
  // Component hiển thị kết quả dự đoán xác suất
  const AdmissionPredictionResult = () => {
    if (predictionLoading) {
      return (
        <div className="prediction-loading">
          <p>Đang dự đoán xác suất trúng tuyển...</p>
        </div>
      );
    }
    
    if (predictionError) {
      return (
        <div className="prediction-error">
          <p>{predictionError}</p>
        </div>
      );
    }
    
    if (!admissionPrediction) {
      return null;
    }
    
    // Lấy thông tin từ kết quả dự đoán
    const { 
      universityName, 
      majorName, 
      admissionProbability, 
      assessment, 
      expectedScore,
      totalScore,
      scoreDiff
    } = admissionPrediction;
    
    // Xác định màu hiển thị dựa trên xác suất
    let probabilityClass = 'low-probability';
    if (admissionProbability >= 0.8) {
      probabilityClass = 'very-high-probability';
    } else if (admissionProbability >= 0.6) {
      probabilityClass = 'high-probability';
    } else if (admissionProbability >= 0.4) {
      probabilityClass = 'medium-probability';
    } else if (admissionProbability >= 0.2) {
      probabilityClass = 'somewhat-low-probability';
    }
    
    return (
      <div className="admission-prediction-result">
        <h3>Kết quả dự đoán xác suất trúng tuyển</h3>
        <div className="prediction-details">
          <p><strong>Trường:</strong> {universityName}</p>
          <p><strong>Ngành:</strong> {majorName}</p>
          <p><strong>Điểm của bạn:</strong> {totalScore}</p>
          <p><strong>Điểm chuẩn dự kiến:</strong> {expectedScore}</p>
          <p><strong>Chênh lệch điểm:</strong> <span className={scoreDiff >= 0 ? 'positive-diff' : 'negative-diff'}>{scoreDiff.toFixed(2)}</span></p>
          <p className={`probability ${probabilityClass}`}>
            <strong>Xác suất trúng tuyển:</strong> {(admissionProbability * 100).toFixed(1)}%
          </p>
          <p className="assessment"><strong>Đánh giá:</strong> {assessment}</p>
        </div>
      </div>
    );
  };

  // Nếu có recommendations ban đầu, hiển thị chúng
  if (recommendations) {
    return (
      <div className="major-recommendation">
        <h2 className="section-title">Kết quả gợi ý ngành học</h2>
        
        {/* Hiển thị kết quả dự đoán xác suất nếu có */}
        {predictionLoading && (
          <div className="prediction-loading">
            <p>Đang dự đoán xác suất trúng tuyển...</p>
          </div>
        )}
        
        {predictionError && (
          <div className="prediction-error">
            <p>{predictionError}</p>
          </div>
        )}
        
        {admissionPrediction && <AdmissionPredictionResult />}
        
        {/* Debug: kiểm tra giá trị predictionId */}
        <div style={{ display: 'none' }}>
          Debug - predictionId: {predictionId ? predictionId : 'null'}
        </div>
        
        {recommendations && predictionId && (
          <FeedbackForm 
            predictionId={predictionId}
            modelType="major_recommendation" 
            onFeedbackSubmitted={handleFeedbackSubmitted}
          />
        )}
        
        <div className="recommendation-grid">
          {recommendations.map((recommendation, index) => (
            <div className="recommendation-card" key={index}>
              <h3 className="major-name">{recommendation.major_name.toUpperCase()}</h3>
              
              <p className="category">Ngành: {recommendation.category}</p>
              
              <p className="confidence">
                Mức độ phù hợp: {(recommendation.confidence * 100).toFixed(1)}%
              </p>
              
              {recommendation.matching_interests && recommendation.matching_interests.length > 0 && (
                <div className="matching-interests">
                  <p>Phù hợp với sở thích:</p>
                  <div className="chips-container">
                    {recommendation.matching_interests.map((interest, i) => (
                      <CustomChip key={i} label={interest} />
                    ))}
                  </div>
                </div>
              )}
              
              {recommendation.description && (
                <p className="description">
                  {recommendation.description.length > 150 
                    ? `${recommendation.description.substring(0, 150)}...` 
                    : recommendation.description}
                </p>
              )}
              
              {recommendation.suitable_universities && recommendation.suitable_universities.length > 0 && (
                <div className="suitable-universities">
                  <hr className="divider" />
                  <h4 className="university-section-title">Các trường phù hợp</h4>
                  
                  <div className="universities-list">
                    {recommendation.suitable_universities.map((university, i) => {
                      // Tính tổng điểm dựa trên tổ hợp môn để hiển thị
                      const combinationMap = {
                        'A00': ['TOAN', 'LY', 'HOA'],
                        'A01': ['TOAN', 'LY', 'ANH'],
                        'B00': ['TOAN', 'HOA', 'SINH'],
                        'C00': ['VAN', 'SU', 'DIA'],
                        'D01': ['TOAN', 'VAN', 'ANH']
                      };
                      
                      const subjectMapping = {
                        'Toan': 'TOAN',
                        'NguVan': 'VAN',
                        'VatLy': 'LY',
                        'HoaHoc': 'HOA',
                        'SinhHoc': 'SINH',
                        'LichSu': 'SU',
                        'DiaLy': 'DIA',
                        'GDCD': 'GDCD',
                        'NgoaiNgu': 'ANH'
                      };
                      
                      // Tính điểm tổng của tổ hợp này
                      let calculatedScore = 0;
                      
                      if (university.combination && combinationMap[university.combination] && studentScores) {
                        const subjectsInCombination = combinationMap[university.combination];
                        let totalSubjectScore = 0;
                        let subjectCount = 0;
                        
                        // Chuyển đổi điểm từ tiếng Việt sang tiếng Anh và tính tổng
                        for (const [viKey, enKey] of Object.entries(subjectMapping)) {
                          // Chỉ lấy điểm của môn nằm trong tổ hợp
                          if (subjectsInCombination.includes(enKey)) {
                            const subjectScore = studentScores[viKey] !== undefined ? parseFloat(studentScores[viKey]) : 0;
                            totalSubjectScore += subjectScore;
                            subjectCount++;
                          }
                        }
                        
                        if (subjectCount > 0) {
                          calculatedScore = totalSubjectScore;
                        }
                      }
                      
                      // Điểm từ API hoặc điểm đã tính
                      const studentScore = calculatedScore || university.student_score || 0;
                      
                      return (
                        <div className="university-item" key={i}>
                          <div className="university-card">
                            <div className="university-info">
                              <h5 className="university-title">{university.university_name}</h5>
                              
                              <button 
                                type="button"
                                className="predict-admission-btn-prominent"
                                onClick={() => handlePredictAdmission(university, recommendation.major_name)}
                                disabled={predictionLoading}
                              >
                                {predictionLoading && selectedUniversity?.university_name === university.university_name 
                                  ? "Đang tính..." 
                                  : "👉 Xem xác suất trúng tuyển"}
                              </button>
                              
                              <div className="university-stats">
                                <div className="stat-item">
                                  <span className="stat-label">Điểm chuẩn:</span>
                                  <span className="stat-value">{university.benchmark_score}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Tổ hợp môn:</span>
                                  <span className="stat-value">{university.combination}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Điểm của bạn:</span>
                                  <span className="stat-value">{studentScore.toFixed(1)}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Chênh lệch:</span>
                                  <span className={`stat-value ${(studentScore - university.benchmark_score) >= 0 ? "positive" : "negative"}`}>
                                    {(studentScore - university.benchmark_score) >= 0 ? "+" : ""}{(studentScore - university.benchmark_score).toFixed(1)}
                                  </span>
                                </div>
                                {university.year && (
                                  <div className="stat-item">
                                    <span className="stat-label">Năm:</span>
                                    <span className="stat-value">{university.year}</span>
                                  </div>
                                )}
                                <div className="stat-item safety-status">
                                  <span className="stat-label">Đánh giá:</span>
                                  <span className={`status-badge ${
                                    university.safety_level === "An toàn" 
                                      ? "status-safe" 
                                      : university.safety_level === "Cân nhắc" 
                                        ? "status-consider" 
                                        : "status-difficult"
                                  }`}>
                                    {university.safety_level}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Hiển thị thông tin điểm tổ hợp của học sinh */}
              {recommendation.best_combination && (
                <div className="student-score-info">
                  <h4>Thông tin điểm số của bạn</h4>
                  <div className="score-container">
                    <p>Tổ hợp tối ưu: <strong>{recommendation.best_combination}</strong></p>
                    
                    {/* Tính lại điểm tổ hợp */}
                    {(() => {
                      // Tính tổng điểm dựa trên tổ hợp môn để hiển thị
                      const combinationMap = {
                        'A00': ['TOAN', 'LY', 'HOA'],
                        'A01': ['TOAN', 'LY', 'ANH'],
                        'B00': ['TOAN', 'HOA', 'SINH'],
                        'C00': ['VAN', 'SU', 'DIA'],
                        'D01': ['TOAN', 'VAN', 'ANH']
                      };
                      
                      const subjectMapping = {
                        'Toan': 'TOAN',
                        'NguVan': 'VAN',
                        'VatLy': 'LY',
                        'HoaHoc': 'HOA',
                        'SinhHoc': 'SINH',
                        'LichSu': 'SU',
                        'DiaLy': 'DIA',
                        'GDCD': 'GDCD',
                        'NgoaiNgu': 'ANH'
                      };
                      
                      // Tính điểm tổng của tổ hợp tối ưu
                      let calculatedScore = 0;
                      
                      if (recommendation.best_combination && combinationMap[recommendation.best_combination] && studentScores) {
                        const subjectsInCombination = combinationMap[recommendation.best_combination];
                        let totalSubjectScore = 0;
                        
                        // Chuyển đổi điểm từ tiếng Việt sang tiếng Anh và tính tổng
                        for (const [viKey, enKey] of Object.entries(subjectMapping)) {
                          // Chỉ lấy điểm của môn nằm trong tổ hợp
                          if (subjectsInCombination.includes(enKey)) {
                            const subjectScore = studentScores[viKey] !== undefined ? parseFloat(studentScores[viKey]) : 0;
                            totalSubjectScore += subjectScore;
                          }
                        }
                        
                        calculatedScore = totalSubjectScore;
                      } else {
                        // Nếu không tính được, sử dụng điểm từ API
                        calculatedScore = recommendation.student_score || 0;
                      }
                      
                      return (
                        <p>Điểm của bạn: <strong>{calculatedScore.toFixed(1)}</strong></p>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="major-recommendation">
      <h2 className="section-title">Gợi ý ngành học thông minh</h2>
      <p className="section-description">
        Hệ thống AI sẽ gợi ý ngành học phù hợp dựa trên điểm số, sở thích và tổ hợp môn của bạn.
      </p>
      
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <h3 className="form-section-title">1. Nhập điểm các môn học</h3>
          
          <div className="subjects-grid">
            {SUBJECTS.map((subject) => (
              <div className="subject-input" key={subject.id}>
                <label htmlFor={`score-${subject.id}`}>{subject.name}</label>
                <input
                  id={`score-${subject.id}`}
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.scores[subject.id] || ''}
                  onChange={(e) => handleScoreChange(subject.id, e.target.value)}
                />
              </div>
            ))}
          </div>
          
          <h3 className="form-section-title">2. Chọn tổ hợp thi</h3>
          
          <div className="to-hop-thi">
            <CustomSelect
              label="Tổ hợp thi"
              options={[
                { value: 'TN', label: 'Tự Nhiên' },
                { value: 'XH', label: 'Xã Hội' }
              ]}
              value={formData.tohopthi}
              onChange={handleToHopThiChange}
            />
          </div>
          
          <h3 className="form-section-title">3. Chọn sở thích (tối đa 3)</h3>
          
          <CustomSelect
            label="Sở thích"
            options={interests.map(interest => ({ 
              value: interest.name, 
              label: interest.name 
            }))}
            value={formData.interests}
            onChange={handleInterestChange}
            multiple
          />
          
          <h3 className="form-section-title">4. Chọn tổ hợp môn xét tuyển (tối đa 2)</h3>
          
          <CustomSelect
            label="Tổ hợp môn"
            options={subjectCombinations.map(combo => ({ 
              value: combo.code, 
              label: `${combo.code} (${combo.subjects.join(', ')})` 
            }))}
            value={formData.subject_groups}
            onChange={handleSubjectGroupChange}
            multiple
          />
          
          <h3 className="form-section-title">5. Thông tin ưu tiên</h3>
          
          <div className="priority-info">
            <CustomSelect
              label="Khu vực ưu tiên"
              options={[
                { value: 'KV1', label: 'KV1' },
                { value: 'KV2', label: 'KV2' },
                { value: 'KV3', label: 'KV3' }
              ]}
              value={formData.priority.area}
              onChange={handleAreaPriorityChange}
            />
            
            <CustomSelect
              label="Đối tượng ưu tiên"
              options={[
                { value: '00', label: 'Không ưu tiên' },
                { value: '01', label: 'Đối tượng 01' },
                { value: '02', label: 'Đối tượng 02' },
                { value: '03', label: 'Đối tượng 03' },
                { value: '04', label: 'Đối tượng 04' },
                { value: '05', label: 'Đối tượng 05' },
                { value: '06', label: 'Đối tượng 06' },
                { value: '07', label: 'Đối tượng 07' }
              ]}
              value={formData.priority.subject}
              onChange={handleSubjectPriorityChange}
            />
          </div>
          
          <div className="form-submit">
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Gợi ý ngành học"}
            </button>
          </div>
        </form>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default MajorRecommendation; 