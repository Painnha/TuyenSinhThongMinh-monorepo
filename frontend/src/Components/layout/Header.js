import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../Image/LOGO.png';

const Header = () => {
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
    setUser(null);
    setIsDropdownOpen(false);
    navigate('/login');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/profile'); // Thêm route này sau
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <img src={logo} alt="TuyenSinh" className="logo-image" />
          </Link>
        </div>
        <nav className="nav-menu">
          <ul>
            <li><Link to="/diem-chuan">Điểm chuẩn đại học</Link></li>
            <li><Link to="/tinh-diem">Tính điểm học bạ THPT</Link></li>
            <li><Link to="/tu-van">Tư vấn chọn ngành</Link></li>
          </ul>
        </nav>
        <div className="auth-button">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <span className="user-name" onClick={toggleDropdown}>
                {user.userName}
              </span>
              <div className={`dropdown-menu ${isDropdownOpen ? 'active' : ''}`}>
                <div className="dropdown-item" onClick={handleProfileClick}>
                  Thông tin cá nhân
                </div>
                {user.role === 'admin' && (
                  <div className="dropdown-item" onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/admin');
                  }}>
                    Quản trị hệ thống
                  </div>
                )}
                <div className="dropdown-item logout" onClick={handleLogout}>
                  Đăng xuất
                </div>
              </div>
            </div>
          ) : (
            <Link to="/login" className="login-button">Đăng nhập</Link>
          )}
        </div>
      </div>

    </header>
  );
};

export default Header; 