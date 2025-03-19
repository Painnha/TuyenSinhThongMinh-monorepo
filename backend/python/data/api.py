from flask import Blueprint, request, jsonify, Flask
import pandas as pd
import os
from recommender import recommend_majors
from data_generator import generate_synthetic_data
from flask_cors import CORS
import logging

# Cấu hình logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Tạo Flask app
app = Flask(__name__)

# Cấu hình CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Load data
def load_data():
    try:
        data_dir = os.path.dirname(os.path.abspath(__file__))
        interests_df = pd.read_csv(os.path.join(data_dir, 'interests.csv'))
        majors_df = pd.read_csv(os.path.join(data_dir, 'major_data.csv'))
        subject_combinations_df = pd.read_csv(os.path.join(data_dir, 'subject_combinations.csv'))
        logger.info("Data loaded successfully")
        return interests_df, majors_df, subject_combinations_df
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        raise e

# Load data at startup
interests_df, majors_df, subject_combinations_df = load_data()

@app.before_request
def log_request_info():
    logger.info(f"Received {request.method} request to {request.path}")
    logger.debug(f"Headers: {dict(request.headers)}")
    if request.data:
        logger.debug(f"Request data: {request.get_data(as_text=True)}")

@app.after_request
def after_request(response):
    logger.info(f"Response status: {response.status}")
    logger.debug(f"Response data: {response.get_data(as_text=True)}")
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

# Test route
@app.route('/api/test')
def test():
    logger.info("Test endpoint called")
    return jsonify({
        'status': 'ok',
        'message': 'API is running'
    })

# API routes
@app.route('/api/recommend', methods=['POST'])
def get_recommendations():
    try:
        logger.info("Processing recommendation request")
        # Lấy dữ liệu từ request
        student_data = request.json
        if not student_data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
            
        logger.debug(f"Processing data: {student_data}")
        
        # Gọi hàm gợi ý
        recommendations = recommend_majors(
            student_data=student_data,
            interests_df=interests_df,
            majors_df=majors_df,
            subject_combinations_df=subject_combinations_df
        )
        
        return jsonify({
            'success': True,
            'data': recommendations
        })
        
    except Exception as e:
        logger.error(f"Error in get_recommendations: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/generate-data', methods=['POST'])
def generate_data():
    try:
        logger.info("Processing generate-data request")
        data = request.json
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
            
        logger.debug(f"Processing data: {data}")
        
        num_samples = int(data.get('num_samples', 100))
        method = data.get('method', 'bayesian')
        
        logger.info(f"Generating {num_samples} samples using {method} method")
        
        # Tạo dữ liệu
        synthetic_data = generate_synthetic_data(
            num_samples=num_samples,
            method=method,
            interests_df=interests_df,
            majors_df=majors_df,
            subject_combinations_df=subject_combinations_df
        )
        
        # Lưu dữ liệu
        output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'synthetic_data_{method}.csv')
        synthetic_data.to_csv(output_path, index=False)
        logger.info(f"Data saved to {output_path}")
        
        return jsonify({
            'success': True,
            'file_path': output_path,
            'count': len(synthetic_data)
        })
        
    except Exception as e:
        logger.error(f"Error in generate_data: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/')
def index():
    routes = {
        'test': '/api/test',
        'recommend': '/api/recommend [POST]',
        'generate_data': '/api/generate-data [POST]'
    }
    return jsonify(routes)

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    logger.info("API endpoints:")
    logger.info("  - GET /")
    logger.info("  - GET /api/test")
    logger.info("  - POST /api/recommend")
    logger.info("  - POST /api/generate-data")

    app.run(host='0.0.0.0', port=5001, debug=True) 