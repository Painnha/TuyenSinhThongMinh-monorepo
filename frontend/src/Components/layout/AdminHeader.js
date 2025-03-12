import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../Image/LOGO.png';

const AdminHeader = () => {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Kiểm tra thông tin người dùng trong localStorage
    const checkUserAuth = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    // Kiểm tra khi component mount
    checkUserAuth();

    // Thêm event listener để lắng nghe thay đổi trong localStorage
    window.addEventListener('storage', checkUserAuth);

    // Thêm event listener để đóng dropdown khi click ra ngoài
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup function
    return () => {
      window.removeEventListener('storage', checkUserAuth);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAdminLogin');
    setUser(null);
    setIsDropdownOpen(false);
    navigate('/login-admin');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <header className="header" style={{ backgroundColor: '#001529', color: 'white' }}>
      <div className="header-container">
        <div className="logo">
          <Link to="/admin">
            <img src={logo} alt="TuyenSinh Admin" className="logo-image" />
          </Link>
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Hệ thống quản trị
        </div>
        <div className="auth-button">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <span className="user-name" onClick={toggleDropdown} style={{ color: 'white' }}>
                {user.userName} (Admin)
              </span>
              <div className={`dropdown-menu ${isDropdownOpen ? 'active' : ''}`}>
                <Link to="/" className="dropdown-item">
                  Trang người dùng
                </Link>
                <div className="dropdown-item logout" onClick={handleLogout}>
                  Đăng xuất
                </div>
              </div>
            </div>
          ) : (
            <Link to="/login-admin" className="login-button">Đăng nhập</Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader; 