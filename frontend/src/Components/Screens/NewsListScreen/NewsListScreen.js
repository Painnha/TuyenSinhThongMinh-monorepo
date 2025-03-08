import React from 'react';
import Header from '../../Header/Header';
import News from '../../News/News';
import './NewsListScreen.css';

const NewsListScreen = () => {
  return (
    <div className="news-list-screen">
      <Header />
      <main className="main-content">
        <News limit={0} showViewMore={false} />
      </main>
    </div>
  );
};

export default NewsListScreen; 