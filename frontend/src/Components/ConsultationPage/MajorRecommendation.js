import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/api/aiService';
import './MajorRecommendation.css'; // Thêm một file CSS riêng cho component này

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

const MajorRecommendation = () => {
  const [formData, setFormData] = useState({
    scores: {},
    interests: [],
    subject_groups: [],
    tohopthi: 'TN',
    priority: {
      area: 'KV3',
      subject: '00'
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [interests, setInterests] = useState([]);
  const [subjectCombinations, setSubjectCombinations] = useState([]);
  
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
      
      {recommendations && (
        <div className="recommendations">
          <h2 className="section-title">Kết quả gợi ý ngành học</h2>
          
          <div className="recommendation-grid">
            {recommendations.map((recommendation, index) => (
              <div className="recommendation-card" key={index}>
                <h3 className="major-name">{recommendation.major_name.toUpperCase()}</h3>
                
                <p className="category">Ngành: {recommendation.category}</p>
                
                <p className="confidence">
                  Mức độ phù hợp: {(recommendation.confidence * 100).toFixed(1)}%
                </p>
                
                {recommendation.matching_interests.length > 0 && (
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
                    <p>Các trường phù hợp:</p>
                    
                    {recommendation.suitable_universities.map((university, i) => (
                      <div className="university" key={i}>
                        <p className="university-name">{university.university_name}</p>
                        
                        {university.subject_groups.map((group, j) => (
                          <div className="subject-group" key={j}>
                            <span>{group.code}: {group.min_score} điểm</span>
                            <span className={`result ${group.result === "Đạt" ? "success" : "error"}`}>
                              {group.result}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MajorRecommendation; 