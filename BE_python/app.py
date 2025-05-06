import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Tải biến môi trường
load_dotenv()

# Thêm thư mục hiện tại vào sys.path để có thể import các module từ thư mục con
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Hiển thị các biến môi trường liên quan đến port
print(f"Python API Environment Variables:")
print(f"- API_PORT: {os.environ.get('API_PORT')}")
print(f"- PYTHON_API_PORT: {os.environ.get('PYTHON_API_PORT')}")

# Kiểm tra và khởi tạo mô hình nếu cần
try:
    from ai_models.dudoanxacxuat.initialize_model import initialize_model
    model_initialized = initialize_model()
    print(f"Khởi tạo mô hình thành công: {model_initialized}")
except Exception as e:
    print(f"Lỗi khi khởi tạo mô hình: {e}")
    model_initialized = False

# Import API modules
try:
    from ai_models.dudoanxacxuat.api_integration import admission_prediction_blueprint
    ADMISSION_PREDICTION_AVAILABLE = True
    print("API dự đoán xác suất đậu đại học đã được tải thành công")
except ImportError as e:
    print(f"CẢNH BÁO: Không thể import module dự đoán xác suất đậu đại học: {e}")
    ADMISSION_PREDICTION_AVAILABLE = False

# Import module gợi ý ngành học
try:
    from ai_models.goiynganhhoc.api_integration import major_recommendation_blueprint
    MAJOR_RECOMMENDATION_AVAILABLE = True
    print("API gợi ý ngành học đã được tải thành công")
except ImportError as e:
    print(f"CẢNH BÁO: Không thể import module gợi ý ngành học: {e}")
    MAJOR_RECOMMENDATION_AVAILABLE = False

# Tạo Flask app
app = Flask(__name__)
CORS(app)

# Đăng ký blueprint API
@app.route('/')
def index():
    return jsonify({
        "message": "Python API Server đang hoạt động",
        "model_initialized": model_initialized,
        "endpoints": [
            {
                "path": "/api/data/admission/predict-ai",
                "method": "POST",
                "description": "Dự đoán xác suất đậu đại học",
                "available": ADMISSION_PREDICTION_AVAILABLE
            },
            {
                "path": "/api/recommendation/recommend",
                "method": "POST",
                "description": "Gợi ý ngành học",
                "available": MAJOR_RECOMMENDATION_AVAILABLE
            }
        ]
    })

# Đăng ký blueprint dự đoán xác suất đậu đại học
if ADMISSION_PREDICTION_AVAILABLE:
    app.register_blueprint(admission_prediction_blueprint, url_prefix='/api/data/admission')
    print(f"Đã đăng ký blueprint dự đoán xác suất đậu đại học: /api/data/admission/predict-ai")
else:
    @app.route('/api/data/admission/predict-ai', methods=['POST'])
    def predict_admission_placeholder():
        return jsonify({
            "success": False,
            "message": "API dự đoán xác suất đậu đại học không khả dụng"
        }), 503

# Đăng ký blueprint gợi ý ngành học
if MAJOR_RECOMMENDATION_AVAILABLE:
    app.register_blueprint(major_recommendation_blueprint, url_prefix='/api/recommendation')
    print(f"Đã đăng ký blueprint gợi ý ngành học: /api/recommendation/recommend")
else:
    @app.route('/api/recommendation/recommend', methods=['POST'])
    def recommend_majors_placeholder():
        return jsonify({
            "success": False,
            "message": "API gợi ý ngành học không khả dụng"
        }), 503

if __name__ == '__main__':
    # Lấy port từ biến môi trường hoặc sử dụng 5001 là mặc định - QUAN TRỌNG
    port = int(os.environ.get('PYTHON_API_PORT', 5001))
    if port == 5000:
        print("CẢNH BÁO: Python API đang cố gắng sử dụng port 5000 - có thể xung đột với Node.js server!")
        print("Thay đổi sang port 5001...")
        port = 5001
    
    # Hiển thị thông tin khởi động
    print(f"Starting Python API server on port {port}")
    print(f"Admission prediction API available: {ADMISSION_PREDICTION_AVAILABLE}")
    print(f"Host: {os.environ.get('API_HOST', '0.0.0.0')}")
    print(f"URL Endpoint for prediction: http://localhost:{port}/api/data/admission/predict-ai")
    
    # Khởi động server
    app.run(host=os.environ.get('API_HOST', '0.0.0.0'), port=port, debug=True) 

    # Thêm vào cuối file app.py, trước app.run()
    print("Các routes đã đăng ký:")
    for rule in app.url_map.iter_rules():
        print(f"Route: {rule}") 