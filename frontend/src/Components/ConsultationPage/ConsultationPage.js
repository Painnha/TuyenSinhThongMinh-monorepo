import React, { useState, useEffect, useRef } from 'react';
import { subjectCombinationService, interestService, aiService } from '../../services';
import './ConsultationPage.css';
import axios from 'axios';
// Loại bỏ import từ MUI
// import { Tabs, Tab } from '@mui/material';
import TabPanel from './TabPanel';
import MajorRecommendation from './MajorRecommendation';
import AdmissionProbability from './AdmissionProbability';
import { log, logError } from '../../utils/logger';

// Component Tab tùy chỉnh thay thế Tab của MUI
const CustomTab = ({ label, active, onClick }) => {
  return (
    <button 
      className={`custom-tab ${active ? 'active' : ''}`} 
      onClick={onClick}
    >
      {label}
    </button>
  );
};

// Component Tabs tùy chỉnh thay thế Tabs của MUI
const CustomTabs = ({ value, onChange, children }) => {
  return (
    <div className="custom-tabs">
      {React.Children.map(children, (child, index) => {
        return React.cloneElement(child, {
          active: value === index,
          onClick: () => onChange(index),
        });
      })}
    </div>
  );
};

const MultiSelect = ({ options, value, onChange, placeholder, loading, maxSelections }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValues, setSelectedValues] = useState(value || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options || []);
    const [error, setError] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        setSelectedValues(value || []);
    }, [value]);

    useEffect(() => {
        // Lọc options dựa trên searchTerm
        if (searchTerm) {
            const filtered = options.filter(option => 
                option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                option.value.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredOptions(filtered);
        } else {
            setFilteredOptions(options);
        }
    }, [searchTerm, options]);

    const handleSelect = (optionValue) => {
        // Nếu đã chọn, bỏ chọn
        if (selectedValues.includes(optionValue)) {
            const newValues = selectedValues.filter(v => v !== optionValue);
            setSelectedValues(newValues);
            onChange(newValues);
            setError('');
        } 
        // Nếu chưa chọn và chưa đạt giới hạn, thêm vào
        else if (!maxSelections || selectedValues.length < maxSelections) {
            const newValues = [...selectedValues, optionValue];
            setSelectedValues(newValues);
            onChange(newValues);
            setError('');
        } 
        // Nếu đã đạt giới hạn, hiển thị thông báo lỗi
        else {
            setError(`Bạn chỉ được chọn tối đa ${maxSelections} mục`);
        }
        
        // Giữ focus trên input sau khi chọn
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const removeTag = (tagValue, e) => {
        e.stopPropagation();
        const newValues = selectedValues.filter(v => v !== tagValue);
        setSelectedValues(newValues);
        onChange(newValues);
        setError('');
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    const handleContainerClick = () => {
        if (!loading) {
            if (inputRef.current) {
                inputRef.current.focus();
            }
            setIsOpen(true);
        }
    };

    return (
        <div className="multi-select-container" ref={dropdownRef} onClick={handleContainerClick}>
            <div className="multi-select-input">
                {loading ? (
                    <div className="loading-message">Đang tải...</div>
                ) : (
                    <>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={selectedValues.length === 0 ? placeholder : "Tìm kiếm..."}
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={() => setIsOpen(true)}
                            className="search-input"
                        />
                        <div className="tags-container">
                            {selectedValues.map(value => {
                                const option = options.find(opt => opt.value === value);
                                return (
                                    <div key={value} className="tag">
                                        {option?.label || value}
                                        <span 
                                            className="tag-remove"
                                            onClick={(e) => removeTag(value, e)}
                                        >
                                            ×
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
            
            {error && <div className="selection-error">{error}</div>}
            
            {isOpen && (
                <div className="options-container">
                    {filteredOptions.length > 0 ? filteredOptions.map(option => (
                        <div
                            key={option.value}
                            className={`option ${selectedValues.includes(option.value) ? 'selected' : ''}`}
                            onClick={() => handleSelect(option.value)}
                        >
                            {option.label}
                        </div>
                    )) : (
                        <div className="option no-options">
                            Không có dữ liệu phù hợp
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ConsultationPage = () => {
    const [formData, setFormData] = useState({
        admissionMethod: '',
        tohopthi: 'TN', // Mặc định là khối Tự nhiên
        scores: {
            thpt: {  // điểm thi THPT
                math: 0,
                literature: 0,
                foreignLanguage: 0,
                physics: 0,
                chemistry: 0,
                biology: 0,
                history: 0,
                geography: 0,
                civics: 0
            },
            hocba: {  // điểm học bạ
                grade10: {
                    semester1: { ...initializeSubjectScores() },
                    semester2: { ...initializeSubjectScores() },
                    yearAverage: { ...initializeSubjectScores() }
                },
                grade11: {
                    semester1: { ...initializeSubjectScores() },
                    semester2: { ...initializeSubjectScores() },
                    yearAverage: { ...initializeSubjectScores() }
                },
                grade12: {
                    semester1: { ...initializeSubjectScores() },
                    semester2: { ...initializeSubjectScores() },
                    yearAverage: { ...initializeSubjectScores() }
                }
            },
            dgnl: 0,  // điểm đánh giá năng lực
        },
        transcriptMethod: '',  // phương thức xét học bạ
        examBlocks: [],
        interests: [],
        locations: [],
        universities: [],
        majors: []
    });

    // Khởi tạo điểm các môn với giá trị 0
    function initializeSubjectScores() {
        return {
            math: 0,
            literature: 0,
            foreignLanguage: 0,
            physics: 0,
            chemistry: 0,
            biology: 0,
            history: 0,
            geography: 0,
            civics: 0
        };
    }

    // Ánh xạ tên môn học sang tiếng Việt
    const subjectNames = {
        math: 'Toán',
        literature: 'Văn',
        foreignLanguage: 'Ngoại ngữ',
        physics: 'Lý',
        chemistry: 'Hóa',
        biology: 'Sinh',
        history: 'Sử',
        geography: 'Địa',
        civics: 'GDCD'
    };

    // Thêm state để lưu các lỗi validation
    const [validationErrors, setValidationErrors] = useState({});

    const [provinces, setProvinces] = useState([]);
    const [examBlockOptions, setExamBlockOptions] = useState([]);
    const [interestOptions, setInterestOptions] = useState([]);
    const [loading, setLoading] = useState({ 
        examBlocks: false,
        interests: false 
    });
    const [error, setError] = useState({ 
        examBlocks: null,
        interests: null 
    });

    // Thêm state để lưu kết quả gợi ý
    const [recommendations, setRecommendations] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);

    // Thêm biến để lưu thông tin từ MajorRecommendation
    const [probabilityData, setProbabilityData] = useState(null);

    // Fetch provinces
    const fetchProvinces = async () => {
        try {
            const response = await fetch('https://provinces.open-api.vn/api/p/');
            if (!response.ok) {
                throw new Error('Failed to fetch provinces');
            }
            const data = await response.json();
            setProvinces(data);
        } catch (err) {
            setError('Không thể tải danh sách tỉnh thành phố');
            console.error('Error fetching provinces:', err);
        } 
    };

    useEffect(() => {
        fetchProvinces();
    }, []);

    // Fetch subject combinations when component mounts
    useEffect(() => {
        const fetchSubjectCombinations = async () => {
            setLoading(prev => ({ ...prev, examBlocks: true }));
            setError(prev => ({ ...prev, examBlocks: null }));
            try {
                const response = await subjectCombinationService.getAllCombinations();
                // console.log('Subject combinations response:', response);

                if (response && response.success && Array.isArray(response.data)) {
                    // Dữ liệu đã được format đúng từ API, không cần transform lại
                    const options = response.data;
                    // console.log('Subject combinations options:', options);
                    
                    // Sắp xếp tổ hợp môn theo mã
                    options.sort((a, b) => {
                        if (!a.value || !b.value) return 0;
                        return a.value.localeCompare(b.value);
                    });
                    
                    setExamBlockOptions(options);
                } else {
                    throw new Error('Dữ liệu không hợp lệ từ API');
                }
            } catch (err) {
                console.error('Lỗi khi lấy tổ hợp môn:', err);
                setError(prev => ({
                    ...prev,
                    examBlocks: 'Không thể tải danh sách tổ hợp môn: ' + err.message
                }));
            } finally {
                setLoading(prev => ({ ...prev, examBlocks: false }));
            }
        };

        fetchSubjectCombinations();
    }, []);

    // Fetch interests when component mounts
    useEffect(() => {
        const fetchInterests = async () => {
            setLoading(prev => ({ ...prev, interests: true }));
            setError(prev => ({ ...prev, interests: null }));
            try {
                const response = await interestService.getAllInterests();
                if (response.success && Array.isArray(response.data)) {
                    const options = response.data.map(interest => ({
                        value: interest.value,
                        label: interest.value,
                    }));
                    setInterestOptions(options);
                } else {
                    throw new Error('Không thể tải danh sách sở thích');
                }
            } catch (err) {
                console.error('Lỗi khi lấy danh sách sở thích:', err);
                setError(prev => ({
                    ...prev,
                    interests: 'Không thể tải danh sách sở thích'
                }));
            } finally {
                setLoading(prev => ({ ...prev, interests: false }));
            }
        };

        fetchInterests();
    }, []);

    // Xác định các trường điểm cần hiển thị dựa trên phương thức xét học bạ
    const getScoreFields = () => {
        switch (formData.transcriptMethod) {
            case '3years':
                return [
                    { grade: 'grade10', period: 'yearAverage', label: 'Cả năm lớp 10' },
                    { grade: 'grade11', period: 'yearAverage', label: 'Cả năm lớp 11' },
                    { grade: 'grade12', period: 'yearAverage', label: 'Cả năm lớp 12' }
                ];
            case 'grade12':
                return [
                    { grade: 'grade12', period: 'yearAverage', label: 'Cả năm lớp 12' }
                ];
            case '6semesters':
                return [
                    { grade: 'grade10', period: 'semester1', label: 'HK1 lớp 10' },
                    { grade: 'grade10', period: 'semester2', label: 'HK2 lớp 10' },
                    { grade: 'grade11', period: 'semester1', label: 'HK1 lớp 11' },
                    { grade: 'grade11', period: 'semester2', label: 'HK2 lớp 11' },
                    { grade: 'grade12', period: 'semester1', label: 'HK1 lớp 12' },
                    { grade: 'grade12', period: 'semester2', label: 'HK2 lớp 12' }
                ];
            case 'grade10_11_12sem1':
                return [
                    { grade: 'grade10', period: 'yearAverage', label: 'Cả năm lớp 10' },
                    { grade: 'grade11', period: 'yearAverage', label: 'Cả năm lớp 11' },
                    { grade: 'grade12', period: 'semester1', label: 'HK1 lớp 12' }
                ];
            case '3semesters':
                return [
                    { grade: 'grade11', period: 'semester1', label: 'HK1 lớp 11' },
                    { grade: 'grade11', period: 'semester2', label: 'HK2 lớp 11' },
                    { grade: 'grade12', period: 'semester1', label: 'HK1 lớp 12' }
                ];
            case '5semesters':
                return [
                    { grade: 'grade10', period: 'semester1', label: 'HK1 lớp 10' },
                    { grade: 'grade10', period: 'semester2', label: 'HK2 lớp 10' },
                    { grade: 'grade11', period: 'semester1', label: 'HK1 lớp 11' },
                    { grade: 'grade11', period: 'semester2', label: 'HK2 lớp 11' },
                    { grade: 'grade12', period: 'semester1', label: 'HK1 lớp 12' }
                ];
            default:
                return [];
        }
    };

    const handleScoreChange = (type, grade, period, subject, value) => {
        // Giới hạn giá trị từ 0 đến 10
        let validValue = value;
        if (value > 10) validValue = 10;
        if (value < 0) validValue = 0;

        if (type === 'thpt') {
            setFormData(prev => ({
                ...prev,
                scores: {
                    ...prev.scores,
                    thpt: {
                        ...prev.scores.thpt,
                        [subject]: parseFloat(validValue) || 0
                    }
                }
            }));
        } else if (type === 'hocba') {
            setFormData(prev => ({
                ...prev,
                scores: {
                    ...prev.scores,
                    hocba: {
                        ...prev.scores.hocba,
                        [grade]: {
                            ...prev.scores.hocba[grade],
                            [period]: {
                                ...prev.scores.hocba[grade][period],
                                [subject]: parseFloat(validValue) || 0
                            }
                        }
                    }
                }
            }));
        } else if (type === 'dgnl') {
            setFormData(prev => ({
                ...prev,
                scores: {
                    ...prev.scores,
                    dgnl: parseFloat(validValue) || 0
                }
            }));
        }
    };

    const handleMultiSelectChange = (field, values) => {
        setFormData(prev => ({
            ...prev,
            [field]: values
        }));
    };

    const scoreFields = getScoreFields();

    // Hàm kiểm tra điều kiện nhập điểm
    const validateScores = () => {
        const errors = {};
        const thptScores = formData.scores.thpt;
        
        // Kiểm tra điểm Toán và Văn (bắt buộc)
        if (!thptScores.math || thptScores.math <= 0) {
            errors.math = 'Điểm Toán là bắt buộc';
        }
        
        if (!thptScores.literature || thptScores.literature <= 0) {
            errors.literature = 'Điểm Văn là bắt buộc';
        }
        
        // Đếm số môn đã nhập (có điểm > 0)
        const filledSubjects = Object.values(thptScores).filter(score => score > 0).length;
        
        if (filledSubjects < 3) {
            errors.general = 'Vui lòng nhập điểm ít nhất 3 môn (Toán và Văn là bắt buộc)';
        }
        
        return errors;
    };

    const validateSelections = () => {
        const errors = {};
        
        // Kiểm tra tổ hợp môn
        if (!formData.examBlocks || formData.examBlocks.length === 0) {
            errors.examBlocks = 'Vui lòng chọn ít nhất 1 tổ hợp môn';
        } else if (formData.examBlocks.length > 2) {
            errors.examBlocks = 'Vui lòng chọn tối đa 2 tổ hợp môn';
        }
        
        // Kiểm tra sở thích
        if (!formData.interests || formData.interests.length === 0) {
            errors.interests = 'Vui lòng chọn ít nhất 1 sở thích';
        } else if (formData.interests.length > 3) {
            errors.interests = 'Vui lòng chọn tối đa 3 sở thích';
        }
        
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Kiểm tra điều kiện nhập điểm
        const scoreErrors = validateScores();
        const selectionErrors = validateSelections();
        
        const allErrors = { ...scoreErrors, ...selectionErrors };
        
        if (Object.keys(allErrors).length > 0) {
            setValidationErrors(allErrors);
            return;
        }
        
        setValidationErrors({});
        setAiLoading(true);
        setAiError(null);

        try {
            // Chuẩn bị dữ liệu gửi đi theo cấu trúc gốc
            const requestData = {
                scores: {
                    Toan: formData.scores.thpt.math || 0,
                    NguVan: formData.scores.thpt.literature || 0,
                    NgoaiNgu: formData.scores.thpt.foreignLanguage || 0,
                    VatLy: formData.scores.thpt.physics || 0,
                    HoaHoc: formData.scores.thpt.chemistry || 0,
                    SinhHoc: formData.scores.thpt.biology || 0,
                    LichSu: formData.scores.thpt.history || 0,
                    DiaLy: formData.scores.thpt.geography || 0,
                    GDCD: formData.scores.thpt.civics || 0
                },
                interests: formData.interests,
                subject_groups: formData.examBlocks || [],
                tohopthi: formData.tohopthi // Thêm khối thi vào request
            };
            
            // Tạo một bản sao của điểm đã xử lý để sử dụng sau
            const processedScores = {
                Toan: parseFloat(formData.scores.thpt.math) || 0,
                NguVan: parseFloat(formData.scores.thpt.literature) || 0,
                NgoaiNgu: parseFloat(formData.scores.thpt.foreignLanguage) || 0,
                VatLy: parseFloat(formData.scores.thpt.physics) || 0,
                HoaHoc: parseFloat(formData.scores.thpt.chemistry) || 0,
                SinhHoc: parseFloat(formData.scores.thpt.biology) || 0,
                LichSu: parseFloat(formData.scores.thpt.history) || 0,
                DiaLy: parseFloat(formData.scores.thpt.geography) || 0,
                GDCD: parseFloat(formData.scores.thpt.civics) || 0
            };
            
            log("Form data:", formData, 'PREDICTIONS');
            
            log("Đang gọi API với dữ liệu:", requestData, 'API_CALLS');
            log("Điểm đã được xử lý để sử dụng sau:", processedScores, 'API_CALLS');
            
            // Gọi API gợi ý ngành học 
            const response = await aiService.recommendMajors(requestData);
            log("AI response:", response, 'API_RESPONSES');
            
            if (response && response.recommendations) {
                setRecommendations({
                    data: response.recommendations,
                    scores: processedScores, // Lưu điểm đã xử lý cùng với recommendations
                    _id: response._id // Lưu _id từ response API
                });
            } else {
                throw new Error("Không nhận được kết quả gợi ý từ hệ thống AI");
            }
        } catch (error) {
            logError('Lỗi khi gửi dữ liệu:', error);
            setAiError('Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.');
        } finally {
            setAiLoading(false);
        }
    };

    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (newValue) => {
        setTabValue(newValue);
    };

    // Hàm để chuyển tab và truyền dữ liệu từ MajorRecommendation
    const switchConsultationTab = (tabIndex, data = null) => {
        setTabValue(tabIndex);
        
        if (tabIndex === 1 && data) {
            setProbabilityData(data);
        }
    };
    
    // Gắn hàm này vào window để component con có thể truy cập
    useEffect(() => {
        window.switchConsultationTab = switchConsultationTab;
        
        // Cleanup khi component unmount
        return () => {
            delete window.switchConsultationTab;
        };
    }, []);

    return (
        <div className="consultation-container">
            <h1>Tra cứu ngành học phù hợp</h1>
            <div className="consultation-description">
                <p>Đề án tuyển sinh năm 2025 của tất cả các trường đại học, học viện trên cả nước, được Tuyensinhthongminh 
                   cập nhật liên tục những thông tin mới nhất về phương thức xét tuyển, chỉ tiêu, ngành, khối xét tuyển của các 
                   trường Đại học trên cả nước giúp học sinh chuẩn bị tốt cho kỳ thi tốt nghiệp THPT và xét tuyển vào Đại học.</p>
            </div>

            <CustomTabs value={tabValue} onChange={handleTabChange}>
              <CustomTab label="Gợi ý ngành học (AI)" />
              <CustomTab label="Dự đoán xác suất đậu (AI)" />
            </CustomTabs>

            <TabPanel value={tabValue} index={0}>
                {!recommendations ? (
                    <form onSubmit={handleSubmit} className="consultation-form" style={{ overflow: 'visible' }}>
                        <div className="form-step">
                            <h3>Bước 1. Em hãy chọn phương thức xét tuyển</h3>
                            <select 
                                value={formData.admissionMethod}
                                onChange={(e) => {
                                    handleMultiSelectChange('admissionMethod', e.target.value);
                                    if (e.target.value !== 'hocba') {
                                        handleMultiSelectChange('transcriptMethod', '');
                                    }
                                }}
                            >
                                <option value="">Chọn phương thức xét tuyển</option>
                                <option value="thpt">Xét điểm thi THPT</option>
                                {/* <option value="hocba">Xét điểm học bạ</option>
                                <option value="dgnl">Xét điểm đánh giá năng lực</option> */}
                            </select>

                            {formData.admissionMethod === 'hocba' && (
                                <div className="transcript-method">
                                    <h4>Chọn phương thức xét học bạ:</h4>
                                    <select 
                                        value={formData.transcriptMethod}
                                        onChange={(e) => handleMultiSelectChange('transcriptMethod', e.target.value)}
                                    >
                                        <option value="">Chọn phương thức xét học bạ</option>
                                        <option value="3years">Xét học bạ 3 năm</option>
                                        <option value="grade12">Xét học bạ cả năm lớp 12</option>
                                        <option value="6semesters">Xét học bạ 6 học kỳ</option>
                                        <option value="grade10_11_12sem1">Xét học bạ lớp 10, lớp 11, HK1 lớp 12</option>
                                        <option value="3semesters">Xét học bạ 3 học kỳ</option>
                                        <option value="5semesters">Xét học bạ 5 học kỳ</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="form-step">
                            <h3>Bước 2. Chọn khối thi</h3>
                            <select 
                                value={formData.tohopthi}
                                onChange={(e) => handleMultiSelectChange('tohopthi', e.target.value)}
                            >
                                <option value="TN">Khối Tự nhiên</option>
                                <option value="XH">Khối Xã hội</option>
                            </select>
                        </div>

                        <div className="form-step">
                            <h3>Bước 3. Nhập điểm số (Tối thiểu 3 môn, Toán và Văn bắt buộc)</h3>
                            {formData.admissionMethod === 'thpt' && (
                                <div className="scores-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Môn thi</th>
                                                <th>Điểm số</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(subjectNames).map(([subject, vietnameseName]) => (
                                                <tr key={subject} className={validationErrors[subject] ? 'error-row' : ''}>
                                                    <td>{vietnameseName}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="10"
                                                            step="0.1"
                                                            value={formData.scores.thpt[subject]}
                                                            onChange={(e) => handleScoreChange('thpt', null, null, subject, e.target.value)}
                                                            onClick={(e) => e.target.select()}
                                                            className={validationErrors[subject] ? 'error' : ''}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                </div>
                            )}

                            {formData.admissionMethod === 'hocba' && formData.transcriptMethod && (
                                <div className="scores-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Môn học</th>
                                                {scoreFields.map((field, index) => (
                                                    <th key={index}>{field.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(subjectNames).map(([subject, vietnameseName]) => (
                                                <tr key={subject}>
                                                    <td>{vietnameseName}</td>
                                                    {scoreFields.map((field, index) => (
                                                        <td key={index}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="10"
                                                                step="0.1"
                                                                value={formData.scores.hocba[field.grade][field.period][subject]}
                                                                onChange={(e) => handleScoreChange('hocba', field.grade, field.period, subject, e.target.value)}
                                                                onClick={(e) => e.target.select()}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {formData.admissionMethod === 'dgnl' && (
                                <div className="scores-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Điểm đánh giá năng lực</th>
                                                <th>Điểm số</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Điểm ĐGNL</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="1200"
                                                        step="1"
                                                        value={formData.scores.dgnl}
                                                        onChange={(e) => handleScoreChange('dgnl', null, null, null, e.target.value)}
                                                        onClick={(e) => e.target.select()}
                                                    />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                          {validationErrors.general && (
                                        <div className="error-message">{validationErrors.general}</div>
                                    )}
                        </div>

                        <div className="form-step" style={{ overflow: 'visible', position: 'relative' }}>
                            <h3>Bước 4. Chọn tổ hợp thi bạn mong muốn</h3>
                            <div className="selection-hint">Chọn từ 1-2 tổ hợp môn</div>
                            {loading.examBlocks ? (
                                <div className="loading-message">Đang tải danh sách tổ hợp thi...</div>
                            ) : error.examBlocks ? (
                                <div className="error-message">
                                    {error.examBlocks}
                                    <button 
                                        onClick={() => window.location.reload()} 
                                        style={{
                                            marginLeft: '10px', 
                                            padding: '5px 10px', 
                                            background: '#f44336', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {examBlockOptions.length === 0 ? (
                                        <div className="error-message">
                                            Không có dữ liệu tổ hợp thi. Vui lòng thử lại sau.
                                            <button 
                                                onClick={() => window.location.reload()} 
                                                style={{
                                                    marginLeft: '10px', 
                                                    padding: '5px 10px', 
                                                    background: '#f44336', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Thử lại
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative', overflow: 'visible' }}>
                                            <MultiSelect
                                                options={examBlockOptions}
                                                value={formData.examBlocks}
                                                onChange={(values) => handleMultiSelectChange('examBlocks', values)}
                                                placeholder="Chọn tổ hợp môn"
                                                loading={loading.examBlocks}
                                                maxSelections={2}
                                            />
                                            {validationErrors.examBlocks && (
                                                <div className="selection-error">{validationErrors.examBlocks}</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="form-step" style={{ overflow: 'visible', position: 'relative' }}>
                            <h3>Bước 5. Chọn sở thích</h3>
                            <div className="selection-hint">Chọn từ 1-3 sở thích</div>
                            {loading.interests ? (
                                <div className="loading-message">Đang tải danh sách sở thích...</div>
                            ) : error.interests ? (
                                <div className="error-message">
                                    {error.interests}
                                    <button 
                                        onClick={() => window.location.reload()} 
                                        style={{
                                            marginLeft: '10px', 
                                            padding: '5px 10px', 
                                            background: '#f44336', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {interestOptions.length === 0 ? (
                                        <div className="error-message">
                                            Không có dữ liệu sở thích. Vui lòng thử lại sau.
                                            <button 
                                                onClick={() => window.location.reload()} 
                                                style={{
                                                    marginLeft: '10px', 
                                                    padding: '5px 10px', 
                                                    background: '#f44336', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Thử lại
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative', overflow: 'visible' }}>
                                            <MultiSelect
                                                options={interestOptions}
                                                value={formData.interests}
                                                onChange={(values) => handleMultiSelectChange('interests', values)}
                                                placeholder="Chọn lĩnh vực bạn yêu thích"
                                                loading={loading.interests}
                                                maxSelections={3}
                                            />
                                            {validationErrors.interests && (
                                                <div className="selection-error">{validationErrors.interests}</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="form-step">
                            <h3>Bước 6. Nhấn nút để gợi ý ngành học</h3>
                            <button 
                                type="submit" 
                                className="submit-button"
                                disabled={aiLoading}
                            >
                                {aiLoading ? "Đang xử lý..." : "Gợi ý ngành học"}
                            </button>
                        </div>
                        
                        {aiError && (
                            <div className="error-message">
                                {aiError}
                            </div>
                        )}
                    </form>
                ) : (
                    <div className="ai-results-container">
                        <MajorRecommendation 
                            initialRecommendations={recommendations.data} 
                            studentScores={recommendations.scores}
                            predictionId={recommendations._id}
                        />
                        <button 
                            className="back-button"
                            onClick={() => setRecommendations(null)}
                        >
                            Quay lại điền thông tin
                        </button>
                    </div>
                )}
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
                <AdmissionProbability initialData={probabilityData} />
            </TabPanel>
        </div>
    );
};

export default ConsultationPage;

// Thêm CSS mới cho giao diện nhập điểm
const styles = document.createElement('style');
styles.textContent = `
.scores-table {
    margin-bottom: 20px;
    overflow-x: auto;
}

.scores-table table {
    width: 100%;
    border-collapse: collapse;
}

.scores-table th, .scores-table td {
    padding: 10px;
    border: 1px solid #ddd;
    text-align: left;
}

.scores-table th {
    background-color: #f2f2f2;
    font-weight: 600;
}

.scores-table input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
}

.scores-table input.error {
    border-color: #f44336;
}

.error-row td {
    color: #f44336;
}

.error-message {
    color: #f44336;
    margin-top: 10px;
    font-weight: 500;
}

/* Khôi phục dấu * màu đỏ cho các tiêu đề trong form */
.consultation-form h3:after {
    content: " *";
    color: #f44336;
}
`;
document.head.appendChild(styles);
