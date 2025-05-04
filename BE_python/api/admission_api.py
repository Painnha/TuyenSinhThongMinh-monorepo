from flask import Blueprint, jsonify

# Import blueprint dự đoán xác suất đậu đại học
try:
    from BE_python.ai_models.dudoanxacxuat.api_integration import admission_prediction_blueprint
    ADMISSION_PREDICTION_AVAILABLE = True
except ImportError:
    print("CẢNH BÁO: Không thể import module dự đoán xác suất đậu đại học")
    ADMISSION_PREDICTION_AVAILABLE = False

# Tạo blueprint chính cho các API tuyển sinh
admission_api = Blueprint('admission_api', __name__)

@admission_api.route('/')
def index():
    """
    Endpoint thông tin về các API tuyển sinh
    """
    available_endpoints = {
        "endpoints": [
            {
                "path": "/api/admission/",
                "method": "GET",
                "description": "Thông tin về các API tuyển sinh"
            }
        ]
    }
    
    # Thêm thông tin về API dự đoán xác suất đậu nếu có
    if ADMISSION_PREDICTION_AVAILABLE:
        available_endpoints["endpoints"].extend([
            {
                "path": "/api/admission/predict",
                "method": "POST",
                "description": "Dự đoán xác suất đậu đại học cho một ngành/trường"
            },
            {
                "path": "/api/admission/batch-predict",
                "method": "POST",
                "description": "Dự đoán xác suất đậu đại học cho nhiều ngành/trường"
            }
        ])
    
    return jsonify(available_endpoints)

# Đăng ký blueprint dự đoán xác suất đậu nếu có sẵn
if ADMISSION_PREDICTION_AVAILABLE:
    # Đăng ký các route từ blueprint
    admission_api.register_blueprint(admission_prediction_blueprint, url_prefix='/predict')
    
    # Copy route batch-predict từ blueprint gốc
    @admission_api.route('/batch-predict', methods=['POST'])
    def batch_predict():
        """
        Proxy endpoint để gọi batch-predict từ blueprint gốc
        """
        from BE_python.ai_models.dudoanxacxuat.api_integration import batch_predict_admission
        return batch_predict_admission() 