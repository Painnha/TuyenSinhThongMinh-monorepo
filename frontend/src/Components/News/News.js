import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './News.css';
import tintuc1 from '../Image/tintuc1.png';
import tintuc2 from '../Image/tintuc1.png';
import tintuc3 from '../Image/tintuc1.png';

const News = ({ limit = 3, showViewMore = true }) => {
  const navigate = useNavigate();

  const news = [
    {
      id: 1,
      title: '6 điểm mới trong Quy chế thi tốt nghiệp THPT năm 2025 tại Thông tư 24',
      description: '6 điểm mới trong Quy chế thi tốt nghiệp THPT năm 2025 tại Thông tư 24',
      image: tintuc1,
      link: '/news/1'
    },
    {
      id: 2,
      title: 'THÔNG TIN TUYỂN SINH MỚI NHẤT 2025',
      description: 'Bộ Giáo dục và Đào tạo mới đây đã công bố danh mục 20 phương thức xét tuyển đại học năm 2024; đồng thời có một số lưu ý với thí sinh và cơ sở đào tạo.',
      image: tintuc2,
      link: '/news/2'
    },
    {
      id: 3,
      title: 'Xét tuyển bổ sung IUH 2024',
      description: 'Chương trình đào tạo 24 tháng - Cấp bằng Thạc sĩ Quốc tế',
      image: tintuc3,
      link: '/news/3'
    }
  ];

  const handleNewsClick = (link) => {
    navigate(link);
  };

  const displayedNews = limit ? news.slice(0, limit) : news;

  return (
    <section className="news-section">
      <div className="container">
        <h2 className="section-title">Tin tức</h2>
        <div className="news-list">
          {displayedNews.map((item) => (
            <div key={item.id} className="news-item">
              <div 
                className="news-image" 
                onClick={() => handleNewsClick(item.link)}
                role="button"
                tabIndex={0}
              >
                <img src={item.image} alt={item.title} />
              </div>
              <div className="news-content">
                <h3 
                  className="news-title"
                  onClick={() => handleNewsClick(item.link)}
                  role="button"
                  tabIndex={0}
                >
                  {item.title}
                </h3>
                <p className="news-description">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
        {showViewMore && (
          <div className="view-more-container">
            <Link to="/news" className="view-more-button">Xem thêm tin tức</Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default News; 