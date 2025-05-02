import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/api/aiService';
import './AdmissionProbability.css';

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
    universityName: '',
    majorName: '',
    combination: '',
    studentScore: '',
    year: new Date().getFullYear()
  });
  
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [majors, setMajors] = useState([]);
  const [combinations, setCombinations] = useState([]);
  
  useEffect(() => {
    // Lấy danh sách trường đại học
    fetch('http://localhost:5000/api/data/universities')
      .then(response => response.json())
      .then(data => {
        if (data && data.success && data.data) {
          setUniversities(data.data);
        }
      })
      .catch(err => console.error('Error fetching universities:', err));
    
    // Lấy danh sách ngành học
    fetch('http://localhost:5000/api/data/majors')
      .then(response => response.json())
      .then(data => {
        if (data && data.success && data.data) {
          setMajors(data.data);
        }
      })
      .catch(err => console.error('Error fetching majors:', err));
    
    // Lấy danh sách tổ hợp môn
    aiService.getSubjectCombinations()
      .then(data => {
        if (data && data.success && data.data) {
          setCombinations(data.data);
        }
      })
      .catch(err => console.error('Error fetching subject combinations:', err));
  }, []);
  
  const handleUniversityChange = (event, newValue) => {
    setFormData({
      ...formData,
      universityName: newValue || ''
    });
  };
  
  const handleMajorChange = (event, newValue) => {
    setFormData({
      ...formData,
      majorName: newValue || ''
    });
  };
  
  const handleCombinationChange = (event) => {
    setFormData({
      ...formData,
      combination: event.target.value
    });
  };
  
  const handleScoreChange = (event) => {
    const value = event.target.value;
    if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 30)) {
      setFormData({
        ...formData,
        studentScore: value
      });
    }
  };
  
  const handleYearChange = (event) => {
    setFormData({
      ...formData,
      year: event.target.value
    });
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Kiểm tra dữ liệu đầu vào
      if (!formData.universityName) throw new Error('Vui lòng chọn trường đại học');
      if (!formData.majorName) throw new Error('Vui lòng chọn ngành học');
      if (!formData.combination) throw new Error('Vui lòng chọn tổ hợp môn');
      if (!formData.studentScore) throw new Error('Vui lòng nhập điểm của bạn');
      
      const requestData = {
        ...formData,
        studentScore: parseFloat(formData.studentScore),
        year: parseInt(formData.year)
      };
      
      const response = await aiService.predictAdmissionProbability(requestData);
      
      if (response && response.prediction) {
        setPrediction(response.prediction);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Có lỗi xảy ra khi dự đoán. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };
  
  const getProbabilityColor = (probability) => {
    if (probability >= 0.8) return '#4caf50'; // Xanh lá
    if (probability >= 0.6) return '#8bc34a'; // Xanh lá nhạt
    if (probability >= 0.4) return '#ffb74d'; // Cam
    if (probability >= 0.2) return '#ff9800'; // Cam đậm
    return '#f44336'; // Đỏ
  };
  
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  
  return (
    <div className="admission-container">
      <h2 className="admission-title">Dự đoán xác suất đậu đại học</h2>
      <p className="admission-description">
        Hệ thống AI sẽ dự đoán xác suất đậu đại học dựa trên thông tin bạn cung cấp.
      </p>
      
      <div className="admission-form-paper">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-grid-item full-width">
              <CustomAutocomplete
                label="Trường đại học"
                options={universities.map(uni => uni.name)}
                value={formData.universityName}
                onChange={handleUniversityChange}
              />
            </div>
            
            <div className="form-grid-item full-width">
              <CustomAutocomplete
                label="Ngành học"
                options={majors.map(major => major.name)}
                value={formData.majorName}
                onChange={handleMajorChange}
              />
            </div>
            
            <div className="form-grid-item">
              <CustomSelect
                label="Tổ hợp môn"
                options={combinations.map((combo) => ({
                  value: combo.code,
                  label: `${combo.code} (${combo.subjects.join(', ')})`
                }))}
                value={formData.combination}
                onChange={handleCombinationChange}
              />
            </div>
            
            <div className="form-grid-item">
              <CustomSelect
                label="Năm"
                options={years.map(year => ({
                  value: year,
                  label: year.toString()
                }))}
                value={formData.year}
                onChange={handleYearChange}
              />
            </div>
            
            <div className="form-grid-item full-width">
              <div className="custom-form-control">
                <label className="input-label">Điểm của bạn</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={formData.studentScore}
                  onChange={handleScoreChange}
                  required
                />
                <span className="help-text">Nhập tổng điểm của bạn (điểm 3 môn + điểm ưu tiên)</span>
              </div>
            </div>
            
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
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
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
                <strong>Tổ hợp môn:</strong> {prediction.combination}
              </div>
              
              <div className="prediction-item">
                <strong>Năm:</strong> {prediction.year}
              </div>
              
              <div className="prediction-item">
                <strong>Điểm của bạn:</strong> {prediction.studentScore}
              </div>
              
              <div className="prediction-item">
                <strong>Điểm chuẩn dự kiến:</strong> {prediction.benchmarkScore}
              </div>
              
              <div className="prediction-item">
                <strong>Chênh lệch điểm:</strong> {prediction.scoreDifference.toFixed(1)}
              </div>
              
              <div className="prediction-item">
                <strong>Chỉ tiêu:</strong> {prediction.admissionQuota}
              </div>
              
              <div className="prediction-item full-width">
                <h3 className="probability-title">
                  Xác suất đậu đại học: {(prediction.probability * 100).toFixed(1)}%
                </h3>
                
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: `${prediction.probability * 100}%`,
                      backgroundColor: getProbabilityColor(prediction.probability)
                    }}
                  ></div>
                </div>
                
                <p className="assessment">
                  Đánh giá: <strong>{prediction.assessment}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionProbability; 