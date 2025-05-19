from flask import Blueprint, request, jsonify
from .predict_major import load_model_and_scaler, preprocess_student_data, predict_recommended_majors
import numpy as np
import json
import traceback
from pymongo import MongoClient
import os
from datetime import datetime
from bson import ObjectId

# Kết nối MongoDB - sử dụng biến môi trường thống nhất với Node.js
# Thứ tự ưu tiên: MONGODB_URI -> MONGO_URI -> fallback tới giá trị mặc định
MONGODB_URI = os.getenv('MONGO_URI') 
MONGODB_NAME = os.getenv('MONGO_DB_NAME') 

print(f"Major Recommendation API MongoDB Configuration: URI={MONGODB_URI}, DB={MONGODB_NAME}")
client = MongoClient(MONGODB_URI)
db = client[MONGODB_NAME]

# Thêm debug để kiểm tra kết nối
try:
    # Liệt kê collections trong database để kiểm tra kết nối
    print(f"Collections trong database: {db.list_collection_names()}")
    print(f"Kiểm tra collection interests: {db.interests.count_documents({})}")
    print(f"Kiểm tra collection majors: {db.majors.count_documents({})}")
except Exception as e:
    print(f"Lỗi kết nối MongoDB: {e}")

# Class để hỗ trợ serialization numpy arrays
class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

# Blueprint cho API gợi ý ngành học
major_recommendation_blueprint = Blueprint('major_recommendation', __name__)

# API gợi ý ngành học
@major_recommendation_blueprint.route('/recommend', methods=['POST'])
def recommend_majors():
    try:
        # Lấy dữ liệu từ request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Không có dữ liệu đầu vào'
            }), 400
        
        # Chuyển đổi dữ liệu từ format phức tạp sang format đơn giản
        transformed_data = {
            'scores': {},
            'interests': data.get('interests', []),
            'subject_groups': data.get('examBlocks', []) or data.get('subject_groups', []),
            'tohopthi': data.get('tohopthi', 'TN'),  # Thêm trường tohopthi mặc định 'TN'
            'priority': data.get('priority', {'area': 'KV3', 'subject': '00'})  # Thêm trường priority
        }
        
        # Chuyển đổi điểm số
        if 'scores' in data:
            if 'thpt' in data['scores']:
                # Mapping từ tên tiếng Anh sang tiếng Việt
                score_mapping = {
                    'math': 'Toan',
                    'literature': 'NguVan',
                    'foreignLanguage': 'NgoaiNgu',
                    'physics': 'VatLy',
                    'chemistry': 'HoaHoc',
                    'biology': 'SinhHoc',
                    'history': 'LichSu',
                    'geography': 'DiaLy',
                    'civics': 'GDCD'
                }
                
                for eng_name, vie_name in score_mapping.items():
                    if eng_name in data['scores']['thpt']:
                        transformed_data['scores'][vie_name] = data['scores']['thpt'][eng_name]
            else:
                # Nếu điểm đã được chuyển đổi từ frontend
                transformed_data['scores'] = data['scores']
        
        # Đảm bảo các giá trị điểm số là số
        for subject, score in transformed_data['scores'].items():
            try:
                transformed_data['scores'][subject] = float(score)
            except (ValueError, TypeError):
                print(f"Cảnh báo: Điểm môn {subject} không phải số hợp lệ: {score}, đặt về 0")
                transformed_data['scores'][subject] = 0.0
        
        # In dữ liệu debug chi tiết
        print("\n========== DỮ LIỆU CHUYỂN ĐỔI CHI TIẾT ==========")
        print(json.dumps(transformed_data, indent=2, cls=NpEncoder))
        print("===================================================\n")
        
        # Kiểm tra các trường bắt buộc
        required_fields = ['scores', 'interests', 'subject_groups']
        for field in required_fields:
            if field not in transformed_data:
                return jsonify({
                    'success': False,
                    'message': f'Thiếu trường {field}'
                }), 400
        
        # Sử dụng dữ liệu đã chuyển đổi
        try:
            print("\n========== BẮT ĐẦU QUÁ TRÌNH DỰ ĐOÁN ==========")
            print("1. Đang tải mô hình và scaler...")
            model, scaler, features_info = load_model_and_scaler()
            print("   ✓ Đã tải mô hình thành công")
            
            print("2. Đang tiền xử lý dữ liệu...")
            features, metadata = preprocess_student_data(transformed_data, db)
            print("   ✓ Đã tiền xử lý dữ liệu thành công")
            
            print("3. Đang thực hiện dự đoán...")
            recommendations = predict_recommended_majors(model, scaler, features, metadata, top_k=5)
            print("   ✓ Đã dự đoán thành công")
            print("=================================================\n")
            
            # Kiểm tra cấu trúc kết quả
            if not recommendations or not isinstance(recommendations, list) or len(recommendations) == 0:
                print("CẢNH BÁO: Không có kết quả dự đoán!")
                # Trả về lỗi nếu không có kết quả
                return jsonify({
                    'success': False,
                    'message': 'Không có kết quả dự đoán từ mô hình',
                    'error': 'NO_RESULTS'
                }), 500
            
            # In mẫu kết quả ra log
            print("\n========== MẪU KẾT QUẢ DỰ ĐOÁN ==========")
            print(f"Số lượng ngành được gợi ý: {len(recommendations)}")
            if len(recommendations) > 0:
                print(f"Ngành đầu tiên: {recommendations[0]['major_name']}")
                print(f"Độ phù hợp: {recommendations[0]['confidence']}")
                print(f"Số trường đại học gợi ý: {len(recommendations[0].get('suitable_universities', []))}")
            print("===========================================\n")
            
            # Chuẩn bị dữ liệu để lưu log
            user_id = data.get('userId', None)
            
            # Nếu userId không có hoặc rỗng thì sử dụng số điện thoại (nếu có)
            if not user_id and 'phone' in data:
                user_id = data.get('phone')
            
            # Tạo log dữ liệu
            log_data = {
                "userId": user_id,
                "timestamp": datetime.now(),
                "modelType": "major_recommendation",
                "inputs": transformed_data,
                "outputs": recommendations,
                "isUseful": None,  # Sẽ được cập nhật khi có feedback
                "feedback": None   # Sẽ được cập nhật khi có feedback
            }
            
            # Lưu vào MongoDB và lấy id của bản ghi
            log_id = db.prediction_logs.insert_one(log_data).inserted_id
            
            # Trả về kết quả
            return jsonify({
                'success': True,
                'recommendations': recommendations,
                '_id': str(log_id)  # Thêm ID của log để frontend có thể sử dụng cho feedback
            }), 200
            
        except FileNotFoundError as e:
            print(f"File not found error: {e}")
            return jsonify({
                'success': False,
                'message': str(e),
                'error': 'MODEL_NOT_FOUND'
            }), 500
        
        except ValueError as e:
            print(f"Value error: {e}")
            return jsonify({
                'success': False,
                'message': str(e),
                'error': 'DATA_ERROR'
            }), 400
        
    except Exception as e:
        print(f"Lỗi khi gợi ý ngành học: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f"Đã xảy ra lỗi: {str(e)}",
            'error': 'INTERNAL_ERROR'
        }), 500

# API cập nhật feedback cho dự đoán
@major_recommendation_blueprint.route('/feedback', methods=['POST'])
def update_feedback():
    try:
        data = request.get_json()
        
        if not data or 'predictionId' not in data:
            return jsonify({
                'success': False,
                'message': 'Thiếu thông tin predictionId'
            }), 400
            
        prediction_id = data.get('predictionId')
        is_useful = data.get('isUseful')
        feedback_text = data.get('feedback')
        
        # Cập nhật log trong MongoDB
        result = db.prediction_logs.update_one(
            {'_id': ObjectId(prediction_id)},
            {'$set': {
                'isUseful': is_useful,
                'feedback': feedback_text,
                'feedbackDate': datetime.now()
            }}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Đã cập nhật feedback thành công'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy dự đoán với ID đã cung cấp'
            }), 404
            
    except Exception as e:
        print(f"Lỗi khi cập nhật feedback: {e}")
        return jsonify({
            'success': False,
            'message': f"Đã xảy ra lỗi: {str(e)}"
        }), 500

# API lấy danh sách sở thích
@major_recommendation_blueprint.route('/interests', methods=['GET'])
def get_interests():
    try:
        interests = list(db.interests.find({}, {'_id': 1, 'name': 1, 'description': 1}))
        
        # Chuyển ObjectId thành string
        for interest in interests:
            interest['_id'] = str(interest['_id'])
        
        return jsonify({
            'success': True,
            'data': interests
        }), 200
        
    except Exception as e:
        print(f"Lỗi khi lấy danh sách sở thích: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# API lấy danh sách tổ hợp môn
@major_recommendation_blueprint.route('/subject-combinations', methods=['GET'])
def get_subject_combinations():
    try:
        combinations = list(db.subject_combinations.find({}, {'_id': 1, 'code': 1, 'name': 1, 'subjects': 1}))
        
        # Chuyển ObjectId thành string
        for combination in combinations:
            combination['_id'] = str(combination['_id'])
        
        return jsonify({
            'success': True,
            'data': combinations
        }), 200
        
    except Exception as e:
        print(f"Lỗi khi lấy danh sách tổ hợp môn: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500 