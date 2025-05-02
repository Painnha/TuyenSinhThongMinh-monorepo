import os
import sys
from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest

# Thêm thư mục cha vào sys.path để import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_utils import db_client

# Tạo blueprint cho API
data_api = Blueprint('data_api', __name__)

@data_api.route('/subject-combinations', methods=['GET'])
def get_subject_combinations():
    """
    Lấy danh sách tổ hợp môn
    
    Returns:
        JSON chứa danh sách tổ hợp môn
    """
    try:
        combinations = db_client.fetch_data('subject_combinations')
        return jsonify({
            'success': True,
            'data': combinations
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@data_api.route('/interests', methods=['GET'])
def get_interests():
    """
    Lấy danh sách sở thích
    
    Returns:
        JSON chứa danh sách sở thích
    """
    try:
        interests = db_client.fetch_data('interests')
        return jsonify({
            'success': True,
            'data': interests
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@data_api.route('/universities', methods=['GET'])
def get_universities():
    """
    Lấy danh sách trường đại học
    
    Returns:
        JSON chứa danh sách trường đại học
    """
    try:
        # Lấy tham số truy vấn
        query = {}
        
        # Lọc theo mã trường
        code = request.args.get('code')
        if code:
            query['code'] = code
        
        # Lọc theo khu vực
        region = request.args.get('region')
        if region:
            query['location.region'] = region
        
        # Lọc theo thành phố
        city = request.args.get('city')
        if city:
            query['location.city'] = city
        
        # Lọc theo mức điểm đầu vào
        level = request.args.get('level')
        if level:
            query['level'] = level
        
        # Giới hạn số lượng kết quả
        limit = int(request.args.get('limit', 0))
        
        # Thực hiện truy vấn
        universities = db_client.fetch_data('universities', query, limit=limit)
        
        return jsonify({
            'success': True,
            'data': universities,
            'count': len(universities)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@data_api.route('/majors', methods=['GET'])
def get_majors():
    """
    Lấy danh sách ngành học
    
    Returns:
        JSON chứa danh sách ngành học
    """
    try:
        # Lấy tham số truy vấn
        query = {}
        
        # Lọc theo mã ngành
        code = request.args.get('code')
        if code:
            query['code'] = code
        
        # Lọc theo tên ngành (tìm kiếm mờ)
        name = request.args.get('name')
        if name:
            query['nameNormalized'] = {'$regex': name.lower(), '$options': 'i'}
        
        # Lọc theo danh mục
        category = request.args.get('category')
        if category:
            query['category'] = category
        
        # Lọc theo sở thích
        interest = request.args.get('interest')
        if interest:
            query['interests.name'] = interest
        
        # Giới hạn số lượng kết quả
        limit = int(request.args.get('limit', 0))
        
        # Thực hiện truy vấn
        majors = db_client.fetch_data('majors', query, limit=limit)
        
        return jsonify({
            'success': True,
            'data': majors,
            'count': len(majors)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@data_api.route('/admission-criteria', methods=['GET'])
def get_admission_criteria():
    """
    Lấy tiêu chí tuyển sinh theo trường và ngành
    
    Returns:
        JSON chứa tiêu chí tuyển sinh
    """
    try:
        # Lấy tham số truy vấn
        query = {}
        
        # Lọc theo mã/tên trường
        university = request.args.get('university')
        if university:
            query['$or'] = [
                {'universityCode': university},
                {'universityName': {'$regex': university, '$options': 'i'}}
            ]
        
        # Lọc theo mã/tên ngành
        major = request.args.get('major')
        if major:
            query['$or'] = query.get('$or', []) + [
                {'majorCode': major},
                {'majorName': {'$regex': major, '$options': 'i'}}
            ]
        
        # Giới hạn số lượng kết quả
        limit = int(request.args.get('limit', 0))
        
        # Thực hiện truy vấn
        criteria = db_client.fetch_data('admission_criteria', query, limit=limit)
        
        return jsonify({
            'success': True,
            'data': criteria,
            'count': len(criteria)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@data_api.route('/student-data/<string:id>', methods=['GET'])
def get_student_data(id):
    """
    Lấy dữ liệu học sinh theo ID
    
    Args:
        id: ID của học sinh (userId hoặc anonymousId)
        
    Returns:
        JSON chứa dữ liệu học sinh
    """
    try:
        # Tìm học sinh theo userId hoặc anonymousId
        student = db_client.fetch_data(
            'student_data',
            {'$or': [{'userId': id}, {'anonymousId': id}]}
        )
        
        if not student:
            return jsonify({
                'success': False,
                'error': 'Không tìm thấy dữ liệu học sinh'
            }), 404
        
        return jsonify({
            'success': True,
            'data': student[0]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@data_api.route('/stats', methods=['GET'])
def get_stats():
    """
    Lấy thống kê tổng quan về dữ liệu
    
    Returns:
        JSON chứa thống kê dữ liệu
    """
    try:
        # Đếm số lượng bản ghi trong các collection
        stats = {
            'universities': db_client.get_collection('universities').count_documents({}),
            'majors': db_client.get_collection('majors').count_documents({}),
            'subject_combinations': db_client.get_collection('subject_combinations').count_documents({}),
            'interests': db_client.get_collection('interests').count_documents({}),
            'admission_criteria': db_client.get_collection('admission_criteria').count_documents({}),
            'student_data': db_client.get_collection('student_data').count_documents({})
        }
        
        return jsonify({
            'success': True,
            'data': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 