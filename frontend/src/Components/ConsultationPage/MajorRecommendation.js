import React, { useState, useEffect, useRef } from 'react';
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

const MajorRecommendation = ({ initialRecommendations, studentScores, predictionId: initialPredictionId }) => {
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
  const [predictionId, setPredictionId] = useState(initialPredictionId || null);
  const [admissionPredictionId, setAdmissionPredictionId] = useState(null);
  // State lưu trữ trường được chọn để hiển thị xác suất
  const [predictionResults, setPredictionResults] = useState({});
  
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState({}); // Track which predictions have been rated
  
  // Thêm state để theo dõi tab hiện tại (tab ngành học hoặc tab xác suất đậu)
  const [activeTab, setActiveTab] = useState(0);
  const [selectedProbability, setSelectedProbability] = useState({
    universityName: '',
    majorName: '',
    studentScore: 0
  });
  
  // Cập nhật khi nhận initialRecommendations mới
  useEffect(() => {
    if (initialRecommendations) {
      setRecommendations(initialRecommendations);
    }
  }, [initialRecommendations]);
  
  // Cập nhật predictionId khi nhận initialPredictionId mới
  useEffect(() => {
    if (initialPredictionId) {
      setPredictionId(initialPredictionId);
    }
  }, [initialPredictionId]);
  
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
      
      // Lấy thông tin người dùng từ localStorage - CẬP NHẬT để hỗ trợ cả email
      let userId = null;
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          // Ưu tiên lấy userID theo thứ tự: phone > email > _id
          userId = user.phone || user.email || user._id;
          console.log('Đã lấy được userId từ MajorRecommendation:', userId);
        } catch (e) {
          console.error('Lỗi khi parse thông tin user từ localStorage:', e);
        }
      }
      
      const requestData = {
        ...formData,
        // Thêm userId từ localStorage nếu đã đăng nhập
        userId: userId,
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
  const handlePredictAdmission = async (university, majorName, majorIndex, uniIndex) => {
    // Tạo key duy nhất cho kết quả dự đoán
    const predictionKey = `${majorIndex}-${uniIndex}`;
    
    // Cập nhật trạng thái loading cho trường đại học cụ thể này
    setPredictionResults(prev => ({
      ...prev,
      [predictionKey]: { loading: true, error: null, result: null }
    }));
    
    setPredictionLoading(true);
    setPredictionError(null);
    setSelectedUniversity(university);
    
    try {
      // Trích xuất mã trường từ tên trường (mã nằm trước dấu "-")
      const universityNameParts = university.university_name ? university.university_name.split('-') : ['Unknown'];
      const universityCode = universityNameParts[0].trim();
      
      // Lấy tổ hợp môn
      const combination = university.combination || '';
      
      // In chi tiết thông tin điểm học sinh được truyền vào (chỉ hiển thị trong console)
      // console.log("===== KIỂM TRA ĐIỂM HỌC SINH =====");
      // console.log("studentScores prop:", studentScores); 
      // console.log("formData.scores:", formData.scores);
      // console.log("Keys trong studentScores:", studentScores ? Object.keys(studentScores) : "null");
      // console.log("Giá trị Toán:", studentScores?.Toan);
      // console.log("Giá trị Văn:", studentScores?.NguVan);
      // console.log("Giá trị Ngoại ngữ:", studentScores?.NgoaiNgu);
      
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
        
        // console.log("Chi tiết điểm theo tổ hợp:", combination);
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
      
      // Lấy thông tin người dùng từ localStorage
      let userId = null;
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.phone || user.email || user._id;
          // console.log('Đã lấy được userId cho dự đoán xác suất:', userId);
        } catch (e) {
          console.error('Lỗi khi parse thông tin user từ localStorage:', e);
        }
      }
      
      // Dữ liệu gửi đi theo đúng format API backend yêu cầu (universityCode, majorName, scores)
      const predictionData = {
        universityCode: universityCode,
        majorName: majorName ? majorName.toLowerCase() : '',
        combination: combination,
        studentScore: calculatedStudentScore, // Sử dụng điểm đã tính
        scores: scores,
        // Thêm userId từ localStorage nếu đã đăng nhập
        userId: userId
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
      // console.log('Dữ liệu gửi đi:', JSON.stringify(predictionData, null, 2));
      // console.log('=====================================');
      
      // Gọi API dự đoán
      const response = await aiService.predictAdmissionProbability(predictionData);
      
      // console.log('Kết quả dự đoán xác suất:', response);
      
      if (response && response.success && response.prediction) {
        // Lưu kết quả dự đoán vào state kết quả dự đoán
        setPredictionResults(prev => ({
          ...prev,
          [predictionKey]: { loading: false, error: null, result: response.prediction }
        }));
        
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
      // Lưu lỗi vào state kết quả dự đoán
      setPredictionResults(prev => ({
        ...prev,
        [predictionKey]: { loading: false, error: err.message, result: null }
      }));
    } finally {
      setPredictionLoading(false);
    }
  };
  
  // Hàm xử lý khi người dùng gửi feedback cho kết quả xác suất
  const handlePredictionFeedback = (predictionKey, isPositive) => {
    console.log('Feedback cho kết quả dự đoán:', predictionKey, isPositive ? 'Tích cực' : 'Tiêu cực');
    
    // Gửi feedback cho mô hình dự đoán xác suất nếu có ID
    if (admissionPredictionId) {
      aiService.submitFeedback('data/admission/feedback', {
        predictionId: admissionPredictionId,
        isUseful: isPositive,
        feedback: isPositive ? 'Kết quả dự đoán hữu ích' : 'Kết quả dự đoán chưa chính xác'
      }).then(response => {
        console.log('Đã gửi feedback cho mô hình dự đoán xác suất:', response);
        // Mark this prediction as rated
        setFeedbackSubmitted(prev => ({
          ...prev,
          [predictionKey]: true
        }));
        // Show success message
        alert(isPositive ? 'Cảm ơn bạn đã đánh giá tích cực!' : 'Cảm ơn bạn đã đánh giá!');
      }).catch(err => {
        console.error('Lỗi khi gửi feedback cho mô hình dự đoán xác suất:', err);
        alert('Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại sau.');
      });
    }
  };
  
  // Hàm xử lý khi người dùng gửi feedback
  const handleFeedbackSubmitted = (feedbackData) => {
    console.log('Feedback submitted:', feedbackData);
    setShowFeedbackForm(false);
    
    // Gửi feedback cho mô hình gợi ý ngành học
    if (predictionId) {
      // console.log('Gửi feedback cho mô hình gợi ý ngành học với ID:', predictionId);
    } else {
      console.warn('Không có predictionId cho mô hình gợi ý ngành học');
    }
    
    // Nếu người dùng đã xem xác suất trúng tuyển, lưu feedback cả cho mô hình xác suất
    if (admissionPredictionId) {
      // console.log('Gửi feedback cho mô hình dự đoán xác suất với ID:', admissionPredictionId);
    }
  };
  
  // Hàm xử lý khi người dùng click vào cột "Mức độ an toàn"
  const handleViewProbability = (university, majorName, studentScore) => {
    const universityName = university.university_name || '';
    const combination = university.combination || '';
    
    // Đảm bảo studentScore là một số hợp lệ
    const validStudentScore = typeof studentScore === 'number' && !isNaN(studentScore) ? 
      studentScore : 0;
    
    // Hiển thị hộp xác nhận
    const confirmed = window.confirm(
      `Bạn có muốn xem xác suất ngành "${majorName}" của trường "${universityName}" không?`
    );
    
    if (confirmed) {
      // Lưu thông tin ngành và trường đã chọn
      setSelectedProbability({
        universityName,
        majorName,
        studentScore: validStudentScore,
        combination
      });
      
      // Chuyển sang tab xác suất đậu
      setActiveTab(1);
      
      // Thông báo lên component cha để chuyển tab
      if (typeof window.switchConsultationTab === 'function') {
        // Chuẩn bị dữ liệu đầy đủ để gửi sang AdmissionProbability
        const dataForAdmission = {
          universityName,
          majorName,
          studentScore: validStudentScore,
          combination,
          scores: studentScores || {},
          // Thêm các thông tin khác nếu cần
          priorityScore: formData.priority ? (
            (formData.priority.area === 'KV1' ? 0.75 : 
             formData.priority.area === 'KV2' ? 0.5 : 
             formData.priority.area === 'KV3' ? 0.25 : 0) + 
            (formData.priority.subject !== '00' ? 1 : 0)
          ) : 0
        };
        
        console.log("Chuyển sang tab xác suất với dữ liệu:", dataForAdmission);
        window.switchConsultationTab(1, dataForAdmission);
      } else {
        console.log("Hàm switchConsultationTab chưa được định nghĩa ở component cha");
        alert(`Đã chọn xem xác suất ngành "${majorName}" của trường "${universityName}"`);
      }
    }
  };
  
  // Nếu có recommendations ban đầu, hiển thị chúng
  if (recommendations) {
    // Chỉ lấy 3 ngành hàng đầu theo độ phù hợp
    const topRecommendations = recommendations;
    
    return (
      <div className="major-recommendation">
        <h2 className="results-header">Kết quả gợi ý ngành học phù hợp</h2>
        
        <div className="results-container">
          {topRecommendations.map((recommendation, index) => (
            <div className="result-card" key={index}>
              <div className="result-card-header" style={{
                background: recommendation.confidence >= 0.8 
                  ? 'rgba(40, 167, 69, 0.2)' 
                  : recommendation.confidence >= 0.5 
                    ? 'rgba(255, 193, 7, 0.2)' 
                    : 'rgba(220, 53, 69, 0.2)'
              }}>
                <div className="result-card-badge">{index + 1}</div>
                <h3 className="result-card-title" style={{
                  color: recommendation.confidence >= 0.8 
                    ? '#155724' 
                    : recommendation.confidence >= 0.5 
                      ? '#856404' 
                      : '#721c24'
                }}>{recommendation.major_name ? recommendation.major_name.toUpperCase() : 'CHƯA XÁC ĐỊNH'}</h3>
                <div className="result-card-confidence">
                  <div className="confidence-meter">
                    <div 
                      className="confidence-fill" 
                      style={{
                        width: `${recommendation.confidence ? recommendation.confidence * 100 : 0}%`,
                        backgroundColor: recommendation.confidence >= 0.8 
                          ? '#28a745' 
                          : recommendation.confidence >= 0.5 
                            ? '#ffc107' 
                            : '#dc3545'
                      }}
                    ></div>
                  </div>
                  <span className="confidence-text" style={{
                    color: recommendation.confidence >= 0.8 
                      ? '#155724' 
                      : recommendation.confidence >= 0.5 
                        ? '#856404' 
                        : '#721c24'
                  }}>
                    {recommendation.confidence ? (recommendation.confidence * 100).toFixed(1) : 0}% phù hợp
                  </span>
                </div>
              </div>
              
              <div className="result-card-body">
                <div className="result-card-section">
                  <div className="result-card-info">
                    <div className="info-row">
                      {recommendation.best_combination && (
                        <div className="info-item">
                          <span className="info-label">Tổ hợp tốt nhất:</span>
                          <span className="info-value highlight">{recommendation.best_combination}</span>
                        </div>
                      )}
                      
                      {(() => {
                        // Tính tổng điểm dựa trên tổ hợp môn
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
                            if (subjectsInCombination.includes(enKey)) {
                              const subjectScore = studentScores[viKey] !== undefined ? parseFloat(studentScores[viKey]) : 0;
                              totalSubjectScore += subjectScore;
                            }
                          }
                          
                          calculatedScore = totalSubjectScore;
                        } else {
                          calculatedScore = recommendation.student_score || 0;
                        }
                        
                        return (
                          <div className="info-item">
                            <span className="info-label">Điểm của bạn:</span>
                            <span className="info-value highlight">{calculatedScore.toFixed(1)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className="result-card-details">
                  {recommendation.matching_interests && recommendation.matching_interests.length > 0 && (
                    <div className="interests-section">
                      <h4 className="section-subtitle">Sở thích phù hợp</h4>
                      <div className="interests-tags">
                        {recommendation.matching_interests.map((interest, i) => (
                          <span key={i} className="interest-tag">{interest}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {recommendation.description && (
                    <div className="description-section">
                      <h4 className="section-subtitle">Mô tả ngành học</h4>
                      <p className="description-text">
                        {recommendation.description.length > 200 
                          ? `${recommendation.description.substring(0, 200)}...` 
                          : recommendation.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {recommendation.suitable_universities && recommendation.suitable_universities.length > 0 && (
                <div className="universities-section">
                  <h4 className="section-subtitle">Trường đại học phù hợp</h4>
                  
                  <div className="universities-table-container">
                    <table className="universities-table">
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Tên trường</th>
                          <th>Tên ngành</th>
                          <th>Khối</th>
                          <th>Điểm của em</th>
                          <th>Điểm chuẩn 2024</th>
                          <th>Chênh lệch</th>
                          <th>Mức độ an toàn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recommendation.suitable_universities.map((university, i) => {
                          // Đảm bảo điểm sinh viên đang là số hợp lệ
                          const studentScoreValue = university.student_score ? 
                            parseFloat(university.student_score) : 0;

                          // Đảm bảo điểm benchmark là số hợp lệ
                          const benchmarkValue = university.benchmark_score ? 
                            parseFloat(university.benchmark_score) : 0;
                            
                          // Tính chênh lệch điểm
                          const scoreDifference = studentScoreValue - benchmarkValue;
                          
                          // Xác định màu cho mức độ an toàn
                          const getSafetyColor = (safety) => {
                            switch(safety) {
                              case "An toàn": return "safe-text";
                              case "Cân nhắc": return "consider-text";
                              default: return "difficult-text";
                            }
                          };
                          
                          // Xác định màu nền cho mức độ phù hợp - giữ lại để dùng sau nếu cần
                          const confidenceValue = recommendation.confidence ? recommendation.confidence * 100 : 0;
                          const getConfidenceClass = (value) => {
                            if (value >= 80) return "high-confidence";
                            if (value >= 50) return "medium-confidence";
                            return "low-confidence";
                          };
                          
                          return (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>{university.university_name}</td>
                              <td>{university.major_name || recommendation.major_name}</td>
                              <td>{university.combination || recommendation.best_combination || 'N/A'}</td>
                              <td>{studentScoreValue.toFixed(2)}</td>
                              <td>{benchmarkValue.toFixed(2)}</td>
                              <td className={scoreDifference >= 0 ? "positive-diff" : "negative-diff"}>
                                {scoreDifference >= 0 ? '+' : ''}{scoreDifference.toFixed(2)}
                              </td>
                              <td 
                                className={`${getSafetyColor(university.safety_level)} probability-link`}
                                title="Click để xem xác suất trúng tuyển"
                                onClick={() => handleViewProbability(
                                  university, 
                                  university.major_name || recommendation.major_name, 
                                  studentScoreValue
                                )}
                              >
                                {university.safety_level || 'Chưa đánh giá'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="feedback-container">
          <button className="global-feedback-button" onClick={() => setShowFeedbackForm(true)}>
            Đánh giá kết quả gợi ý
          </button>
        </div>
        
        {recommendations && predictionId && showFeedbackForm && (
          <div className="feedback-modal-overlay">
            <div className="feedback-modal">
              <FeedbackForm 
                predictionId={predictionId}
                modelType="major_recommendation" 
                onClose={() => setShowFeedbackForm(false)}
                onSubmitted={handleFeedbackSubmitted}
                standalone={false}
              />
            </div>
          </div>
        )}
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