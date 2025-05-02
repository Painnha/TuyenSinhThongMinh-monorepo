import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
// import { ThemeProvider, createTheme } from '@mui/material/styles';
// import CssBaseline from '@mui/material/CssBaseline';
import Header from './Components/layout/Header';
import Home from './Components/Screens/Home/Home';
import NewsListScreen from './Components/Screens/NewsListScreen/NewsListScreen';
import NewsDetailScreen from './Components/Screens/NewsDetailScreen/NewsDetailScreen';
import LoginScreen from './Components/Screens/Auth/LoginScreen';
import Profile from './Components/Screens/Profile/Profile';
import RegisterScreen from './Components/Screens/Auth/RegisterScreen';
import ForgotPasswordScreen from './Components/Screens/Auth/ForgotPasswordScreen';
import AdminLoginScreen from './Components/Screens/Auth/AdminLoginScreen';
import ConsultationPage from './Components/ConsultationPage/ConsultationPage';
import TranscriptCalculator from './Components/TranscriptCalculator/TranscriptCalculator';
import BenchmarkSearch from './Components/BenchmarkSearch/BenchmarkSearch';
import UniversityDetail from './Components/UniversityDetail/UniversityDetail';
import AdminDashboard from './Components/Screens/Admin/AdminDashboard';
import ProtectedRoute from './Components/utils/ProtectedRoute';
import './App.css';

// Tạm thời loại bỏ ThemeProvider để tìm nguyên nhân lỗi
// const theme = createTheme();

// Component để kiểm tra và render Header
const AppContent = () => {
  const location = useLocation();
  
  // Danh sách các đường dẫn không hiển thị header
  const authPaths = ['/login', '/register', '/forgot-password', '/login-admin'];
  const adminPaths = ['/admin', '/admin/*'];
  
  // Kiểm tra xem có nên hiển thị header không
  const shouldShowHeader = !authPaths.includes(location.pathname) && 
                          !adminPaths.some(path => location.pathname.startsWith('/admin'));

  return (
    <div className={`App ${shouldShowHeader ? 'with-header' : ''}`}>
      {shouldShowHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/news" element={<NewsListScreen />} />
        <Route path="/news/:id" element={<NewsDetailScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/login-admin" element={<AdminLoginScreen />} />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/tu-van" element={<ConsultationPage />} />
        <Route path="/tinh-diem" element={<TranscriptCalculator />} />
        <Route path="/diem-chuan" element={<BenchmarkSearch />} />
        <Route path="/university/:code" element={<UniversityDetail />} />
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['admin']} requireAdminLogin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;