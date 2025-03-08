import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './Components/layout/Header';
import Home from './Components/Screens/Home/Home';
import NewsListScreen from './Components/Screens/NewsListScreen/NewsListScreen';
import NewsDetailScreen from './Components/Screens/NewsDetailScreen/NewsDetailScreen';
import LoginScreen from './Components/Screens/Auth/LoginScreen';
import Profile from './Components/Screens/Profile/Profile';
import RegisterScreen from './Components/Screens/Auth/RegisterScreen';
import ForgotPasswordScreen from './Components/Screens/Auth/ForgotPasswordScreen';
import ConsultationPage from './Components/ConsultationPage/ConsultationPage';
import TranscriptCalculator from './Components/TranscriptCalculator/TranscriptCalculator';
import BenchmarkSearch from './Components/BenchmarkSearch/BenchmarkSearch';
import UniversityDetail from './Components/UniversityDetail/UniversityDetail';
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