import React from 'react';
import News from '../../News/News';
import Services from '../../Services/Services';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <main className="main-content">
        <News limit={3} showViewMore={true} />
        <Services />
      </main>
    </div>
  );
};

export default Home; 