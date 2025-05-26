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

const AdmissionProbability = ({ initialData }) => {
  const [formData, setFormData] = useState({
    universityCode: '',
    universityName: '',
    majorName: '',
    studentScore: '',
    combination: 'A00',
    priorityScore: 0,
    scores: {
      TOAN: '',
      LY: '',
      HOA: '',
      SINH: '',
      VAN: '',
      ANH: '',
      SU: '',
      DIA: '',
      GDCD: ''
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [majors, setMajors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filteredMajors, setFilteredMajors] = useState([]);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  const [predictionId, setPredictionId] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // Ánh xạ tên môn tiếng Việt sang mã tiếng Anh
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
  
  // Ánh xạ tổ hợp môn sang danh sách các môn học
  const combinationMap = {
    'A00': ['TOAN', 'LY', 'HOA'],
    'A01': ['TOAN', 'LY', 'ANH'],
    'B00': ['TOAN', 'HOA', 'SINH'],
    'C00': ['VAN', 'SU', 'DIA'],
    'D01': ['TOAN', 'VAN', 'ANH']
  };
  
  // Cập nhật form data khi nhận initialData từ component cha
  useEffect(() => {
    if (initialData) {
      console.log("Nhận dữ liệu từ tab gợi ý ngành:", initialData);
      
      // Khởi tạo scores từ điểm học sinh
      const scores = {};
      if (initialData.scores) {
        // Chuyển đổi điểm từ tiếng Việt sang tiếng Anh
        for (const [viKey, enKey] of Object.entries(subjectMapping)) {
          if (initialData.scores[viKey] !== undefined) {
            scores[enKey] = parseFloat(initialData.scores[viKey]) || 0;
          }
        }
      }
      
      // Cập nhật formData với tất cả dữ liệu đã nhận
      setFormData({
        universityCode: '', // Sẽ tìm và cập nhật sau
        universityName: initialData.universityName || '',
        majorName: initialData.majorName || '',
        studentScore: parseFloat(initialData.studentScore) || 0,
        combination: initialData.combination || 'A00',
        priorityScore: initialData.priorityScore || 0,
        scores: scores
      });
      
      // Tự động tìm trường nếu có tên trường
      if (initialData.universityName && universities.length > 0) {
        // Tìm trường theo tên
        const foundUniversity = universities.find(uni => 
          uni.name.toLowerCase() === initialData.universityName.toLowerCase() ||
          initialData.universityName.toLowerCase().includes(uni.name.toLowerCase()) ||
          uni.name.toLowerCase().includes(initialData.universityName.toLowerCase())
        );
        
        if (foundUniversity) {
          console.log("Đã tìm thấy trường:", foundUniversity.name);
          
          // Cập nhật universityCode
          setFormData(prev => ({
            ...prev,
            universityCode: foundUniversity.code
          }));
          
          // Cập nhật danh sách ngành theo trường
          handleUniversityChange(foundUniversity);
        }
      }
    }
  }, [initialData, universities]);
  
  // Thêm useEffect để tự động chọn ngành học sau khi trường đã được chọn
  useEffect(() => {
    // Nếu có initialData và formData đã có universityCode (trường đã được chọn)
    if (initialData && initialData.majorName && formData.universityCode && filteredMajors.length > 0) {
      console.log("Đang tìm ngành học:", initialData.majorName);
      // Không cần tìm ngành học trong danh sách, chỉ cần gán giá trị
      handleMajorChange(initialData.majorName);
    }
  }, [initialData, formData.universityCode, filteredMajors]);
  
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
      console.error('Lỗi khi chọn trường đại học:', error);
    }
  };
  
  // Xử lý khi chọn ngành học
  const handleMajorChange = (majorName) => {
    // Cập nhật formData
    setFormData({
      ...formData,
      majorName
    });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleScoreChange = (subject, value) => {
    setFormData({
      ...formData,
      scores: {
        ...formData.scores,
        [subject]: value
      }
    });
  };
  
  const handleCombinationChange = (e) => {
    setFormData({
      ...formData,
      combination: e.target.value
    });
  };
  
  const handlePriorityScoreChange = (event) => {
    const value = event.target.value;
    if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 4)) {
      setFormData({
        ...formData,
        priorityScore: value === '' ? 0 : parseFloat(value)
      });
    }
  };
  
  const handlePredict = async (data = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sử dụng dữ liệu được truyền vào hoặc lấy từ formData
      const requestData = data || {
        universityCode: formData.universityCode,
        majorName: formData.majorName ? formData.majorName.toLowerCase() : '',
        combination: formData.combination || 'A00',
        studentScore: typeof formData.studentScore === 'number' ? formData.studentScore : (parseFloat(formData.studentScore) || 0),
        priorityScore: formData.priorityScore || 0,
        scores: formData.scores || {}
      };
      
      // Kiểm tra dữ liệu đầu vào
      if (!requestData.universityCode || !requestData.majorName) {
        throw new Error('Vui lòng chọn trường đại học và ngành học');
      }
      
      // Lấy thông tin người dùng từ localStorage
      let userId = null;
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.phone || user.email || user._id;
        } catch (e) {
          console.error('Lỗi khi parse thông tin user từ localStorage:', e);
        }
      }
      
      // Thêm userId vào request data
      if (userId) {
        requestData.userId = userId;
      }
      
      console.log("Sending prediction request with data:", requestData);
      
      const response = await aiService.predictAdmissionProbability(requestData);
      console.log("Received prediction response:", response);
      
      if (response && response.success && response.prediction) {
        // Đảm bảo kết quả có đầy đủ các trường cần thiết
        const safeResult = {
          expectedScore: response.prediction.expectedScore || 0,
          scoreDiff: response.prediction.scoreDiff || 0,
          quota: response.prediction.quota || 0,
          admissionProbability: response.prediction.admissionProbability || 0,
          assessment: response.prediction.assessment || 'Chưa có đánh giá',
          ...response.prediction
        };
        
        setResult(safeResult);
        if (response._id) {
          setPredictionId(response._id);
        }
      } else {
        throw new Error(response?.message || 'Không nhận được kết quả dự đoán hợp lệ');
      }
    } catch (err) {
      console.error('Lỗi khi dự đoán xác suất:', err);
      setError(err.message || 'Có lỗi xảy ra khi dự đoán xác suất trúng tuyển');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    handlePredict();
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
                {/* Danh sách các môn học cố định */}
                {[
                  { code: 'TOAN', name: 'Toán' },
                  { code: 'VAN', name: 'Văn' },
                  { code: 'LY', name: 'Vật lý' },
                  { code: 'HOA', name: 'Hóa học' },
                  { code: 'SINH', name: 'Sinh học' },
                  { code: 'SU', name: 'Lịch sử' },
                  { code: 'DIA', name: 'Địa lý' },
                  { code: 'GDCD', name: 'GDCD' },
                  { code: 'ANH', name: 'Tiếng Anh' }
                ].map((subject) => (
                  <div key={subject.code} className="subject-item">
                    <label>{subject.name}</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.scores[subject.code] || ''}
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
      {result && (
        <div className="prediction-card">
          <div className="prediction-content">
            <h3 className="prediction-title">Kết quả dự đoán</h3>
            
            <div className="prediction-grid">
              <div className="prediction-item">
                <strong>Trường đại học:</strong> {formData.universityName || formData.universityCode}
              </div>
              
              <div className="prediction-item">
                <strong>Ngành học:</strong> {formData.majorName}
              </div>
              
              <div className="prediction-item">
                <strong>Tổ hợp môn tối ưu:</strong> {formData.combination}
              </div>
              
              <div className="prediction-item">
                <strong>Điểm của bạn:</strong> {typeof formData.studentScore === 'number' ? formData.studentScore.toFixed(1) : (parseFloat(formData.studentScore) || 0).toFixed(1)}
              </div>
              
              <div className="prediction-item">
                <strong>Điểm chuẩn dự kiến:</strong> {result.expectedScore.toFixed(1)}
              </div>
              
              <div className="prediction-item">
                <strong>Chênh lệch điểm:</strong> {result.scoreDiff.toFixed(1)}
              </div>
              
              <div className="prediction-item">
                <strong>Chỉ tiêu:</strong> {result.quota || 'Chưa có thông tin'}
              </div>
              
              <div className="prediction-item full-width">
                <h3 className="probability-title">
                  Xác suất đậu đại học: {(result.admissionProbability * 100).toFixed(1)}%
                </h3>
                
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: `${result.admissionProbability * 100}%`,
                      backgroundColor: getProbabilityColor(result.admissionProbability)
                    }}
                  ></div>
                </div>
                
                <p className="assessment">
                  Đánh giá: <strong>{result.assessment}</strong>
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
      {result && predictionId && showFeedbackForm && (
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