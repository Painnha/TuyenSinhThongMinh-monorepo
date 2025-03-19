import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RecommendationResult.css';

const RecommendationResult = ({ recommendations }) => {
    const navigate = useNavigate();

    if (!recommendations || recommendations.length === 0) {
        return (
            <div className="card p-5 text-center">
                <h3 className="mb-4">Không tìm thấy ngành học phù hợp</h3>
                <p className="text-muted mb-4">Vui lòng thử lại với các thông tin khác.</p>
                <button onClick={() => navigate('/recommend')} className="btn btn-primary">Quay lại thử lại</button>
            </div>
        );
    }

    return (
        <div>
            {/* Page Header */}
            <header className="page-header text-center">
                <div className="container">
                    <h1 className="display-5 fw-bold mb-3">Kết quả gợi ý ngành học</h1>
                    <p className="lead">Dưới đây là những ngành học phù hợp nhất với thông tin bạn đã cung cấp</p>
                </div>
            </header>

            {/* Main Content */}
            <div className="container">
                <div className="row justify-content-center mb-4">
                    <div className="col-lg-10">
                        <div className="d-flex justify-content-between mb-4">
                            <button onClick={() => navigate('/recommend')} className="btn btn-outline-primary">
                                <i className="bi bi-arrow-left"></i> Quay lại
                            </button>
                            <button onClick={() => window.print()} className="btn btn-primary">
                                <i className="bi bi-printer"></i> In kết quả
                            </button>
                        </div>

                        {/* Top Major Recommendations */}
                        {recommendations.map((major, index) => (
                            <div 
                                key={index}
                                className={`card major-card p-4 ${
                                    index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : ''
                                }`}
                            >
                                <div className="row">
                                    <div className="col-md-8">
                                        <div className="d-flex align-items-center mb-3">
                                            <h3 className="major-title mb-0">{index + 1}. {major.name}</h3>
                                            <span className="score-badge ms-3">{major.score}%</span>
                                        </div>
                                        <p className="text-muted">{major.category}</p>
                                        
                                        {/* Score Components */}
                                        <div className="mt-4">
                                            <h5>Phân tích điểm số</h5>
                                            
                                            {/* Subject Score Component */}
                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="component-label">Điểm môn học</span>
                                                    <span className="component-value">
                                                        {major.score_components.subject_score.value}%
                                                    </span>
                                                </div>
                                                <div className="progress">
                                                    <div 
                                                        className="progress-bar progress-bar-subject" 
                                                        role="progressbar" 
                                                        style={{width: `${major.score_components.subject_score.value}%`}}
                                                        aria-valuenow={major.score_components.subject_score.value}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    ></div>
                                                </div>
                                                <div className="mt-2">
                                                    <small className="text-muted">
                                                        Tổ hợp thi tốt nhất: {major.score_components.subject_score.best_group}
                                                    </small>
                                                </div>
                                            </div>
                                            
                                            {/* Interest Match Component */}
                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="component-label">Mức độ phù hợp sở thích</span>
                                                    <span className="component-value">
                                                        {major.score_components.interest_match.value}%
                                                    </span>
                                                </div>
                                                <div className="progress">
                                                    <div 
                                                        className="progress-bar progress-bar-interest" 
                                                        role="progressbar" 
                                                        style={{width: `${major.score_components.interest_match.value}%`}}
                                                        aria-valuenow={major.score_components.interest_match.value}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    ></div>
                                                </div>
                                                <div className="mt-2">
                                                    {major.score_components.interest_match.matching_interests.length > 0 ? (
                                                        <div>
                                                            {major.score_components.interest_match.matching_interests.map((interest, i) => (
                                                                <span key={i} className="matches-tag">{interest}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <small className="text-muted">Không có sở thích phù hợp.</small>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Market Trend Component */}
                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="component-label">Xu hướng thị trường</span>
                                                    <span className="component-value">
                                                        {major.score_components.market_trend.value}%
                                                    </span>
                                                </div>
                                                <div className="progress">
                                                    <div 
                                                        className="progress-bar progress-bar-market" 
                                                        role="progressbar" 
                                                        style={{width: `${major.score_components.market_trend.value}%`}}
                                                        aria-valuenow={major.score_components.market_trend.value}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    ></div>
                                                </div>
                                            </div>
                                            
                                            {/* Priority Score Component */}
                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="component-label">Điểm ưu tiên</span>
                                                    <span className="component-value">
                                                        {major.score_components.priority_score.value}%
                                                    </span>
                                                </div>
                                                <div className="progress">
                                                    <div 
                                                        className="progress-bar progress-bar-priority" 
                                                        role="progressbar" 
                                                        style={{width: `${major.score_components.priority_score.value}%`}}
                                                        aria-valuenow={major.score_components.priority_score.value}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="col-md-4">
                                        <div className="card-body h-100 d-flex flex-column justify-content-between">
                                            <div>
                                                <h5>Sở thích phù hợp</h5>
                                                <ul>
                                                    {major.interests.map((interest, i) => (
                                                        <li key={i}>{interest}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            
                                            <div className="mt-4">
                                                <h5>Xu hướng thị trường</h5>
                                                <div className="progress mt-2">
                                                    <div 
                                                        className="progress-bar bg-success" 
                                                        role="progressbar" 
                                                        style={{width: `${major.market_trend * 100}%`}}
                                                        aria-valuenow={major.market_trend * 100}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    ></div>
                                                </div>
                                                <div className="d-flex justify-content-between mt-1">
                                                    <small>Thấp</small>
                                                    <small>{(major.market_trend * 100).toFixed(1)}%</small>
                                                    <small>Cao</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Bottom Navigation */}
                        <div className="d-flex justify-content-between mt-4">
                            <button onClick={() => navigate('/recommend')} className="btn btn-outline-primary">
                                <i className="bi bi-arrow-left"></i> Quay lại
                            </button>
                            <button onClick={() => navigate('/')} className="btn btn-primary">Trang chủ</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationResult; 