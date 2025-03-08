import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../../Header/Header';
import './NewsDetailScreen.css';
import tintuc1 from '../../Image/tintuc1.png';

const NewsDetailScreen = () => {
  const { id } = useParams();

  // Giả lập dữ liệu tin tức chi tiết (sau này sẽ lấy từ API)
  const newsDetails = {
    1: {
      title: '6 điểm mới trong Quy chế thi tốt nghiệp THPT năm 2025 tại Thông tư 24',
      description: '6 điểm mới trong Quy chế thi tốt nghiệp THPT năm 2025 tại Thông tư 24',
      content: `
        <p>Bộ Giáo dục và Đào tạo vừa ban hành Thông tư 24/2023/TT-BGDĐT về việc sửa đổi, bổ sung một số điều của Quy chế thi tốt nghiệp THPT. Thông tư này có hiệu lực từ ngày 8/1/2024 và được áp dụng từ năm 2025.</p>
        <p>Dưới đây là 6 điểm mới đáng chú ý trong Quy chế thi tốt nghiệp THPT:</p>
        <h3>1. Đăng ký dự thi</h3>
        <p>- Thí sinh tự do được đăng ký dự thi tại địa phương nơi cư trú hoặc nơi đã tốt nghiệp THPT.</p>
        <p>- Các trường THPT chuẩn bị điều kiện về cơ sở vật chất, trang thiết bị để tổ chức thi.</p>
        <h3>2. Quy định về đề thi</h3>
        <p>- Nội dung đề thi nằm trong chương trình THPT, chủ yếu là lớp 12.</p>
        <p>- Đảm bảo phân loại được trình độ của thí sinh.</p>
        <h3>3. Coi thi</h3>
        <p>- Tăng cường các biện pháp đảm bảo an ninh, an toàn.</p>
        <p>- Sử dụng công nghệ trong quản lý thi.</p>
      `,
      image: tintuc1,
      date: '05/03/2024',
      author: 'Admin'
    },
    // Thêm các tin tức khác ở đây
  };

  const news = newsDetails[id];

  if (!news) {
    return (
      <div className="news-detail-screen">
        <Header />
        <main className="main-content">
          <div className="container">
            <h2>Không tìm thấy tin tức</h2>
            <Link to="/news" className="back-button">Quay lại danh sách tin tức</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="news-detail-screen">
      <Header />
      <main className="main-content">
        <div className="container">
          <div className="news-detail">
            <h1 className="news-title">{news.title}</h1>
            <div className="news-meta">
              <span className="news-date">{news.date}</span>
              <span className="news-author">Đăng bởi: {news.author}</span>
            </div>
            <div className="news-image">
              <img src={news.image} alt={news.title} />
            </div>
            <div 
              className="news-content"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />
            <Link to="/news" className="back-button">Quay lại danh sách tin tức</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewsDetailScreen; 