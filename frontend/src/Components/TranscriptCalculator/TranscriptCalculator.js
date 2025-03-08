import React, { useState, useEffect } from 'react';
import './TranscriptCalculator.css';

const TranscriptCalculator = () => {
    // Danh sách 36 tổ hợp môn
    const subjectCombinations = {
        'A00': ['mathematics', 'physics', 'chemistry'],
        'A01': ['mathematics', 'physics', 'english'],
        'A02': ['mathematics', 'physics', 'biology'],
        'A03': ['mathematics', 'physics', 'history'],
        'A04': ['mathematics', 'physics', 'geography'],
        'A05': ['mathematics', 'chemistry', 'history'],
        'A06': ['mathematics', 'chemistry', 'geography'],
        'A07': ['mathematics', 'history', 'geography'],
        'A08': ['mathematics', 'literature', 'english'],
        'A09': ['mathematics', 'literature', 'history'],
        'A10': ['mathematics', 'literature', 'geography'],
        'B00': ['mathematics', 'biology', 'chemistry'],
        'B02': ['mathematics', 'biology', 'geography'],
        'B03': ['mathematics', 'biology', 'literature'],
        'B04': ['mathematics', 'biology', 'english'],
        'B08': ['mathematics', 'biology', 'history'],
        'C00': ['literature', 'history', 'geography'],
        'C01': ['literature', 'mathematics', 'physics'],
        'C02': ['literature', 'mathematics', 'chemistry'],
        'C03': ['literature', 'mathematics', 'history'],
        'C04': ['literature', 'mathematics', 'geography'],
        'C08': ['literature', 'chemistry', 'biology'],
        'C14': ['literature', 'english', 'history'],
        'C19': ['literature', 'history', 'civics'],
        'C20': ['literature', 'geography', 'civics'],
        'D01': ['literature', 'mathematics', 'english'],
        'D07': ['mathematics', 'chemistry', 'english'],
        'D08': ['mathematics', 'biology', 'english'],
        'D09': ['mathematics', 'history', 'english'],
        'D10': ['mathematics', 'geography', 'english'],
        'D11': ['literature', 'physics', 'english'],
        'D13': ['literature', 'biology', 'english'],
        'D14': ['literature', 'chemistry', 'english'],
        'D15': ['literature', 'geography', 'english'],
        'D66': ['literature', 'geography', 'english'],
        'D84': ['literature', 'civics', 'english'],
        'K01': ['mathematics', 'chemistry', 'english']
    };

    // Đối tượng và khu vực
    const priorityPoints = {
        'KV1': 0.75,
        'KV2': 0.25,
        'KV2-NT': 0.5,
        'KV3': 0,
        'D1': 2.0,
        'D2-NT': 1.5,
        'D2': 1.0,
        'D3': 1.0,
        'D4': 0.5,
        'D5': 1.0,
        'D6': 1.0,
        'D7': 0.5
    };

    const [formData, setFormData] = useState({
        calculationMethod: '',
        transcriptMethod: '',
        areaCode: 'KV3',
        priorityCode: '',
        scores: {}
    });

    const [subjectNames, setSubjectNames] = useState({
        'mathematics': 'Toán',
        'literature': 'Ngữ văn',
        'physics': 'Vật lý',
        'chemistry': 'Hóa học',
        'biology': 'Sinh học',
        'history': 'Lịch sử',
        'geography': 'Địa lý',
        'english': 'Tiếng Anh',
        'civics': 'GDCD'
    });

    const [result, setResult] = useState({
        validCombinations: [],
        calculationExplanation: ''
    });

    useEffect(() => {
        // Khởi tạo điểm số ban đầu
        const scores = initializeSubjectScores();
        setFormData(prev => ({ ...prev, scores }));
    }, []);

    function initializeSubjectScores() {
        const scores = {
            'grade10': { 
                'full': {},
                'semester1': {}, 
                'semester2': {} 
            },
            'grade11': { 
                'full': {},
                'semester1': {}, 
                'semester2': {} 
            },
            'grade12': { 
                'full': {},
                'semester1': {}, 
                'semester2': {} 
            }
        };

        // Khởi tạo tất cả môn học với điểm trống
        Object.keys(subjectNames).forEach(subject => {
            scores['grade10']['full'][subject] = '';
            scores['grade11']['full'][subject] = '';
            scores['grade12']['full'][subject] = '';
            scores['grade10']['semester1'][subject] = '';
            scores['grade10']['semester2'][subject] = '';
            scores['grade11']['semester1'][subject] = '';
            scores['grade11']['semester2'][subject] = '';
            scores['grade12']['semester1'][subject] = '';
            scores['grade12']['semester2'][subject] = '';
        });

        return scores;
    }

    const handleScoreChange = (grade, period, subject, value) => {
        // Kiểm tra nếu giá trị không phải là số, để trống
        if (value === '') {
            setFormData(prev => {
                const newScores = { ...prev.scores };
                newScores[grade][period][subject] = '';
                return { ...prev, scores: newScores };
            });
            return;
        }

        // Kiểm tra giá trị nhập vào có phải là số hợp lệ không
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 10) {
            return;
        }

        setFormData(prev => {
            const newScores = { ...prev.scores };
            newScores[grade][period][subject] = value;
            return { ...prev, scores: newScores };
        });
    };

    const handleSelectChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Reset kết quả khi thay đổi phương thức
        if (field === 'calculationMethod' || field === 'transcriptMethod') {
            setResult({
                validCombinations: [],
                calculationExplanation: ''
            });
        }
    };

    const getScoreFields = () => {
        const method = formData.transcriptMethod;
        if (!method) return [];

        switch (method) {
            case '3years':
                return [
                    { grade: 'grade10', period: 'full', label: 'Cả năm lớp 10' },
                    { grade: 'grade11', period: 'full', label: 'Cả năm lớp 11' },
                    { grade: 'grade12', period: 'full', label: 'Cả năm lớp 12' }
                ];
            case 'grade12':
                return [
                    { grade: 'grade12', period: 'full', label: 'Cả năm lớp 12' }
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
                    { grade: 'grade10', period: 'full', label: 'Cả năm lớp 10' },
                    { grade: 'grade11', period: 'full', label: 'Cả năm lớp 11' },
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

    // Hàm tính điểm trung bình của một môn học
    const calculateSubjectAverage = (subject) => {
        const method = formData.transcriptMethod;
        const scores = formData.scores;
        let validScores = [];

        if (method === '3years') {
            if (scores['grade10']['full'][subject] !== '') 
                validScores.push(parseFloat(scores['grade10']['full'][subject]));
            if (scores['grade11']['full'][subject] !== '') 
                validScores.push(parseFloat(scores['grade11']['full'][subject]));
            if (scores['grade12']['full'][subject] !== '') 
                validScores.push(parseFloat(scores['grade12']['full'][subject]));
        } else if (method === 'grade12') {
            if (scores['grade12']['full'][subject] !== '') 
                validScores.push(parseFloat(scores['grade12']['full'][subject]));
        } else if (method === '6semesters') {
            if (scores['grade10']['semester1'][subject] !== '') 
                validScores.push(parseFloat(scores['grade10']['semester1'][subject]));
            if (scores['grade10']['semester2'][subject] !== '') 
                validScores.push(parseFloat(scores['grade10']['semester2'][subject]));
            if (scores['grade11']['semester1'][subject] !== '') 
                validScores.push(parseFloat(scores['grade11']['semester1'][subject]));
            if (scores['grade11']['semester2'][subject] !== '') 
                validScores.push(parseFloat(scores['grade11']['semester2'][subject]));
            if (scores['grade12']['semester1'][subject] !== '') 
                validScores.push(parseFloat(scores['grade12']['semester1'][subject]));
            if (scores['grade12']['semester2'][subject] !== '') 
                validScores.push(parseFloat(scores['grade12']['semester2'][subject]));
        } else if (method === 'grade10_11_12sem1') {
            if (scores['grade10']['full'][subject] !== '') 
                validScores.push(parseFloat(scores['grade10']['full'][subject]));
            if (scores['grade11']['full'][subject] !== '') 
                validScores.push(parseFloat(scores['grade11']['full'][subject]));
            if (scores['grade12']['semester1'][subject] !== '') 
                validScores.push(parseFloat(scores['grade12']['semester1'][subject]));
        } else if (method === '3semesters') {
            if (scores['grade11']['semester1'][subject] !== '') 
                validScores.push(parseFloat(scores['grade11']['semester1'][subject]));
            if (scores['grade11']['semester2'][subject] !== '') 
                validScores.push(parseFloat(scores['grade11']['semester2'][subject]));
            if (scores['grade12']['semester1'][subject] !== '') 
                validScores.push(parseFloat(scores['grade12']['semester1'][subject]));
        } else if (method === '5semesters') {
            if (scores['grade10']['semester1'][subject] !== '') 
                validScores.push(parseFloat(scores['grade10']['semester1'][subject]));
            if (scores['grade10']['semester2'][subject] !== '') 
                validScores.push(parseFloat(scores['grade10']['semester2'][subject]));
            if (scores['grade11']['semester1'][subject] !== '') 
                validScores.push(parseFloat(scores['grade11']['semester1'][subject]));
            if (scores['grade11']['semester2'][subject] !== '') 
                validScores.push(parseFloat(scores['grade11']['semester2'][subject]));
            if (scores['grade12']['semester1'][subject] !== '') 
                validScores.push(parseFloat(scores['grade12']['semester1'][subject]));
        }

        // Nếu không có điểm hợp lệ, trả về null
        if (validScores.length === 0) return null;

        // Tính trung bình và làm tròn đến 2 chữ số thập phân
        const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
        return Math.round(average * 100) / 100;
    };

    // Hàm tính điểm ưu tiên
    const calculatePriorityPoints = (totalScore) => {
        let areaPoints = priorityPoints[formData.areaCode] || 0;
        let objectPoints = priorityPoints[formData.priorityCode] || 0;
        let totalPriorityPoints = areaPoints + objectPoints;

        // Nếu tổng điểm >= 22.5 thì áp dụng công thức đặc biệt
        if (totalScore >= 22.5) {
            totalPriorityPoints = ((30 - totalScore) / 7.5) * totalPriorityPoints;
        }

        return Math.round(totalPriorityPoints * 100) / 100;
    };

    // Hàm tính điểm tổ hợp
    const calculateCombinationScore = (combination) => {
        const subjects = subjectCombinations[combination];
        const subjectScores = subjects.map(subject => calculateSubjectAverage(subject));
        
        // Nếu có bất kỳ môn nào không có điểm, trả về null
        if (subjectScores.includes(null)) return null;

        // Tính tổng điểm của tổ hợp và làm tròn đến 2 chữ số thập phân
        const totalScore = subjectScores.reduce((sum, score) => sum + score, 0);
        return Math.round(totalScore * 100) / 100;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Kiểm tra số lượng môn học có điểm
        let subjectsWithScores = 0;
        Object.keys(subjectNames).forEach(subject => {
            const avg = calculateSubjectAverage(subject);
            if (avg !== null) subjectsWithScores++;
        });

        // Nếu có ít hơn 3 môn có điểm, hiển thị cảnh báo
        if (subjectsWithScores < 3) {
            setResult({
                validCombinations: [],
                calculationExplanation: 'Bạn cần nhập điểm ít nhất 3 môn học để tính kết quả.'
            });
            return;
        }

        // Tính điểm cho tất cả các tổ hợp môn
        const validResults = [];
        Object.keys(subjectCombinations).forEach(combination => {
            const score = calculateCombinationScore(combination);
            if (score !== null) {
                const priorityPoints = calculatePriorityPoints(score);
                validResults.push({
                    combination,
                    score,
                    priorityPoints
                });
            }
        });

        // Sắp xếp kết quả theo điểm từ cao đến thấp
        validResults.sort((a, b) => b.score - a.score);

        setResult({
            validCombinations: validResults,
            calculationExplanation: validResults.length > 0 
                ? `Đã tính toán ${validResults.length} tổ hợp môn.` 
                : 'Không tìm thấy tổ hợp nào đủ điều kiện.'
        });
    };

    const scoreFields = getScoreFields();

    return (
        <div className="transcript-calculator">
            <h1>Tính điểm xét học bạ THPT</h1>
            <p className="calculator-intro">
                Công cụ tính điểm xét học bạ THPT giúp học sinh dự đoán điểm xét tuyển
                học bạ vào các trường đại học, cao đẳng. Hệ thống sẽ tính toán điểm
                tổ hợp 3 môn dựa trên phương thức xét tuyển bạn chọn.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="form-step">
                    <h3>1. Chọn phương thức tính điểm học bạ</h3>
                    <select 
                        value={formData.transcriptMethod} 
                        onChange={(e) => handleSelectChange('transcriptMethod', e.target.value)}
                        required
                    >
                        <option value="">-- Chọn phương thức --</option>
                        <option value="3years">Xét học bạ 3 năm</option>
                        <option value="grade12">Xét học bạ cả năm lớp 12</option>
                        <option value="6semesters">Xét học bạ 6 học kỳ</option>
                        <option value="grade10_11_12sem1">Xét học bạ lớp 10, lớp 11, HK1 lớp 12</option>
                        <option value="3semesters">Xét học bạ 3 học kỳ (HK1, HK2 lớp 11, HK1 lớp 12)</option>
                        <option value="5semesters">Xét học bạ 5 học kỳ (HK1, HK2 lớp 10, HK1, HK2 lớp 11, HK1 lớp 12)</option>
                    </select>
                </div>

                <div className="form-step">
                    <h3>2. Chọn khu vực ưu tiên và đối tượng ưu tiên</h3>
                    <div className="dropdowns-container">
                        <select 
                            value={formData.areaCode} 
                            onChange={(e) => handleSelectChange('areaCode', e.target.value)}
                            required
                        >
                            <option value="KV3">KV3 - Khu vực 3</option>
                            <option value="KV2">KV2 - Khu vực 2</option>
                            <option value="KV2-NT">KV2-NT - Khu vực 2 nông thôn</option>
                            <option value="KV1">KV1 - Khu vực 1</option>
                        </select>
                        <select 
                            value={formData.priorityCode} 
                            onChange={(e) => handleSelectChange('priorityCode', e.target.value)}
                        >
                            <option value="">Không thuộc đối tượng ưu tiên</option>
                            <option value="D1">D1 - Đối tượng 1</option>
                            <option value="D2-NT">D2-NT - Đối tượng 2 (Người dân tộc thiểu số)</option>
                            <option value="D2">D2 - Đối tượng 2</option>
                            <option value="D3">D3 - Đối tượng 3</option>
                            <option value="D4">D4 - Đối tượng 4</option>
                            <option value="D5">D5 - Đối tượng 5</option>
                            <option value="D6">D6 - Đối tượng 6</option>
                            <option value="D7">D7 - Đối tượng 7</option>
                        </select>
                    </div>
                </div>

                {formData.transcriptMethod && (
                    <div className="form-step">
                        <h3>3. Nhập điểm học bạ</h3>
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
                                                        value={formData.scores[field.grade][field.period][subject]}
                                                        onChange={(e) => handleScoreChange(field.grade, field.period, subject, e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <button type="submit" className="calculate-button">Tính điểm</button>
            </form>

            {result.validCombinations.length > 0 && (
                <div className="result-section">
                    <h2>Kết quả tính điểm</h2>
                    <p className="result-info">{result.calculationExplanation}</p>
                    
                    <div className="result-tables">
                        <table className="result-table">
                            <thead>
                                <tr>
                                    <th>Khối</th>
                                    <th>Điểm</th>
                                    <th>Điểm ƯT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.validCombinations.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.combination}</td>
                                        <td>{item.score}</td>
                                        <td>{item.priorityPoints}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {result.validCombinations.length === 0 && result.calculationExplanation && (
                <div className="result-section">
                    <h2>Kết quả tính điểm</h2>
                    <p className="result-info">{result.calculationExplanation}</p>
                </div>
            )}
        </div>
    );
};

export default TranscriptCalculator; 