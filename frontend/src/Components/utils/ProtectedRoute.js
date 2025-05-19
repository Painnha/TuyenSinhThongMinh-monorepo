import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Component bảo vệ các route cần xác thực
 * @param {Object} props - Props của component
 * @param {React.ReactNode} props.children - Component con cần bảo vệ
 * @param {Array} props.allowedRoles - Mảng các role được phép truy cập (nếu không có, chỉ cần đăng nhập)
 * @param {boolean} props.requireAdminLogin - Có yêu cầu đăng nhập từ trang admin không
 */
const ProtectedRoute = ({ children, allowedRoles = [], requireAdminLogin = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState(null);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        const adminLoginFlag = localStorage.getItem('isAdminLogin');
        
  
     
      
        
        if (!token || !userStr) {
          setError('Không tìm thấy thông tin đăng nhập');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        const user = JSON.parse(userStr);
    
        
        setIsAuthenticated(true);
        setUserRole(user.role || 'user');
        setIsAdminLogin(adminLoginFlag === 'true');

      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Lỗi khi kiểm tra xác thực: ' + err.message);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    // Hiển thị loading khi đang kiểm tra xác thực
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <p>Đang kiểm tra xác thực...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Hiển thị thông báo lỗi và chuyển hướng đến trang đăng nhập
    const loginPath = requireAdminLogin ? '/login-admin' : '/login';
    return (
      <Navigate 
        to={loginPath} 
        state={{ 
          from: location,
          authError: error || 'Vui lòng đăng nhập để truy cập trang này'
        }} 
        replace 
      />
    );
  }

  // Kiểm tra quyền truy cập nếu có yêu cầu về role
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Hiển thị thông báo lỗi và chuyển hướng đến trang chủ
    return (
      <Navigate 
        to="/" 
        state={{ 
          authError: `Bạn không có quyền truy cập trang này. Quyền hiện tại: ${userRole}, quyền yêu cầu: ${allowedRoles.join(', ')}`
        }} 
        replace 
      />
    );
  }

  // Kiểm tra xem có yêu cầu đăng nhập từ trang admin không
  if (requireAdminLogin && !isAdminLogin) {
    return (
      <Navigate 
        to="/login-admin" 
        state={{ 
          from: location,
          authError: 'Vui lòng đăng nhập từ trang admin để truy cập'
        }} 
        replace 
      />
    );
  }

  // Nếu đã đăng nhập và có quyền phù hợp, hiển thị component con
  return children;
};

export default ProtectedRoute; 