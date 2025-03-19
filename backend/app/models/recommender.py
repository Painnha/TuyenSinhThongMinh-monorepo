import pandas as pd
import numpy as np
from typing import Dict, List, Any

def recommend_majors(
    student_data: Dict[str, Any],
    interests_df: pd.DataFrame,
    majors_df: pd.DataFrame,
    subject_combinations_df: pd.DataFrame,
    num_recommendations: int = 3
) -> List[Dict[str, Any]]:
    """
    Gợi ý ngành học dựa trên điểm số, sở thích và các thông tin khác của học sinh.
    
    Parameters:
        student_data (Dict): Thông tin của học sinh (điểm số, sở thích, v.v.)
        interests_df (pd.DataFrame): DataFrame chứa thông tin về sở thích
        majors_df (pd.DataFrame): DataFrame chứa thông tin về ngành học
        subject_combinations_df (pd.DataFrame): DataFrame chứa thông tin về tổ hợp môn
        num_recommendations (int): Số lượng ngành học muốn gợi ý
        
    Returns:
        List[Dict]: Danh sách các ngành được gợi ý, mỗi ngành là một dictionary
    """
    # Trọng số các thành phần
    w1, w2, w3, w4 = 0.6, 0.3, 0.08, 0.02
    
    # Chuẩn bị thông tin học sinh
    student_interests = student_data.get('interests', [])
    student_subject_groups = student_data.get('subject_groups', [])
    
    # Chuẩn hóa dữ liệu
    if isinstance(student_interests, str):
        student_interests = [student_interests]
    if isinstance(student_subject_groups, str):
        student_subject_groups = [student_subject_groups]
    
    # Dictionary chứa điểm của học sinh cho từng môn
    student_subjects = {
        'Toán': student_data.get('TOA', 0),
        'Ngữ văn': student_data.get('VAN', 0),
        'Tiếng Anh': student_data.get('ANH', 0),
        'Vật lý': student_data.get('LY', 0),
        'Hóa học': student_data.get('HOA', 0),
        'Lịch sử': student_data.get('SU', 0),
        'Địa lý': student_data.get('DIA', 0),
        'Sinh học': student_data.get('SINH', 0),
        'GDKT & PL': student_data.get('GDCD', 0),
        'Tin học': student_data.get('TIN', 0),
        'Công nghệ': student_data.get('CN', 0)
    }
    
    # Tính điểm ưu tiên
    priority_area = student_data.get('priority_area', 'KV3')
    priority_subject = student_data.get('priority_subject', '05')
    
    area_scores = {'KV1': 0.75, 'KV2': 0.5, 'KV3': 0.0}
    subject_scores = {
        '01': 2.0, '02': 1.5, '03': 1.0, 
        '04': 0.5, '05': 0.0, '06': 1.0, '07': 0.5
    }
    
    area_score = area_scores.get(priority_area, 0.0)
    subject_score = subject_scores.get(priority_subject, 0.0)
    priority_score = (area_score + subject_score) / 3  # Chuẩn hóa về 0-1
    
    # Tạo mapping từ mã môn sang tên môn
    subject_mapping = {
        'TOA': 'Toán',
        'VAN': 'Ngữ văn',
        'ANH': 'Tiếng Anh',
        'LY': 'Vật lý',
        'HOA': 'Hóa học',
        'SU': 'Lịch sử',
        'DIA': 'Địa lý',
        'SINH': 'Sinh học',
        'GDCD': 'GDKT & PL',
        'TIN': 'Tin học',
        'CN': 'Công nghệ'
    }
    
    # Tính điểm cho mỗi ngành
    major_scores = []
    
    for _, major in majors_df.iterrows():
        major_info = {
            'name': major['major_name'],
            'category': major['category'],
            'interests': major['interests'].split(','),
            'market_trend': float(major['market_trend']),
            'raw_score': 0,
            'score_components': {}
        }
        
        # 1. Tính điểm tổ hợp chuẩn hóa
        primary_groups = major['primary_subject_groups'].split(';')
        best_group_score = 0
        best_group_code = ""
        best_group_calculation = {}
        
        for group_code in primary_groups:
            # Tìm thông tin về tổ hợp môn
            group_info = subject_combinations_df[subject_combinations_df['combination_code'] == group_code]
            if len(group_info) == 0:
                continue
                
            subjects_in_group = group_info.iloc[0]['subjects'].split(';')
            
            # Tính toán trọng số môn học từ thông tin ngành
            subject_weights = {}
            for weight_info in major['subjects_weight'].split(';'):
                parts = weight_info.split(':')
                subject_name = parts[0]
                weight = float(parts[1])
                subject_weights[subject_name] = weight
            
            # Tính điểm tổ hợp
            total_score = 0
            total_weight = 0
            group_calculation = {}
            
            for subject_code in subjects_in_group:
                subject_name = subject_mapping.get(subject_code, subject_code)
                subject_score = student_subjects.get(subject_name, 0)
                subject_weight = subject_weights.get(subject_name, 1.0)
                
                total_score += subject_score * subject_weight
                total_weight += subject_weight
                
                group_calculation[subject_name] = {
                    'score': subject_score,
                    'weight': subject_weight,
                    'weighted_score': subject_score * subject_weight
                }
            
            group_score = total_score / total_weight / 10 if total_weight > 0 else 0
            
            if group_score > best_group_score:
                best_group_score = group_score
                best_group_code = group_code
                best_group_calculation = group_calculation
        
        # 2. Tính khớp sở thích
        major_interests = major_info['interests']
        matching_interests = set(student_interests) & set(major_interests)
        
        if len(matching_interests) == 0:
            interest_match = 0.0
        elif len(matching_interests) == 1:
            interest_match = 0.5
        elif len(matching_interests) == 2:
            interest_match = 0.75
        else:
            interest_match = 1.0
        
        # 3. Lấy xu hướng thị trường
        market_trend = major_info['market_trend']
        
        # 4. Tính điểm tổng hợp Sij
        major_score = w1 * best_group_score + w2 * interest_match + w3 * market_trend + w4 * priority_score
        
        # Lưu các thành phần điểm để hiển thị
        major_info['score_components'] = {
            'subject_score': {
                'value': best_group_score,
                'weight': w1,
                'weighted_value': w1 * best_group_score,
                'best_group': best_group_code,
                'calculation': best_group_calculation
            },
            'interest_match': {
                'value': interest_match,
                'weight': w2,
                'weighted_value': w2 * interest_match,
                'matching_interests': list(matching_interests)
            },
            'market_trend': {
                'value': market_trend,
                'weight': w3,
                'weighted_value': w3 * market_trend
            },
            'priority_score': {
                'value': priority_score,
                'weight': w4,
                'weighted_value': w4 * priority_score,
                'area': priority_area,
                'subject': priority_subject
            }
        }
        
        major_info['raw_score'] = major_score
        major_scores.append(major_info)
    
    # Sắp xếp ngành theo điểm và trả về top-n ngành phù hợp nhất
    major_scores.sort(key=lambda x: x['raw_score'], reverse=True)
    top_majors = major_scores[:num_recommendations]
    
    # Làm tròn điểm để hiển thị
    for major in top_majors:
        major['score'] = round(major['raw_score'] * 100, 2)  # Chuyển về thang 100 điểm
        
        # Định dạng lại các điểm thành phần
        for component, data in major['score_components'].items():
            if 'value' in data:
                data['value'] = round(data['value'] * 100, 2)
            if 'weighted_value' in data:
                data['weighted_value'] = round(data['weighted_value'] * 100, 2)
    
    return top_majors 