import React from 'react';
import { Link } from 'react-router-dom';
import './Services.css';

const Services = () => {
  const services = [
    {
      id: 1,
      title: 'Tính điểm xét học bạ',
      description: 'Công cụ Tính điểm xét học bạ THPT',
      icon: '➕',
      link: '/tinh-diem'
    },
    {
      id: 2,
      title: 'Xem điểm chuẩn đại học',
      description: 'Tra cứu điểm chuẩn theo từng phương thức xét tuyển',
      icon: '🔍',
      link: '/diem-chuan'
    },
    {
      id: 3,
      title: 'Tư vấn chọn ngành',
      description: 'Công cụ dự đoán ngành phù hợp với bạn',
      icon: '💡',
      link: '/tu-van'
    }
  ];

  return (
    <section className="services-section">
      <div className="container">
        <h2 className="section-title">Tư vấn chọn ngành</h2>
        <div className="services-grid">
          {services.map((service) => (
            <Link to={service.link} key={service.id} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services; 