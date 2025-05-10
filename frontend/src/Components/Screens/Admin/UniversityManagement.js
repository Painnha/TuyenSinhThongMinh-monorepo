import React, { useState, useEffect } from 'react';
import { getAllUniversities, createUniversity, updateUniversity, deleteUniversity } from '../../../services/universityService';
import './UniversityManagement.css';

// Component quản lý trường đại học
const UniversityManagement = () => {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentUniversity, setCurrentUniversity] = useState(null);
  
  // Search và phân trang
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  
  // Form data
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [level, setLevel] = useState('trung bình');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('Nam');
  
  // Lưu trữ code cũ khi sửa
  const [originalCode, setOriginalCode] = useState('');
  
  // Form errors
  const [codeError, setCodeError] = useState('');
  const [nameError, setNameError] = useState('');
  
  const [formLoading, setFormLoading] = useState(false);

  // Lấy danh sách trường đại học
  const fetchUniversities = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching universities...');
      const data = await getAllUniversities();
      console.log('Universities data:', data);
      
      // Kiểm tra format dữ liệu trả về từ API
      let universitiesList = [];
      if (data.universities) {
        universitiesList = data.universities;
      } else if (data.success && Array.isArray(data.university)) {
        universitiesList = data.university;
      }
      
      setUniversities(universitiesList);
      setTotalItems(universitiesList.length);
      applySearchAndPagination(universitiesList, searchTerm, currentPage, itemsPerPage);
    } catch (err) {
      console.error('Error in UniversityManagement:', err);
      setError(err.message || 'Có lỗi xảy ra khi lấy danh sách trường đại học');
    } finally {
      setLoading(false);
    }
  };

  // Lọc và phân trang dữ liệu
  const applySearchAndPagination = (data, search, page, limit) => {
    let filtered = data;
    
    // Áp dụng tìm kiếm
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filtered = data.filter(
        univ => 
          univ.code?.toLowerCase().includes(searchLower) || 
          univ.name?.toLowerCase().includes(searchLower)
      );
    }
    
    setTotalItems(filtered.length);
    
    // Áp dụng phân trang
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filtered.slice(startIndex, endIndex);
    
    setFilteredUniversities(paginatedData);
  };

  useEffect(() => {
    fetchUniversities();
  }, []);

  // Xử lý khi thay đổi tìm kiếm hoặc phân trang
  useEffect(() => {
    applySearchAndPagination(universities, searchTerm, currentPage, itemsPerPage);
  }, [searchTerm, currentPage, universities, itemsPerPage]);

  // Xử lý khi thay đổi tìm kiếm
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
  };

  // Xử lý thay đổi trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset form
  const resetForm = () => {
    setCode('');
    setName('');
    setAddress('');
    setWebsite('');
    setLevel('trung bình');
    setCity('');
    setRegion('Nam');
    setCodeError('');
    setNameError('');
  };

  // Hiển thị/ẩn form thêm trường đại học
  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    // Reset form khi hiển thị
    if (!showAddForm) {
      resetForm();
    }
  };

  // Mở modal sửa trường đại học
  const handleEditClick = (university) => {
    setCurrentUniversity(university);
    
    // Fill form với dữ liệu hiện tại
    setCode(university.code);
    setOriginalCode(university.code); // Lưu code cũ
    setName(university.name);
    setAddress(university.address || '');
    setWebsite(university.website || '');
    setLevel(university.level || 'trung bình');
    setCity(university.location?.city || '');
    setRegion(university.location?.region || 'Nam');
    
    // Reset errors
    setCodeError('');
    setNameError('');
    
    // Hiện modal
    setShowEditModal(true);
  };

  // Hiển thị modal xác nhận xóa
  const handleDeleteClick = (university) => {
    setCurrentUniversity(university);
    setShowDeleteModal(true);
  };

  // Validate form
  const validateForm = () => {
    let isValid = true;
    
    // Kiểm tra mã trường
    if (!code.trim()) {
      setCodeError('Mã trường không được để trống');
      isValid = false;
    } else {
      setCodeError('');
    }
    
    // Kiểm tra tên trường
    if (!name.trim()) {
      setNameError('Tên trường không được để trống');
      isValid = false;
    } else {
      setNameError('');
    }
    
    return isValid;
  };

  // Xử lý thêm trường đại học mới
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setFormLoading(true);
      
      // Form data
      const universityData = {
        code,
        name,
        address,
        website,
        level,
        location: {
          city,
          region
        }
      };
      
      // Tạo trường đại học mới
      const response = await createUniversity(universityData);
      if (response && response.success) {
        alert('Thêm trường đại học thành công!');
        
        // Đóng modal và tải lại danh sách
        setShowAddForm(false);
        fetchUniversities();
      } else {
        throw new Error(response?.message || 'Không thể thêm trường đại học');
      }
    } catch (err) {
      alert(`Lỗi: ${err.message || 'Có lỗi xảy ra'}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Xử lý cập nhật trường đại học
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setFormLoading(true);
      
      // Form data
      const universityData = {
        code,
        originalCode, // Thêm code cũ
        name,
        address,
        website,
        level,
        location: {
          city,
          region
        }
      };
      
      // Cập nhật trường đại học
      const response = await updateUniversity(currentUniversity._id, universityData);
      if (response && response.success) {
        alert('Cập nhật trường đại học thành công!');
        
        // Đóng modal và tải lại danh sách
        setShowEditModal(false);
        fetchUniversities();
      } else {
        throw new Error(response?.message || 'Không thể cập nhật thông tin trường đại học');
      }
    } catch (err) {
      alert(`Lỗi: ${err.message || 'Có lỗi xảy ra'}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Xử lý xóa trường đại học
  const handleDeleteConfirm = async () => {
    if (!currentUniversity) return;
    
    try {
      setLoading(true);
      const response = await deleteUniversity(currentUniversity._id);
      
      if (response && response.success) {
        alert('Xóa trường đại học thành công!');
        setShowDeleteModal(false);
        setCurrentUniversity(null);
        fetchUniversities(); // Tải lại danh sách
      } else {
        throw new Error(response?.message || 'Không thể xóa trường đại học');
      }
    } catch (err) {
      alert(`Lỗi: ${err.message || 'Có lỗi xảy ra khi xóa trường đại học'}`);
    } finally {
      setLoading(false);
    }
  };

  // Tạo các nút phân trang
  const renderPagination = () => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pages = [];
    
    // Thêm nút Previous
    pages.push(
      <button 
        key="prev" 
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="pagination-button"
      >
        &laquo;
      </button>
    );
    
    // Hiển thị các nút trang
    // Nếu có nhiều trang, chỉ hiển thị một số trang xung quanh trang hiện tại
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button 
          key={i} 
          onClick={() => handlePageChange(i)}
          className={`pagination-button ${currentPage === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }
    
    // Thêm nút Next
    pages.push(
      <button 
        key="next" 
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="pagination-button"
      >
        &raquo;
      </button>
    );
    
    return (
      <div className="pagination">
        {pages}
      </div>
    );
  };

  // Hiển thị loading
  if (loading && !universities.length) {
    return (
      <div className="university-loading">
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  // Hiển thị lỗi
  if (error) {
    return (
      <div className="university-error">
        <p>Lỗi: {error}</p>
        <button 
          className="university-management-button" 
          onClick={fetchUniversities}
        >
          <i className="fas fa-sync-alt"></i> Tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="university-management-container">
      {/* Header */}
      <div className="university-management-header">
        <h2 className="university-management-title">Quản lý trường đại học</h2>
        <button 
          className="university-management-button" 
          onClick={toggleAddForm}
          style={{
            backgroundColor: showAddForm ? '#dc3545' : '#007bff',
          }}
        >
          <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'}`}></i> {showAddForm ? 'Hủy thêm' : 'Thêm trường mới'}
        </button>
      </div>

      {/* Form thêm trường đại học - hiển thị trên bảng */}
      {showAddForm && (
        <div className="add-university-form">
          <h3>Thêm trường đại học mới</h3>
          <form onSubmit={handleAddSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="add-code">Mã trường:</label>
                <input
                  id="add-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ví dụ: IUH"
                  required
                />
                {codeError && <div className="error-message">{codeError}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="add-name">Tên trường:</label>
                <input
                  id="add-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Đại học Công nghiệp TP.HCM"
                  required
                />
                {nameError && <div className="error-message">{nameError}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="add-address">Địa chỉ:</label>
                <input
                  id="add-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Địa chỉ trường đại học"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="add-website">Website:</label>
                <input
                  id="add-website"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Ví dụ: https://iuh.edu.vn"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="add-city">Thành phố:</label>
                <input
                  id="add-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ví dụ: TP.HCM"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="add-region">Khu vực:</label>
                <select
                  id="add-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="Bắc">Bắc</option>
                  <option value="Trung">Trung</option>
                  <option value="Nam">Nam</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="add-level">Xếp hạng:</label>
                <select
                  id="add-level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="cao">Cao</option>
                  <option value="trung bình">Trung bình</option>
                  <option value="thấp">Thấp</option>
                </select>
              </div>
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={toggleAddForm}
                disabled={formLoading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={formLoading}
              >
                {formLoading ? 'Đang xử lý...' : 'Thêm mới'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Thanh tìm kiếm và phân trang */}
      <div className="university-management-actions">
        <div className="search-container">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc mã trường..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
      </div>

      {/* Bảng danh sách */}
      <table className="university-table">
        <thead>
          <tr>
            <th>Mã trường</th>
            <th>Tên trường</th>
            <th>Địa chỉ</th>
            <th>Trang web</th>
            <th>Khu vực</th>
            <th>Xếp hạng</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filteredUniversities.length > 0 ? (
            filteredUniversities.map((university) => (
              <tr key={university._id}>
                <td>{university.code}</td>
                <td>{university.name}</td>
                <td>{university.address}</td>
                <td>
                  {university.website && (
                    <a href={university.website} target="_blank" rel="noopener noreferrer">
                      {university.website}
                    </a>
                  )}
                </td>
                <td>{university.location?.city} ({university.location?.region})</td>
                <td>{university.level}</td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      type="button"
                      onClick={() => handleEditClick(university)}
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
                      onClick={() => handleDeleteClick(university)}
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
              <td colSpan="7" style={{ textAlign: 'center' }}>
                {searchTerm 
                  ? 'Không tìm thấy trường đại học phù hợp với từ khóa tìm kiếm' 
                  : 'Không có dữ liệu trường đại học'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Phân trang */}
      <div className="pagination-container">
        {totalItems > 0 && (
          <div className="pagination-info">
            Hiển thị {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} đến {Math.min(currentPage * itemsPerPage, totalItems)} trong số {totalItems} trường
          </div>
        )}
        {totalItems > itemsPerPage && renderPagination()}
      </div>

      {/* Modal sửa trường đại học */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Sửa thông tin trường đại học</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-code">Mã trường:</label>
                  <input
                    id="edit-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ví dụ: IUH"
                    required
                  />
                  {codeError && <div className="error-message">{codeError}</div>}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-name">Tên trường:</label>
                  <input
                    id="edit-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Đại học Công nghiệp TP.HCM"
                    required
                  />
                  {nameError && <div className="error-message">{nameError}</div>}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-address">Địa chỉ:</label>
                  <input
                    id="edit-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Địa chỉ trường đại học"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-website">Website:</label>
                  <input
                    id="edit-website"
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Ví dụ: https://iuh.edu.vn"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-city">Thành phố:</label>
                  <input
                    id="edit-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ví dụ: TP.HCM"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-region">Khu vực:</label>
                  <select
                    id="edit-region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option value="Bắc">Bắc</option>
                    <option value="Trung">Trung</option>
                    <option value="Nam">Nam</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-level">Xếp hạng:</label>
                  <select
                    id="edit-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="cao">Cao</option>
                    <option value="trung bình">Trung bình</option>
                    <option value="thấp">Thấp</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowEditModal(false)}
                  disabled={formLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={formLoading}
                >
                  {formLoading ? 'Đang xử lý...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa trường <strong>{currentUniversity?.name}</strong>?</p>
            <p>Hành động này không thể hoàn tác.</p>
            
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-submit"
                style={{ backgroundColor: '#dc3545' }}
                onClick={handleDeleteConfirm}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityManagement; 