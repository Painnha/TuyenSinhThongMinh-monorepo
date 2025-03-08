import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header/Header';
import Home from './pages/home/Home';
import NewsListScreen from './pages/news/NewsListScreen';
import NewsDetailScreen from './pages/news/NewsDetailScreen';
import LoginScreen from './pages/auth/LoginScreen';
import Profile from './pages/profile/Profile';
import RegisterScreen from './pages/auth/RegisterScreen';
import ForgotPasswordScreen from './pages/auth/ForgotPasswordScreen';
import ConsultationPage from './pages/consultation/ConsultationPage';
import TranscriptCalculator from './pages/calculator/TranscriptCalculator';
import BenchmarkSearch from './pages/benchmark/BenchmarkSearch';
import UniversityDetail from './pages/university/UniversityDetail';
import './App.css';

// Component để kiểm tra và render Header
const AppContent = () => {
  const location = useLocation();
  
  // Danh sách các đường dẫn không hiển thị header
  const authPaths = ['/login', '/register', '/forgot-password'];
  
  // Kiểm tra xem có nên hiển thị header không
  const shouldShowHeader = !authPaths.includes(location.pathname);

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
        <Route path="/profile" element={<Profile />} />
        <Route path="/tu-van" element={<ConsultationPage />} />
        <Route path="/tinh-diem" element={<TranscriptCalculator />} />
        <Route path="/diem-chuan" element={<BenchmarkSearch />} />
        <Route path="/university/:code" element={<UniversityDetail />} />
        {/* Add more routes here */}
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