import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Thêm thư mục hiện tại vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.config import API_HOST, API_PORT, DEBUG_MODE
from api.recommendation_api import recommendation_api
from api.admission_api import admission_api
from api.data_api import data_api

# Tải biến môi trường
load_dotenv()

def create_app():
    """Tạo và cấu hình ứng dụng Flask"""
    app = Flask(__name__)
    
    # Cấu hình CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Đăng ký các blueprint
    app.register_blueprint(recommendation_api, url_prefix='/api/recommendation')
    app.register_blueprint(admission_api, url_prefix='/api/admission')
    app.register_blueprint(data_api, url_prefix='/api/data')
    
    # Định nghĩa route chính
    @app.route('/')
    def index():
        return jsonify({
            'status': 'ok',
            'message': 'TuyenSinhThongMinh AI API Service',
            'version': '1.0.0'
        })
    
    # Xử lý lỗi 404
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            'status': 'error',
            'message': 'Không tìm thấy endpoint này',
            'error': str(e)
        }), 404
    
    # Xử lý lỗi 500
    @app.errorhandler(500)
    def server_error(e):
        return jsonify({
            'status': 'error',
            'message': 'Lỗi máy chủ',
            'error': str(e)
        }), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(
        host=API_HOST,
        port=API_PORT,
        debug=DEBUG_MODE
    ) 