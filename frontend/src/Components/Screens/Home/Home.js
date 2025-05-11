import React from 'react';
import Services from '../../Services/Services';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero text-center">
        <div className="container">
          <h1 className="display-4 fw-bold mb-4">Hệ thống gợi ý ngành học thông minh</h1>
          <p className="lead mb-5">Giúp học sinh lựa chọn ngành học phù hợp dựa trên điểm số, sở thích và xu hướng thị trường</p>
          <div className="d-flex justify-content-center gap-3">
            <a href="/tu-van" className="btn btn-light btn-lg">Nhận gợi ý ngành học</a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mb-5">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card p-4 text-center h-100">
              <div className="feature-icon">📊</div>
              <h3 className="card-title">Phân tích điểm số</h3>
              <p className="card-text">Hệ thống phân tích điểm số các môn học để đánh giá khả năng phù hợp với các khối ngành khác nhau.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-4 text-center h-100">
              <div className="feature-icon">🧩</div>
              <h3 className="card-title">Kết hợp sở thích</h3>
              <p className="card-text">Tìm kiếm sự phù hợp giữa sở thích cá nhân và đặc điểm của từng ngành học.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-4 text-center h-100">
              <div className="feature-icon">📈</div>
              <h3 className="card-title">Xu hướng thị trường</h3>
              <p className="card-text">Cập nhật thông tin về nhu cầu thị trường lao động để đưa ra lựa chọn bền vững.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mb-5">
        <h2 className="text-center mb-5">Cách hệ thống hoạt động</h2>
        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-4 g-4">
          <div className="col">
            <div className="card p-4 text-center h-100">
              <h4 className="fw-bold text-primary">01</h4>
              <h5 className="card-title">Nhập thông tin</h5>
              <p className="card-text">Điểm số các môn học, sở thích cá nhân và các thông tin ưu tiên</p>
            </div>
          </div>
          <div className="col">
            <div className="card p-4 text-center h-100">
              <h4 className="fw-bold text-primary">02</h4>
              <h5 className="card-title">Phân tích dữ liệu</h5>
              <p className="card-text">Hệ thống phân tích và tính toán độ phù hợp với các ngành học</p>
            </div>
          </div>
          <div className="col">
            <div className="card p-4 text-center h-100">
              <h4 className="fw-bold text-primary">03</h4>
              <h5 className="card-title">Gợi ý ngành học</h5>
              <p className="card-text">Đưa ra top 3 ngành phù hợp nhất với thông tin đã cung cấp</p>
            </div>
          </div>
          <div className="col">
            <div className="card p-4 text-center h-100">
              <h4 className="fw-bold text-primary">04</h4>
              <h5 className="card-title">Chi tiết phân tích</h5>
              <p className="card-text">Hiển thị chi tiết lý do và mức độ phù hợp của từng ngành</p>
            </div>
          </div>
        </div>
      </section>

      <main className="main-content">
        <Services />
      </main>
    </div>
  );
};

export default Home; 