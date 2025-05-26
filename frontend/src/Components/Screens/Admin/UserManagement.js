import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser, toggleUserStatus } from '../../../services/userService';
import './UserManagement.css';

// Component quản lý người dùng
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Form data
  const [userName, setUserName] = useState('');
  // const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  
  // Form errors
  // const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [addLoading, setAddLoading] = useState(false);

  // Lấy danh sách người dùng
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error in UserManagement:', err);
      setError(err.message || 'Có lỗi xảy ra khi lấy danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Hiển thị số điện thoại cho người dùng (thêm số 0 ở đầu)
  /*
  const formatPhoneForDisplay = (phoneNumber) => {
    if (!phoneNumber) return phoneNumber;
    
    // Nếu bắt đầu bằng +84, đổi thành 0
    if (phoneNumber.startsWith('+84')) {
      return '0' + phoneNumber.substring(3);
    }
    // Nếu bắt đầu bằng 84, đổi thành 0
    else if (phoneNumber.startsWith('84')) {
      return '0' + phoneNumber.substring(2);
    }
    
    return phoneNumber;
  };
  */

  // Hiển thị tên tài khoản (email hoặc số điện thoại)
  const displayIdentifier = (user) => {
    if (user.email) return user.email;
    // if (user.phone) return formatPhoneForDisplay(user.phone);
    return 'N/A';
  };

  // Kiểm tra định dạng số điện thoại hợp lệ
  /*
  const isValidPhone = (phoneNumber) => {
    // Loại bỏ các ký tự không phải số
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Kiểm tra định dạng số điện thoại Việt Nam
    if (cleaned.startsWith('0')) {
      // Kiểm tra số bắt đầu bằng 0
      const regex = /^0[3|5|7|8|9][0-9]{8}$/;
      return regex.test(cleaned);
    } else if (cleaned.startsWith('84')) {
      // Kiểm tra số bắt đầu bằng 84
      const regex = /^84[3|5|7|8|9][0-9]{8}$/;
      return regex.test(cleaned);
    }
    
    return false;
  };
  */

  // Kiểm tra định dạng email hợp lệ
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Hiển thị/ẩn form thêm người dùng
  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    // Reset form khi hiển thị
    if (!showAddForm) {
      resetAddForm();
    }
  };

  // Reset form thêm người dùng
  const resetAddForm = () => {
    setUserName('');
    // setPhone('');
    setEmail('');
    setPassword('');
    setRole('user');
    // setPhoneError('');
    setEmailError('');
    setPasswordError('');
  };

  // Mở modal sửa người dùng
  const handleEditClick = (user) => {
    setCurrentUser(user);
    
    // Xử lý số điện thoại để hiển thị đúng định dạng cho người dùng
    setUserName(user.userName);
    setRole(user.role);
    
    // Reset errors
    setEmailError('');
    setPasswordError('');
    
    // Hiện modal
    setShowEditModal(true);
  };

  // Xử lý thêm người dùng mới
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    // setPhoneError('');
    setEmailError('');
    setPasswordError('');
    
    // Validate
    if (!isValidEmail(email)) {
      setEmailError('Email không hợp lệ. Vui lòng nhập đúng định dạng email');
      return;
    }
    
    try {
      setAddLoading(true);
      
      // Form data
      const userData = {
        userName,
     
        email,
        password,
        role
      };
      
      console.log('Sending user data:', userData);
      
      // Thêm người dùng mới
      await createUser(userData);
      alert('Thêm người dùng thành công!');
      
      // Reset form và ẩn form thêm
      resetAddForm();
      setShowAddForm(false);
      fetchUsers(); // Tải lại danh sách
    } catch (err) {
      alert(`Lỗi: ${err.message || 'Có lỗi xảy ra'}`);
    } finally {
      setAddLoading(false);
    }
  };

  // Xử lý submit form cập nhật
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    // setPhoneError('');
    setPasswordError('');
    
    try {
      setLoading(true);
      
      // Form data
      const userData = {
        userName,
        role
      };
      
      // Cập nhật người dùng
      await updateUser(currentUser._id, userData);
      alert('Cập nhật người dùng thành công!');
      
      // Đóng modal
      setShowEditModal(false);
      fetchUsers(); // Tải lại danh sách
    } catch (err) {
      alert(`Lỗi: ${err.message || 'Có lỗi xảy ra'}`);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý xóa người dùng
  const handleDeleteConfirm = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      await deleteUser(currentUser._id);
      alert('Xóa người dùng thành công!');
      setShowDeleteModal(false);
      setCurrentUser(null);
      fetchUsers(); // Tải lại danh sách
    } catch (err) {
      alert(`Lỗi: ${err.message || 'Có lỗi xảy ra khi xóa người dùng'}`);
    } finally {
      setLoading(false);
    }
  };

  // Hiển thị modal xác nhận xóa
  const handleDeleteClick = (user) => {
    setCurrentUser(user);
    setShowDeleteModal(true);
  };

  // Xử lý vô hiệu hóa/kích hoạt tài khoản
  const handleToggleStatus = async (userId) => {
    try {
      setLoading(true);
      await toggleUserStatus(userId);
      fetchUsers(); // Tải lại danh sách
    } catch (err) {
      alert(`Lỗi: ${err.message || 'Có lỗi xảy ra khi thay đổi trạng thái người dùng'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !users.length) {
    return (
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#f8d7da', 
        color: '#721c24',
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        <h3>Lỗi khi tải dữ liệu:</h3>
        <p>{error}</p>
        <p>Vui lòng kiểm tra console để biết thêm chi tiết.</p>
        <button 
          onClick={fetchUsers}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Quản lý tài khoản người dùng</h2>
        <button 
          onClick={toggleAddForm}
          style={{
            backgroundColor: showAddForm ? '#dc3545' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showAddForm ? 'Hủy thêm' : 'Thêm người dùng'}
        </button>
      </div>
      
      {/* Form thêm người dùng */}
      {showAddForm && (
        <div className="add-user-form">
          <h3>Thêm người dùng mới</h3>
          <form onSubmit={handleAddSubmit}>
            <div className="form-row">
              <div>
                <label htmlFor="add-userName">Tên người dùng:</label>
                <input
                  id="add-userName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="add-email">Email:</label>
                <input
                  id="add-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {emailError && (
                  <div className="error-message">
                    {emailError}
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-row">
              <div>
                <label htmlFor="add-password">Mật khẩu:</label>
                <input
                  id="add-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {passwordError && (
                  <div className="error-message">
                    {passwordError}
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="add-role">Vai trò:</label>
                <select
                  id="add-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="user">Người dùng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                onClick={toggleAddForm}
                className="btn-cancel"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="btn-submit"
              >
                {addLoading ? 'Đang xử lý...' : 'Thêm'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Danh sách người dùng */}
      {users.length === 0 ? (
        <p>Không có người dùng nào.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Tên người dùng</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Email</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Vai trò</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Trạng thái</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.userName}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{displayIdentifier(user)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.role}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <span style={{
                    backgroundColor: user.isActive ? '#28a745' : '#dc3545',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                  </span>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      type="button"
                      onClick={() => handleEditClick(user)}
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
                      onClick={() => handleDeleteClick(user)}
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
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(user._id)}
                      style={{
                        backgroundColor: user.isActive ? '#ffc107' : '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {user.isActive ? 'Khóa' : 'Mở khóa'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {/* Modal sửa người dùng */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Cập nhật người dùng</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-row">
                <div>
                  <label htmlFor="edit-userName">Tên người dùng:</label>
                  <input
                    id="edit-userName"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div>
                  <label htmlFor="edit-role">Vai trò:</label>
                  <select
                    id="edit-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="user">Người dùng</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
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
                  disabled={loading}
                >
                  {loading ? 'Đang xử lý...' : 'Cập nhật'}
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
            <p>Bạn có chắc chắn muốn xóa người dùng này không?</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-submit"
                style={{ backgroundColor: '#dc3545' }}
                onClick={handleDeleteConfirm}
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

export default UserManagement;