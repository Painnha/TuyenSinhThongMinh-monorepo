import React, { useState, useEffect, useRef } from 'react';
import { subjectCombinationService } from '../../services/api';
import './ConsultationPage.css';

const MultiSelect = ({ options, value, onChange, placeholder, loading }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValues, setSelectedValues] = useState(value || []);
    const dropdownRef = useRef(null);

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

    const handleSelect = (optionValue) => {
        const newValues = selectedValues.includes(optionValue)
            ? selectedValues.filter(v => v !== optionValue)
            : [...selectedValues, optionValue];
        setSelectedValues(newValues);
        onChange(newValues);
    };

    const removeTag = (tagValue, e) => {
        e.stopPropagation();
        const newValues = selectedValues.filter(v => v !== tagValue);
        setSelectedValues(newValues);
        onChange(newValues);
    };

    return (
        <div className="multi-select-container" ref={dropdownRef}>
            <div 
                className="multi-select-input" 
                onClick={() => !loading && setIsOpen(!isOpen)}
            >
                {loading ? (
                    <div className="loading-message">Đang tải...</div>
                ) : selectedValues.length === 0 ? (
                    <div className="placeholder">{placeholder}</div>
                ) : (
                    <div className="tags-container">
                        {selectedValues.map(value => {
                            const option = options.find(opt => opt.value === value);
                            return (
                                <div key={value} className="tag">
                                    {option?.label}
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
                )}
            </div>
            {isOpen && !loading && (
                <div className="options-container">
                    {options.map(option => (
                        <div
                            key={option.value}
                            className={`option ${selectedValues.includes(option.value) ? 'selected' : ''}`}
                            onClick={() => handleSelect(option.value)}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ConsultationPage = () => {
    const [formData, setFormData] = useState({
        admissionMethod: '',
        priorityObject: '',
        priorityArea: '',
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
                civics: 0,
                informatics: 0,
                technology: 0
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
            civics: 0,
            informatics: 0,
            technology: 0
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
        civics: 'GDKT & PL',
        informatics: 'Tin học',
        technology: 'Công nghệ'
    };

    // Định nghĩa các options cho sở thích
    const interestOptions = [
        { value: 'technology', label: 'Công nghệ thông tin' },
        { value: 'business', label: 'Kinh tế - Kinh doanh' },
        { value: 'engineering', label: 'Kỹ thuật - Công nghệ' },
        { value: 'medical', label: 'Y - Dược' },
        { value: 'education', label: 'Sư phạm - Giáo dục' },
        { value: 'art', label: 'Nghệ thuật - Thiết kế' },
        { value: 'social', label: 'Khoa học xã hội' },
        { value: 'natural', label: 'Khoa học tự nhiên' }
    ];

    const [provinces, setProvinces] = useState([]);
    const [examBlockOptions, setExamBlockOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProvinces = async () => {
            setLoading(true);
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
            } finally {
                setLoading(false);
            }
        };

        fetchProvinces();
    }, []);

    // Fetch subject combinations when component mounts
    useEffect(() => {
        const fetchSubjectCombinations = async () => {
            setLoading(true);
            try {
                const data = await subjectCombinationService.getAllCombinations();
                // Transform data for MultiSelect component
                const options = data.map(combo => ({
                    value: combo.code,
                    label: `${combo.code} - ${combo.subjects}`,
                    details: {
                        subjects: combo.subjects
                    }
                }));
                setExamBlockOptions(options);
            } catch (err) {
                setError('Không thể tải danh sách tổ hợp môn');
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubjectCombinations();
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
        if (type === 'thpt') {
            setFormData(prev => ({
                ...prev,
                scores: {
                    ...prev.scores,
                    thpt: {
                        ...prev.scores.thpt,
                        [subject]: parseFloat(value) || 0
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
                                [subject]: parseFloat(value) || 0
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
                    dgnl: parseFloat(value) || 0
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

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(formData);
    };

    return (
        <div className="consultation-container">
            <h1>Tra cứu ngành học phù hợp</h1>
            <div className="consultation-description">
                <p>Đề án tuyển sinh năm 2025 của tất cả các trường đại học, học viện trên cả nước, được Tuyensinhthongminh 
                   cập nhật liên tục những thông tin mới nhất về phương thức xét tuyển, chỉ tiêu, ngành, khối xét tuyển của các 
                   trường Đại học trên cả nước giúp học sinh chuẩn bị tốt cho kỳ thi tốt nghiệp THPT và xét tuyển vào Đại học.</p>
            </div>

            <form onSubmit={handleSubmit} className="consultation-form">
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
                        <option value="hocba">Xét điểm học bạ</option>
                        <option value="dgnl">Xét điểm đánh giá năng lực</option>
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
                    <h3>Bước 2. Em chọn đối tượng ưu tiên</h3>
                    <select 
                        value={formData.priorityObject}
                        onChange={(e) => handleMultiSelectChange('priorityObject', e.target.value)}
                    >
                        <option value="">Chọn đối tượng ưu tiên</option>
                        <option value="01">01 - Con liệt sĩ, con thương binh mất sức lao động 81% trở lên</option>
                        <option value="02">02 - Con của người hoạt động kháng chiến bị nhiễm chất độc hóa học</option>
                        <option value="03">03 - Con thương binh, con bệnh binh, con của người được hưởng chính sách như thương binh mất sức lao động dưới 81%</option>
                        <option value="04">04 - Con của người hoạt động cách mạng trước ngày 01/01/1945</option>
                        <option value="05">05 - Con của người hoạt động cách mạng từ 01/01/1945 đến ngày khởi nghĩa tháng Tám năm 1945</option>
                        <option value="07">07 - Người dân tộc thiểu số</option>
                    </select>
                </div>

                <div className="form-step">
                    <h3>Bước 3. Em chọn khu vực ưu tiên</h3>
                    <select 
                        value={formData.priorityArea}
                        onChange={(e) => handleMultiSelectChange('priorityArea', e.target.value)}
                    >
                        <option value="">Chọn khu vực</option>
                        <option value="KV1">KV1 - Khu vực 1</option>
                        <option value="KV2">KV2 - Khu vực 2</option>
                        <option value="KV2-NT">KV2-NT - Khu vực 2 nông thôn</option>
                        <option value="KV3">KV3 - Khu vực 3</option>
                    </select>
                </div>

                <div className="form-step">
                    <h3>Bước 4. Nhập điểm số</h3>
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
                                        <tr key={subject}>
                                            <td>{vietnameseName}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="10"
                                                    step="0.1"
                                                    value={formData.scores.thpt[subject]}
                                                    onChange={(e) => handleScoreChange('thpt', null, null, subject, e.target.value)}
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
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="form-step">
                    <h3>Bước 5. Chọn tổ hợp thi bạn mong muốn</h3>
                    {error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <MultiSelect
                            options={examBlockOptions}
                            value={formData.examBlocks}
                            onChange={(values) => handleMultiSelectChange('examBlocks', values)}
                            placeholder="Chọn tổ hợp môn"
                            loading={loading}
                        />
                    )}
                </div>

                <div className="form-step">
                    <h3>Bước 6. Chọn sở thích</h3>
                    <MultiSelect
                        options={interestOptions}
                        value={formData.interests}
                        onChange={(values) => handleMultiSelectChange('interests', values)}
                        placeholder="Chọn lĩnh vực bạn yêu thích"
                    />
                </div>

                <div className="form-step">
                    <h3>Bước 7. Nhập trường, ngành hoặc tỉnh/thành mong muốn (nếu có)</h3>
                    <div className="location-inputs">
                        <MultiSelect
                            options={provinces.map(p => ({ value: p.name, label: p.name }))}
                            value={formData.locations}
                            onChange={(values) => handleMultiSelectChange('locations', values)}
                            placeholder="Chọn Tỉnh/Thành phố"
                        />
                        <div className="custom-input-tags">
                            <input
                                type="text"
                                placeholder="Nhập tên trường/mã trường và nhấn Enter"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        e.preventDefault();
                                        handleMultiSelectChange('universities', [
                                            ...formData.universities,
                                            e.target.value.trim()
                                        ]);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            <div className="tags-container">
                                {formData.universities.map((uni, index) => (
                                    <div key={index} className="tag">
                                        {uni}
                                        <span 
                                            className="tag-remove"
                                            onClick={(e) => {
                                                const newUnis = formData.universities.filter((_, i) => i !== index);
                                                handleMultiSelectChange('universities', newUnis);
                                            }}
                                        >
                                            ×
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="custom-input-tags">
                            <input
                                type="text"
                                placeholder="Nhập ngành/nhóm ngành và nhấn Enter"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        e.preventDefault();
                                        handleMultiSelectChange('majors', [
                                            ...formData.majors,
                                            e.target.value.trim()
                                        ]);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            <div className="tags-container">
                                {formData.majors.map((major, index) => (
                                    <div key={index} className="tag">
                                        {major}
                                        <span 
                                            className="tag-remove"
                                            onClick={(e) => {
                                                const newMajors = formData.majors.filter((_, i) => i !== index);
                                                handleMultiSelectChange('majors', newMajors);
                                            }}
                                        >
                                            ×
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-step">
                    <h3>Bước 8. Nhấn nút Xem kết quả</h3>
                    <button type="submit" className="submit-button">Xem kết quả</button>
                </div>
            </form>
        </div>
    );
};

export default ConsultationPage;
