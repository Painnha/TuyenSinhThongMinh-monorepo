import React from 'react';
import Header from '../../Header/Header';
import News from '../../News/News';
import Services from '../../Services/Services';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <Header />
      <main className="main-content">
        <News limit={3} showViewMore={true} />
        <Services />
      </main>
    </div>
  );
};

export default Home; 