import React, { useState } from 'react';
import { recommendationService } from '../../../services/recommendationService';

const DataManagement = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [formData, setFormData] = useState({
        numSamples: 100,
        method: 'bayesian'
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'numSamples' ? parseInt(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const response = await recommendationService.generateData(
                formData.numSamples,
                formData.method
            );
            setResult({
                success: true,
                message: `Đã tạo thành công ${response.count} mẫu dữ liệu. File được lưu tại: ${response.file_path}`
            });
        } catch (error) {
            setResult({
                success: false,
                message: `Lỗi: ${error.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="data-management" style={{ padding: '20px' }}>
            <h2>Quản lý dữ liệu</h2>
            
            <div className="data-generation-section" style={{ marginTop: '20px' }}>
                <h3>Tạo dữ liệu mẫu</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            Số lượng mẫu:
                            <input
                                type="number"
                                name="numSamples"
                                value={formData.numSamples}
                                onChange={handleInputChange}
                                min="1"
                                max="1000"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    marginTop: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}
                            />
                        </label>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            Phương pháp:
                            <select
                                name="method"
                                value={formData.method}
                                onChange={handleInputChange}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    marginTop: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}
                            >
                                <option value="bayesian">Bayesian</option>
                                <option value="neural">Neural Network</option>
                            </select>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Đang tạo...' : 'Tạo dữ liệu mẫu'}
                    </button>
                </form>

                {result && (
                    <div
                        style={{
                            marginTop: '20px',
                            padding: '15px',
                            borderRadius: '4px',
                            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
                            color: result.success ? '#155724' : '#721c24',
                            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`
                        }}
                    >
                        {result.message}
                    </div>
                )}
            </div>

            <div className="model-training-section" style={{ marginTop: '40px' }}>
                <h3>Huấn luyện mô hình</h3>
                <p>Chức năng đang được phát triển...</p>
            </div>
        </div>
    );
};

export default DataManagement; 