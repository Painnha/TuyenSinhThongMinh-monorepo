import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/api/aiService';
import './AdmissionProbability.css';
import FeedbackForm from '../PredictionLogs/FeedbackForm';

// Custom Select Component
const CustomSelect = ({ label, options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="custom-form-control">
      <label className="input-label">{label}</label>
      <div className="custom-select" onClick={() => setIsOpen(!isOpen)}>
        <div className="selected-value">
          {options.find(opt => opt.value === value)?.label || 'Chọn...'}
        </div>
        <span className="select-arrow">▼</span>
        
        {isOpen && (
          <div className="select-options">
            {options.map(option => (
              <div 
                key={option.value} 
                className={`select-option ${value === option.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange({ target: { value: option.value } });
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Custom Autocomplete Component
const CustomAutocomplete = ({ label, options, value, onChange }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  
  useEffect(() => {
    if (inputValue) {
      setFilteredOptions(
        options.filter(option => 
          option.toLowerCase().includes(inputValue.toLowerCase())
        )
      );
    } else {
      setFilteredOptions(options);
    }
  }, [inputValue, options]);
  
  return (
    <div className="custom-form-control">
      <label className="input-label">{label}</label>
      <div className="custom-autocomplete">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onClick={() => setIsOpen(true)}
          placeholder="Chọn hoặc nhập..."
          required
        />
        
        {isOpen && filteredOptions.length > 0 && (
          <div className="autocomplete-options">
            {filteredOptions.map((option, index) => (
              <div 
                key={index} 
                className="autocomplete-option"
                onClick={() => {
                  setInputValue(option);
                  onChange(null, option);
                  setIsOpen(false);
                }}
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AdmissionProbability = () => {
  const [formData, setFormData] = useState({
    universityCode: '',
    universityName: '',
    majorName: '',
    scores: {},
    priorityScore: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [majors, setMajors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filteredMajors, setFilteredMajors] = useState([]);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  const [predictionId, setPredictionId] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // Lấy dữ liệu từ API khi component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Lấy danh sách trường đại học
        const universitiesResponse = await aiService.getUniversities();
        if (universitiesResponse && universitiesResponse.success && universitiesResponse.data) {
          // Đảm bảo không có trường nào bị trùng mã
          const uniqueUniversities = [];
          const codeMap = new Map();
          
          universitiesResponse.data.forEach(uni => {
            if (!codeMap.has(uni.code)) {
              codeMap.set(uni.code, uni);
              uniqueUniversities.push(uni);
            } else {
              console.warn(`Duplicate university code found: ${uni.code} - ${uni.name}`);
            }
          });
          
          setUniversities(uniqueUniversities);
          setFilteredUniversities(uniqueUniversities);
        }
        
        // Lấy danh sách ngành học
        const majorsResponse = await aiService.getMajors();
        if (majorsResponse && majorsResponse.success && majorsResponse.data) {
          setMajors(majorsResponse.data);
          setFilteredMajors(majorsResponse.data);
        }
        
        // Lấy danh sách môn học
        const subjectsResponse = await aiService.getSubjects();
        if (subjectsResponse && subjectsResponse.success && subjectsResponse.data) {
          setSubjects(subjectsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Không thể lấy dữ liệu ban đầu. Vui lòng thử lại sau.');
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Xử lý khi chọn trường đại học
  const handleUniversityChange = async (university) => {
    try {
      if (!university) {
        setFormData({
          ...formData,
          universityCode: '',
          universityName: ''
        });
        setFilteredMajors(majors);
        return;
      }
      
      // Cập nhật formData
      setFormData({
        ...formData,
        universityCode: university.code,
        universityName: university.name
      });
      
      // Lấy danh sách ngành của trường đã chọn
      const majorsResponse = await aiService.getMajorsByUniversity(university.code);
      if (majorsResponse && majorsResponse.success && majorsResponse.data) {
        setFilteredMajors(majorsResponse.data);
      }
    } catch (error) {
      console.error('Error handling university change:', error);
    }
  };
  
  // Xử lý khi chọn ngành học
  const handleMajorChange = async (majorName) => {
    try {
      // Cập nhật formData
      setFormData({
        ...formData,
        majorName
      });
      
      if (!majorName) {
        setFilteredUniversities(universities);
        return;
      }
      
      // Lấy danh sách trường có ngành đã chọn
      const universitiesResponse = await aiService.getUniversitiesByMajor(majorName);
      if (universitiesResponse && universitiesResponse.success && universitiesResponse.data) {
        setFilteredUniversities(universitiesResponse.data);
      }
    } catch (error) {
      console.error('Error handling major change:', error);
    }
  };
  
  // Xử lý khi nhập điểm môn học
  const handleScoreChange = (subjectCode, value) => {
    const scores = { ...formData.scores };
    
    if (value === '') {
      scores[subjectCode] = '';
    } else {
      const score = parseFloat(value);
      if (!isNaN(score) && score >= 0 && score <= 10) {
        scores[subjectCode] = score;
      } else {
        return; // Không cập nhật giá trị không hợp lệ
      }
    }
    
    setFormData({
      ...formData,
      scores
    });
  };
  
  // Xử lý khi nhập điểm ưu tiên
  const handlePriorityScoreChange = (event) => {
    const value = event.target.value;
    if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 4)) {
      setFormData({
        ...formData,
        priorityScore: value === '' ? 0 : parseFloat(value)
      });
    }
  };
  
  // Xử lý khi submit form
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Kiểm tra dữ liệu đầu vào
      if (!formData.universityCode) throw new Error('Vui lòng chọn trường đại học');
      if (!formData.majorName) throw new Error('Vui lòng chọn ngành học');
      
      // Kiểm tra xem đã nhập đủ điểm các môn chưa
      let hasEnoughScores = false;
      const subjectCombinations = {
        'A00': ['TOAN', 'LY', 'HOA'],
        'A01': ['TOAN', 'LY', 'ANH'],
        'B00': ['TOAN', 'HOA', 'SINH'],
        'C00': ['VAN', 'SU', 'DIA'],
        'D01': ['TOAN', 'VAN', 'ANH']
      };
      
      for (const combination of Object.values(subjectCombinations)) {
        const hasAllSubjects = combination.every(subject => 
          formData.scores[subject] !== undefined && 
          formData.scores[subject] !== null && 
          formData.scores[subject] !== ''
        );
        if (hasAllSubjects) {
          hasEnoughScores = true;
          break;
        }
      }
      
      if (!hasEnoughScores) {
        throw new Error('Vui lòng nhập đủ điểm các môn học cho ít nhất một tổ hợp');
      }
      
      // Lấy thông tin người dùng từ localStorage
      let userId = null;
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          // Ưu tiên lấy userID theo thứ tự: phone > email > _id
          userId = user.phone || user.email || user._id;
          console.log('AdmissionProbability - Đã lấy được userId:', userId);
        } catch (e) {
          console.error('Lỗi khi parse thông tin user từ localStorage:', e);
        }
      }
      
      // Chuẩn bị dữ liệu gửi đi - đảm bảo tên ngành được giữ nguyên cách viết hoa/thường từ danh sách
      const requestData = {
        universityCode: formData.universityCode,
        majorName: formData.majorName, // Đã được chọn từ danh sách options nên đảm bảo đúng format
        scores: formData.scores,
        priorityScore: formData.priorityScore,
        // Thêm userId từ localStorage nếu đã đăng nhập
        userId: userId
      };
      
      console.log('Gửi dữ liệu dự đoán:', requestData);
      
      // Gọi API dự đoán
      const response = await aiService.predictAdmissionProbability(requestData);
      
      if (response && response.success && response.prediction) {
        setPrediction(response.prediction);
        if (response._id) {
          setPredictionId(response._id);
        }
      } else {
        throw new Error(response.message || 'Không thể dự đoán xác suất đậu đại học');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Có lỗi xảy ra khi dự đoán. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };
  
  // Xác định màu cho thanh tiến trình
  const getProbabilityColor = (probability) => {
    if (probability >= 0.8) return '#4caf50'; // Xanh lá
    if (probability >= 0.6) return '#8bc34a'; // Xanh lá nhạt
    if (probability >= 0.4) return '#ffb74d'; // Cam
    if (probability >= 0.2) return '#ff9800'; // Cam đậm
    return '#f44336'; // Đỏ
  };
  
  // Xử lý khi người dùng gửi feedback
  const handleFeedbackSubmitted = (feedbackData) => {
    console.log('Feedback submitted for admission prediction:', feedbackData);
    setShowFeedbackForm(false);
  };
  
  return (
    <div className="admission-container">
      <h2 className="admission-title">Dự đoán xác suất đậu đại học</h2>
      <p className="admission-description">
        Hệ thống AI sẽ dự đoán xác suất đậu đại học dựa trên thông tin bạn cung cấp.
      </p>
      
      <div className="admission-form-paper">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Chọn trường đại học */}
            <div className="form-grid-item full-width">
              <div className="custom-form-control">
                <label className="input-label">Trường đại học</label>
                <select 
                  value={formData.universityCode}
                  onChange={(e) => {
                    const selectedUniversity = filteredUniversities.find(uni => uni.code === e.target.value);
                    handleUniversityChange(selectedUniversity);
                  }}
                  required
                >
                  <option value="">-- Chọn trường đại học --</option>
                  {filteredUniversities.map((uni, index) => (
                    <option key={`${uni.code}-${index}`} value={uni.code}>
                      {uni.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Chọn ngành học */}
            <div className="form-grid-item full-width">
              <div className="custom-form-control">
                <label className="input-label">Ngành học</label>
                <select 
                  value={formData.majorName}
                  onChange={(e) => handleMajorChange(e.target.value)}
                  required
                >
                  <option value="">-- Chọn ngành học --</option>
                  {filteredMajors.map((major, index) => (
                    <option key={`major-${index}`} value={major.name}>
                      {major.name}
                    </option>
                  ))}
                </select>
                {filteredMajors.length === 0 && !loading && (
                  <p className="help-text warning">Chưa có dữ liệu ngành học. Vui lòng chọn trường trước.</p>
                )}
              </div>
            </div>
            
            {/* Bảng nhập điểm môn học */}
            <div className="form-grid-item full-width">
              <label className="input-label">Điểm các môn học</label>
              <div className="subjects-grid">
                {subjects.map((subject) => (
                  <div key={subject.code} className="subject-item">
                    <label>{subject.name}</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.scores[subject.code] === undefined || formData.scores[subject.code] === null ? '' : formData.scores[subject.code]}
                      onChange={(e) => handleScoreChange(subject.code, e.target.value)}
                      placeholder="0.0 - 10.0"
                    />
                  </div>
                ))}
              </div>
              <span className="help-text">Nhập điểm các môn học của bạn (thang điểm 10)</span>
            </div>
            
            {/* Điểm ưu tiên */}
            <div className="form-grid-item">
              <div className="custom-form-control">
                <label className="input-label">Điểm ưu tiên</label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  step="0.25"
                  value={formData.priorityScore}
                  onChange={handlePriorityScoreChange}
                />
                <span className="help-text">Điểm ưu tiên (khu vực, đối tượng)</span>
              </div>
            </div>
            
            {/* Nút submit */}
            <div className="form-grid-item full-width">
              <div className="button-container">
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? "Đang xử lý..." : "Dự đoán xác suất"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
      
      {/* Hiển thị lỗi */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* Hiển thị kết quả dự đoán */}
      {prediction && (
        <div className="prediction-card">
          <div className="prediction-content">
            <h3 className="prediction-title">Kết quả dự đoán</h3>
            
            <div className="prediction-grid">
              <div className="prediction-item">
                <strong>Trường đại học:</strong> {prediction.universityName}
              </div>
              
              <div className="prediction-item">
                <strong>Ngành học:</strong> {prediction.majorName}
              </div>
              
              <div className="prediction-item">
                <strong>Tổ hợp môn tối ưu:</strong> {prediction.selectedCombination}
              </div>
              
              <div className="prediction-item">
                <strong>Điểm của bạn:</strong> {prediction.totalScore.toFixed(1)}
              </div>
              
              <div className="prediction-item">
                <strong>Điểm chuẩn dự kiến:</strong> {prediction.expectedScore.toFixed(1)}
              </div>
              
              <div className="prediction-item">
                <strong>Chênh lệch điểm:</strong> {prediction.scoreDiff.toFixed(1)}
              </div>
              
              <div className="prediction-item">
                <strong>Chỉ tiêu:</strong> {prediction.quota}
              </div>
              
              <div className="prediction-item full-width">
                <h3 className="probability-title">
                  Xác suất đậu đại học: {(prediction.admissionProbability * 100).toFixed(1)}%
                </h3>
                
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: `${prediction.admissionProbability * 100}%`,
                      backgroundColor: getProbabilityColor(prediction.admissionProbability)
                    }}
                  ></div>
                </div>
                
                <p className="assessment">
                  Đánh giá: <strong>{prediction.assessment}</strong>
                </p>
                
                {/* Thêm nút gửi đánh giá */}
                <button 
                  className="feedback-button"
                  onClick={() => setShowFeedbackForm(true)}
                >
                  Gửi đánh giá của bạn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hiển thị form feedback khi người dùng click vào nút */}
      {prediction && predictionId && showFeedbackForm && (
        <FeedbackForm 
          predictionId={predictionId}
          modelType="admission_prediction"
          onClose={() => setShowFeedbackForm(false)}
          onSubmitted={handleFeedbackSubmitted}
        />
      )}
    </div>
  );
};

export default AdmissionProbability; 