import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { universityService } from '../../services/api';
import './UniversityDetail.css';

const UniversityDetail = () => {
    const { code } = useParams();
    const [university, setUniversity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUniversityDetails();
    }, [code]);

    const fetchUniversityDetails = async () => {
        try {
            setLoading(true);
            const response = await universityService.getUniversity(code);
            setUniversity(response.data);
        } catch (err) {
            setError('Không thể tải thông tin trường. Vui lòng thử lại sau.');
            console.error('Error fetching university details:', err);
        } finally {
            setLoading(false);
        }
    };

    // Nhóm các ngành theo phương thức xét tuyển
    const groupBenchmarksByType = () => {
        if (!university?.benchmarks) return {};
        
        return university.benchmarks.reduce((acc, benchmark) => {
            const type = benchmark.method;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(benchmark);
            return acc;
        }, {});
    };

    if (loading) return <div className="loading">Đang tải thông tin...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!university) return <div className="not-found">Không tìm thấy thông tin trường</div>;

    const benchmarksByType = groupBenchmarksByType();

    return (
        <div className="university-detail">
            <h1>ĐIỂM CHUẨN {university.name.toUpperCase()} NĂM 2024</h1>
            
            {Object.entries(benchmarksByType).map(([type, benchmarks], index) => (
                <div key={index} className="admission-method">
                    <h2>{type}</h2>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Mã ngành</th>
                                    <th>Tên ngành</th>
                                    <th>Tổ hợp môn</th>
                                    <th>Điểm chuẩn</th>
                                    <th>Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {benchmarks.map((benchmark, idx) => (
                                    <tr key={`${benchmark.majorCode}-${benchmark.subjectGroup}`}>
                                        <td>{idx + 1}</td>
                                        <td>{benchmark.majorCode}</td>
                                        <td>{benchmark.majorName}</td>
                                        <td>{benchmark.subjectGroup}</td>
                                        <td>{benchmark.score}</td>
                                        <td>{benchmark.note || ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default UniversityDetail; 