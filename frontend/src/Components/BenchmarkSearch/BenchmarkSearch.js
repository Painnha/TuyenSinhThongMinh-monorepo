import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { universityService } from '../../services/api';
import './BenchmarkSearch.css';

const BenchmarkSearch = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const cachedData = useRef([]);
    const isInitialMount = useRef(true);

    // Fetch universities with search
    const fetchUniversities = async (search = '') => {
        if (!search && cachedData.current.length > 0) {
            setUniversities(cachedData.current);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (search && search.trim()) {
                params.search = search.trim();
            }

            const response = await universityService.getAllUniversities(params);
            
            if (response && response.success && Array.isArray(response.data)) {
                // Lưu cache khi là lần fetch đầu tiên
                if (!search) {
                    cachedData.current = response.data;
                }

                let filteredData = response.data;
                if (search && search.trim()) {
                    const searchTerm = search.trim().toLowerCase();
                    filteredData = cachedData.current.filter(uni => 
                        uni.code?.toLowerCase().includes(searchTerm) ||
                        uni.name?.toLowerCase().includes(searchTerm)
                    );
                }
                setUniversities(filteredData);
            } else {
                setUniversities([]);
                setError('Không thể tải danh sách trường. Vui lòng thử lại sau.');
            }
        } catch (err) {
            setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
            setUniversities([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search implementation
    const debouncedSearch = useCallback(
        debounce((searchValue) => {
            if (searchValue) {
                // Nếu có từ khóa tìm kiếm và đã có cache, thực hiện tìm kiếm local
                if (cachedData.current.length > 0) {
                    const filteredData = cachedData.current.filter(uni => 
                        uni.code?.toLowerCase().includes(searchValue.toLowerCase()) ||
                        uni.name?.toLowerCase().includes(searchValue.toLowerCase())
                    );
                    setUniversities(filteredData);
                } else {
                    fetchUniversities(searchValue);
                }
            } else {
                // Nếu không có từ khóa, sử dụng cache nếu có
                if (cachedData.current.length > 0) {
                    setUniversities(cachedData.current);
                } else {
                    fetchUniversities();
                }
            }
        }, 300),
        []
    );

    // Initial load - chỉ fetch một lần khi component mount
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            fetchUniversities();
        }
    }, []);

    // Handle search term changes
    useEffect(() => {
        if (!isInitialMount.current && searchTerm !== undefined) {
            debouncedSearch(searchTerm);
        }
    }, [searchTerm, debouncedSearch]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (typeof debouncedSearch.cancel === 'function') {
                debouncedSearch.cancel();
            }
            // Clear cache when component unmounts
            cachedData.current = [];
        };
    }, [debouncedSearch]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    // Debounce utility function
    function debounce(func, wait) {
        let timeout;
        const debouncedFunction = function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
        debouncedFunction.cancel = function () {
            clearTimeout(timeout);
        };
        return debouncedFunction;
    }

    const handleUniversityClick = (code) => {
        navigate(`/university/${code}`);
    };

    return (
        <div className="benchmark-container">
            <h1>ĐIỂM CHUẨN ĐẠI HỌC 2024 TẤT CẢ CÁC TRƯỜNG, TRA CỨU</h1>
            <h2>ĐIỂM CHUẨN ĐẠI HỌC 2024</h2>
            
            <div className="benchmark-description">
                <p>
                    Gần 300 trường ĐH, Học viện đã công bố điểm chuẩn năm 2024 xét theo điểm thi tốt nghiệp THPT, học bạ, 
                    ĐGNL, đánh giá tư duy, xét tuyển kết hợp, chứng chỉ quốc tế,... Tra cứu điểm chuẩn ĐH 2024 tất cả các trường 
                    phía dưới.
                </p>
            </div>

            <div className="search-section">
                <h3>Tìm kiếm trường</h3>
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Nhập tên trường/mã trường"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            
            {loading ? (
                <div className="loading-message">Đang tải danh sách trường...</div>
            ) : (
                <div className="university-list">
                    {universities && universities.length > 0 ? (
                        universities.map((university) => (
                            <div 
                                key={university.code || university._id}
                                className="university-item"
                                onClick={() => handleUniversityClick(university.code)}
                            >
                                <div className="university-code">{university.code}</div>
                                <div className="university-name">{university.name}</div>
                                <div className="university-arrow">›</div>
                            </div>
                        ))
                    ) : (
                        <div className="no-results">
                            {searchTerm ? 'Không tìm thấy trường nào phù hợp với từ khóa tìm kiếm' : 'Không có dữ liệu trường'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BenchmarkSearch; 