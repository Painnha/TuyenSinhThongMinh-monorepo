import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BenchmarkScoreManagement.css'; // Tạo file CSS riêng cho component này

// API Base URL - sửa theo địa chỉ backend của bạn
const API_BASE_URL = 'http://localhost:5000';

// Hàm để lấy token xác thực từ localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Hàm tạo config headers với token xác thực
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// Dữ liệu mẫu cho trường hợp API không hoạt động
const MOCK_UNIVERSITIES = [
  { _id: '1', code: 'BKA', name: 'Đại học Bách Khoa Hà Nội' },
  { _id: '2', code: 'QHI', name: 'Đại học Quốc Gia Hà Nội' },
  { _id: '3', code: 'NEU', name: 'Đại học Kinh tế Quốc dân' }
];

const MOCK_MAJORS = [
  { _id: '1', name: 'Công nghệ thông tin' },
  { _id: '2', name: 'Kỹ thuật điện tử' },
  { _id: '3', name: 'Kinh tế đối ngoại' }
];

const MOCK_SUBJECT_COMBINATIONS = [
  { _id: '1', code: 'A00', subjects: ['Toán', 'Lý', 'Hóa'] },
  { _id: '2', code: 'A01', subjects: ['Toán', 'Lý', 'Anh'] },
  { _id: '3', code: 'D01', subjects: ['Toán', 'Văn', 'Anh'] }
];

const ITEMS_PER_PAGE = 10; // Số mục hiển thị trên mỗi trang

const BenchmarkScoreManagement = () => {
  const [benchmarkScores, setBenchmarkScores] = useState([]);
  const [universities, setUniversities] = useState(MOCK_UNIVERSITIES);
  const [majors, setMajors] = useState(MOCK_MAJORS);
  const [subjectCombinations, setSubjectCombinations] = useState(MOCK_SUBJECT_COMBINATIONS);
  const [loading, setLoading] = useState(false);
  
  // Thay đổi: Tách thành 2 trạng thái riêng biệt cho thêm và sửa
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    university_code: '',
    major: '',
    subject_combination: '',
    benchmark_score: '',
    year: '',
    notes: ''
  });
  
  const [filters, setFilters] = useState({
    university: '',
    major: '',
    subject_combination: '',
    year: '',
  });
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Trạng thái phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, [currentPage]); // Fetch lại khi thay đổi trang

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch benchmark scores với phân trang
      try {
        const scoresResponse = await axios.get(
          `${API_BASE_URL}/api/benchmark-scores`, 
          {
            params: {
              ...filters,
              page: currentPage,
              limit: ITEMS_PER_PAGE
            },
            ...getAuthHeaders()
          }
        );
        
        console.log('Benchmark scores response:', scoresResponse.data);
        
        if (scoresResponse.data && typeof scoresResponse.data === 'object') {
          // Nếu API trả về cấu trúc phân trang
          if (Array.isArray(scoresResponse.data.data)) {
            setBenchmarkScores(scoresResponse.data.data);
            setTotalItems(scoresResponse.data.total || 0);
            setTotalPages(scoresResponse.data.totalPages || 1);
          } else if (Array.isArray(scoresResponse.data)) {
            // Trường hợp API không trả về cấu trúc phân trang, dùng mảng trực tiếp
            setBenchmarkScores(scoresResponse.data);
            setTotalItems(scoresResponse.data.length);
            setTotalPages(Math.ceil(scoresResponse.data.length / ITEMS_PER_PAGE));
          } else {
            console.warn('Benchmark scores response is not in expected format:', scoresResponse.data);
            setBenchmarkScores([]);
            setTotalItems(0);
            setTotalPages(1);
          }
        }
      } catch (error) {
        console.error('Error fetching benchmark scores:', error);
        setBenchmarkScores([]);
        setTotalItems(0);
        setTotalPages(1);
      }
      
      // Fetch universities
      try {
        const universitiesResponse = await axios.get(
          `${API_BASE_URL}/api/benchmark-scores/universities`,
          getAuthHeaders()
        );
        console.log('Universities response:', universitiesResponse.data);
        if (Array.isArray(universitiesResponse.data)) {
          setUniversities(universitiesResponse.data);
        } else {
          console.warn('Universities response is not an array');
        }
      } catch (error) {
        console.error('Error fetching universities:', error);
        // Giữ dữ liệu mẫu
      }
      
      // Fetch majors
      try {
        const majorsResponse = await axios.get(
          `${API_BASE_URL}/api/benchmark-scores/majors`,
          getAuthHeaders()
        );
        console.log('Majors response:', majorsResponse.data);
        if (Array.isArray(majorsResponse.data)) {
          setMajors(majorsResponse.data);
        } else {
          console.warn('Majors response is not an array');
        }
      } catch (error) {
        console.error('Error fetching majors:', error);
        // Giữ dữ liệu mẫu
      }
      
      // Fetch subject combinations
      try {
        const combinationsResponse = await axios.get(
          `${API_BASE_URL}/api/benchmark-scores/subject-combinations`,
          getAuthHeaders()
        );
        console.log('Subject combinations response:', combinationsResponse.data);
        if (Array.isArray(combinationsResponse.data)) {
          setSubjectCombinations(combinationsResponse.data);
        } else {
          console.warn('Subject combinations response is not an array');
        }
      } catch (error) {
        console.error('Error fetching subject combinations:', error);
        // Giữ dữ liệu mẫu
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };
  
  // Xử lý thay đổi trang
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  // Tạo danh sách các trang để hiển thị
  const renderPaginationItems = () => {
    const paginationItems = [];
    
    // Nút Previous
    paginationItems.push(
      <button 
        key="prev" 
        className={`pagination-item ${currentPage === 1 ? 'disabled' : ''}`}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        &laquo;
      </button>
    );
    
    // Hiển thị tối đa 5 trang (2 bên trái, 2 bên phải của trang hiện tại)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    // Nút trang đầu (nếu cần)
    if (startPage > 1) {
      paginationItems.push(
        <button 
          key="1" 
          className={`pagination-item ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );
      
      if (startPage > 2) {
        paginationItems.push(
          <span key="ellipsis1" className="pagination-ellipsis">...</span>
        );
      }
    }
    
    // Các trang chính
    for (let i = startPage; i <= endPage; i++) {
      paginationItems.push(
        <button 
          key={i} 
          className={`pagination-item ${currentPage === i ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }
    
    // Nút trang cuối (nếu cần)
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationItems.push(
          <span key="ellipsis2" className="pagination-ellipsis">...</span>
        );
      }
      
      paginationItems.push(
        <button 
          key={totalPages} 
          className={`pagination-item ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }
    
    // Nút Next
    paginationItems.push(
      <button 
        key="next" 
        className={`pagination-item ${currentPage === totalPages ? 'disabled' : ''}`}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        &raquo;
      </button>
    );
    
    return paginationItems;
  };

  // Hiển thị/ẩn form thêm điểm chuẩn
  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    // Reset form khi hiển thị
    if (!showAddForm) {
      resetForm();
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      university_code: '',
      major: '',
      subject_combination: '',
      benchmark_score: '',
      year: '',
      notes: ''
    });
  };

  // Mở modal sửa điểm chuẩn
  const handleEditClick = (record) => {
    setEditingRecord(record);
    setFormData({
      university_code: record.university_code || '',
      major: record.major || '',
      subject_combination: record.subject_combination || '',
      benchmark_score: record.benchmark_score || '',
      year: record.year || '',
      notes: record.notes || '',
    });
    setShowEditModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      if (parseFloat(formData.benchmark_score) <= 0) {
        setErrorMessage('Điểm chuẩn phải là số dương!');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }

      // Tìm tên trường dựa vào mã trường
      const selectedUniversity = universities.find(uni => uni.code === formData.university_code);
      if (!selectedUniversity) {
        setErrorMessage('Vui lòng chọn trường đại học hợp lệ!');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }

      // Chuẩn bị dữ liệu để gửi lên server
      const dataToSubmit = {
        ...formData,
        university: selectedUniversity.name,
        university_code: formData.university_code,
        benchmark_score: parseFloat(formData.benchmark_score)
      };
      
      // Create new record
      await axios.post(
        `${API_BASE_URL}/api/benchmark-scores`, 
        dataToSubmit, 
        getAuthHeaders()
      );
      setSuccessMessage('Thêm điểm chuẩn mới thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reset form và ẩn form thêm
      resetForm();
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrorMessage('Đã xảy ra lỗi khi lưu dữ liệu. Vui lòng thử lại!');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      if (parseFloat(formData.benchmark_score) <= 0) {
        setErrorMessage('Điểm chuẩn phải là số dương!');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }

      // Tìm tên trường dựa vào mã trường
      const selectedUniversity = universities.find(uni => uni.code === formData.university_code);
      if (!selectedUniversity) {
        setErrorMessage('Vui lòng chọn trường đại học hợp lệ!');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }

      // Chuẩn bị dữ liệu để gửi lên server
      const dataToSubmit = {
        ...formData,
        university: selectedUniversity.name,
        university_code: formData.university_code,
        benchmark_score: parseFloat(formData.benchmark_score)
      };
      
      // Update existing record
      await axios.put(
        `${API_BASE_URL}/api/benchmark-scores/${editingRecord._id}`, 
        dataToSubmit, 
        getAuthHeaders()
      );
      setSuccessMessage('Cập nhật điểm chuẩn thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Đóng modal
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrorMessage(`Lỗi: ${error.response?.data?.message || error.message || 'Đã xảy ra lỗi khi lưu dữ liệu.'}`);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const confirmDelete = (record) => {
    setRecordToDelete(record);
    setShowConfirmation(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/benchmark-scores/${recordToDelete._id}`,
        getAuthHeaders()
      );
      setSuccessMessage('Xóa điểm chuẩn thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowConfirmation(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting record:', error);
      setErrorMessage(`Lỗi: ${error.response?.data?.message || error.message || 'Không thể xóa dữ liệu.'}`);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleFiltersChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset về trang 1 khi áp dụng bộ lọc mới
    fetchData();
  };

  const resetFilters = () => {
    setFilters({
      university: '',
      major: '',
      subject_combination: '',
      year: '',
    });
    setCurrentPage(1); // Reset về trang 1 khi xóa bộ lọc
    fetchData();
  };

  // Thêm hàm để tạo dữ liệu mẫu
  const createSampleData = async () => {
    try {
      setLoading(true);
      
      // Dữ liệu mẫu điểm chuẩn
      const sampleData = [
        {
          university: 'Đại học Bách Khoa Hà Nội',
          university_code: 'BKA',
          major: 'Công nghệ thông tin',
          subject_combination: 'A00',
          benchmark_score: 26.5,
          year: '2023',
          notes: 'Điểm chuẩn CNTT'
        },
        {
          university: 'Đại học Bách Khoa Hà Nội',
          university_code: 'BKA',
          major: 'Kỹ thuật điện tử',
          subject_combination: 'A01',
          benchmark_score: 25.75,
          year: '2023',
          notes: 'Điểm chuẩn KTĐT'
        },
        {
          university: 'Đại học Quốc Gia Hà Nội',
          university_code: 'QHI',
          major: 'Công nghệ thông tin',
          subject_combination: 'A00',
          benchmark_score: 25.0,
          year: '2023',
          notes: 'Điểm chuẩn CNTT'
        }
      ];
      
      // Tuần tự tạo các bản ghi mẫu
      for (const item of sampleData) {
        await axios.post(
          `${API_BASE_URL}/api/benchmark-scores`, 
          item, 
          getAuthHeaders()
        );
      }
      
      setSuccessMessage('Đã tạo dữ liệu mẫu thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Tải lại dữ liệu
      fetchData();
    } catch (error) {
      console.error('Error creating sample data:', error);
      setErrorMessage(`Lỗi: ${error.response?.data?.message || error.message || 'Không thể tạo dữ liệu mẫu.'}`);
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="benchmark-score-management">
      <div className="card">
        <div className="card-header">
          <h2>Quản lý điểm chuẩn</h2>
          <div className="button-group">
            <button className="btn-primary" onClick={toggleAddForm}>
              {showAddForm ? 'Hủy thêm' : 'Thêm mới'}
            </button>
            {benchmarkScores.length === 0 && (
              <button className="btn-secondary" onClick={createSampleData}>
                Tạo dữ liệu mẫu
              </button>
            )}
          </div>
        </div>

        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {/* Form thêm mới - hiển thị trực tiếp trong trang */}
        {showAddForm && (
          <div className="add-benchmark-form">
            <h3>Thêm điểm chuẩn mới</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="university_code">Trường Đại Học *</label>
                  <select
                    id="university_code"
                    name="university_code"
                    value={formData.university_code}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn trường đại học</option>
                    {universities.map(uni => (
                      <option key={uni._id || uni.code} value={uni.code}>
                        {uni.name} ({uni.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="major">Ngành Học *</label>
                  <select
                    id="major"
                    name="major"
                    value={formData.major}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn ngành học</option>
                    {majors.map(major => (
                      <option key={major._id || major.name} value={major.name}>
                        {major.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="subject_combination">Tổ Hợp Môn *</label>
                  <select
                    id="subject_combination"
                    name="subject_combination"
                    value={formData.subject_combination}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn tổ hợp môn</option>
                    {subjectCombinations.map(combo => (
                      <option key={combo._id || combo.code} value={combo.code}>
                        {combo.code} {combo.subjects ? `- ${combo.subjects.join(', ')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="year">Năm *</label>
                  <input
                    type="text"
                    id="year"
                    name="year"
                    placeholder="Nhập năm (ví dụ: 2024)"
                    value={formData.year}
                    onChange={handleInputChange}
                    pattern="[0-9]{4}"
                    title="Năm phải có 4 chữ số"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="benchmark_score">Điểm Chuẩn *</label>
                  <input
                    type="number"
                    id="benchmark_score"
                    name="benchmark_score"
                    placeholder="Nhập điểm chuẩn (ví dụ: 26.5)"
                    value={formData.benchmark_score}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="notes">Ghi Chú</label>
                  <textarea
                    id="notes"
                    name="notes"
                    placeholder="Nhập ghi chú (nếu có)"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={2}
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={toggleAddForm}>Hủy</button>
                <button type="submit" className="btn-submit">Thêm</button>
              </div>
            </form>
          </div>
        )}

        <div className="filters">
          <form onSubmit={applyFilters}>
            <div className="form-group">
              <label>Trường:</label>
              <select 
                name="university" 
                value={filters.university} 
                onChange={handleFiltersChange}
              >
                <option value="">Tất cả</option>
                {universities.map(uni => (
                  <option key={uni._id || uni.code} value={uni.code}>
                    {uni.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ngành:</label>
              <select 
                name="major" 
                value={filters.major} 
                onChange={handleFiltersChange}
              >
                <option value="">Tất cả</option>
                {majors.map(major => (
                  <option key={major._id || major.name} value={major.name}>
                    {major.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Tổ hợp môn:</label>
              <select 
                name="subject_combination" 
                value={filters.subject_combination} 
                onChange={handleFiltersChange}
              >
                <option value="">Tất cả</option>
                {subjectCombinations.map(combo => (
                  <option key={combo._id || combo.code} value={combo.code}>
                    {combo.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Năm:</label>
              <input 
                type="text" 
                name="year" 
                placeholder="Nhập năm" 
                value={filters.year} 
                onChange={handleFiltersChange}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Lọc</button>
              <button type="button" className="btn-secondary" onClick={resetFilters}>Đặt lại</button>
            </div>
          </form>
        </div>
        
        <div className="table-container">
          {loading ? (
            <div className="loading">Đang tải dữ liệu...</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tên trường</th>
                    <th>Mã trường</th>
                    <th>Tên ngành</th>
                    <th>Tổ hợp môn</th>
                    <th>Điểm chuẩn</th>
                    <th>Năm</th>
                    <th>Ghi chú</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkScores.length > 0 ? (
                    benchmarkScores.map((record) => (
                      <tr key={record._id || Math.random().toString()}>
                        <td>{record.university}</td>
                        <td>{record.university_code}</td>
                        <td>{record.major}</td>
                        <td>{record.subject_combination}</td>
                        <td>{record.benchmark_score ? record.benchmark_score.toFixed(2) : ''}</td>
                        <td>{record.year}</td>
                        <td>{record.notes || ''}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => handleEditClick(record)}
                              style={{
                                backgroundColor: '#17a2b8',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDelete(record)}
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="no-data">Không có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {/* Phân trang - luôn hiển thị */}
              <div className="pagination">
                <div className="pagination-info">
                  Hiển thị {((currentPage - 1) * ITEMS_PER_PAGE) + (benchmarkScores.length > 0 ? 1 : 0)} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} / {totalItems} mục
                </div>
                <div className="pagination-controls">
                  {renderPaginationItems()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal sửa điểm chuẩn - sử dụng kiểu modal như trong UserManagement.js */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Cập nhật điểm chuẩn</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-university_code">Trường Đại Học *</label>
                  <select
                    id="edit-university_code"
                    name="university_code"
                    value={formData.university_code}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn trường đại học</option>
                    {universities.map(uni => (
                      <option key={uni._id || uni.code} value={uni.code}>
                        {uni.name} ({uni.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-major">Ngành Học *</label>
                  <select
                    id="edit-major"
                    name="major"
                    value={formData.major}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn ngành học</option>
                    {majors.map(major => (
                      <option key={major._id || major.name} value={major.name}>
                        {major.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-subject_combination">Tổ Hợp Môn *</label>
                  <select
                    id="edit-subject_combination"
                    name="subject_combination"
                    value={formData.subject_combination}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn tổ hợp môn</option>
                    {subjectCombinations.map(combo => (
                      <option key={combo._id || combo.code} value={combo.code}>
                        {combo.code} {combo.subjects ? `- ${combo.subjects.join(', ')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-benchmark_score">Điểm Chuẩn *</label>
                  <input
                    type="number"
                    id="edit-benchmark_score"
                    name="benchmark_score"
                    placeholder="Nhập điểm chuẩn (ví dụ: 26.5)"
                    value={formData.benchmark_score}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-year">Năm *</label>
                  <input
                    type="text"
                    id="edit-year"
                    name="year"
                    placeholder="Nhập năm (ví dụ: 2024)"
                    value={formData.year}
                    onChange={handleInputChange}
                    pattern="[0-9]{4}"
                    title="Năm phải có 4 chữ số"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-notes">Ghi Chú</label>
                  <textarea
                    id="edit-notes"
                    name="notes"
                    placeholder="Nhập ghi chú (nếu có)"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowEditModal(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {showConfirmation && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa điểm chuẩn này không?</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowConfirmation(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-submit"
                style={{ backgroundColor: '#dc3545' }}
                onClick={handleDelete}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenchmarkScoreManagement; 