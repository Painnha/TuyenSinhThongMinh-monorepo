import pandas as pd
import numpy as np
import random
import csv
import os

# Constants for the different subject groups
NATURAL_GROUP = ["TOA", "LY", "HOA", "SINH"]
SOCIAL_GROUP = ["VAN", "SU", "DIA", "GDCD"]
FREE_GROUP = ["ANH", "TIN", "CN"]
ALL_SUBJECTS = NATURAL_GROUP + SOCIAL_GROUP + FREE_GROUP

# Natural and Social interests categories
NATURAL_CATEGORIES = [
    'Công nghệ - Kỹ thuật', 
    'Công nghệ chế biến thực phẩm', 
    'Công nghệ sinh - Hóa', 
    'Công nghệ thông tin - Tin học', 
    'Khoa học tự nhiên khác', 
    'Kinh tế - Quản trị kinh doanh - Thương Mại', 
    'Kế toán - Kiểm toán', 
    'Thiết kế đồ họa - Game - Đa phương tiện', 
    'Toán học và thống kê', 
    'Xây dựng - Kiến trúc - Giao thông', 
    'Tài nguyên - Môi trường', 
    'Ô tô - Cơ khí - Chế tạo',
    'Điện lạnh - Điện tử - Điện - Tự động hóa'
]

SOCIAL_CATEGORIES = [
    'Bác sĩ thú y', 
    'Báo chí - Marketing - Quảng cáo - PR', 
    'Du lịch-Khách sạn', 
    'Kinh tế - Quản trị kinh doanh - Thương Mại', 
    'Kế toán - Kiểm toán', 
    'Luật - Tòa án', 
    'Mỹ thuật - Âm nhạc - Nghệ thuật',
    'Ngoại giao - Ngoại ngữ',
    'Ngoại thương - Xuất nhập khẩu - Kinh Tế quốc tế', 
    'Nhân sự - Hành chính',
    'Sư phạm - Giáo dục',
    'Thời trang - May mặc', 
    'Thủy sản - Lâm Nghiệp - Nông nghiệp',
    'Tài nguyên - Môi trường', 
    'Tâm lý',
    'Xã hội - Nhân văn', 
    'Y - Dược'
]

# Load major data
def load_major_data():
    try:
        major_data = pd.read_csv('app/data/major_data.csv')
        return major_data
    except Exception as e:
        print(f"Error loading major data: {e}")
        return None

# Generate random scores based on the constraints
def generate_scores(student_type):
    scores = {}
    
    # Base generation with randomization
    for subject in ALL_SUBJECTS:
        scores[subject] = round(max(0, min(10, np.random.normal(6, 1.5))), 1)
    
    # Apply constraints based on student type
    if student_type == "natural":
        # Natural-focused student (Math > 7.5)
        scores["TOA"] = round(max(7.5, min(10, np.random.normal(8.5, 0.8))), 1)
        
        # Increase natural group subjects
        for subject in NATURAL_GROUP[1:]:  # Skip Math as it's already set
            scores[subject] = round(max(7.0, min(10, np.random.normal(8.0, 0.8))), 1)
            
        # Lower social group subjects
        for subject in SOCIAL_GROUP:
            scores[subject] = round(max(4.0, min(7.0, np.random.normal(5.5, 0.8))), 1)
            
        # Free group subjects around 7.0
        for subject in FREE_GROUP:
            scores[subject] = round(max(6.0, min(8.0, np.random.normal(7.0, 0.5))), 1)
    
    elif student_type == "social":
        # Social-focused student (Literature > 7.5)
        scores["VAN"] = round(max(7.5, min(10, np.random.normal(8.5, 0.8))), 1)
        
        # Increase social group subjects
        for subject in SOCIAL_GROUP[1:]:  # Skip Literature as it's already set
            scores[subject] = round(max(7.0, min(10, np.random.normal(8.0, 0.8))), 1)
            
        # Lower natural group subjects
        for subject in NATURAL_GROUP:
            scores[subject] = round(max(4.0, min(7.0, np.random.normal(5.5, 0.8))), 1)
            
        # Free group subjects around 7.0
        for subject in FREE_GROUP:
            scores[subject] = round(max(6.0, min(8.0, np.random.normal(7.0, 0.5))), 1)
    
    # Special cases
    if random.random() < 0.05:  # 5% chance of high English score
        scores["ANH"] = round(max(9.0, min(10, np.random.normal(9.5, 0.3))), 1)
        
    if random.random() < 0.05:  # 5% chance of high Biology score
        scores["SINH"] = round(max(9.0, min(10, np.random.normal(9.5, 0.3))), 1)
        
    return scores

# Generate random interests based on student type
def generate_interests(student_type, scores, major_data):
    interests = []
    all_interests = {}
    
    # Create a dictionary of all interests by category
    for _, row in major_data.iterrows():
        category = row['category']
        if category not in all_interests:
            all_interests[category] = set()
        
        # Split the interests string and add to the set
        category_interests = row['interests'].split(',')
        for interest in category_interests:
            all_interests[category].add(interest.strip())
    
    # Select categories based on student type
    target_categories = NATURAL_CATEGORIES if student_type == "natural" else SOCIAL_CATEGORIES
    
    # Special case: High English Score > 9.0
    if scores["ANH"] >= 9.0:
        foreign_lang_interests = list(all_interests.get('Ngoại giao - Ngoại ngữ', []))
        if foreign_lang_interests:
            interests.append(random.choice(foreign_lang_interests))
            
    # Special case: High Biology Score > 9.0
    if scores["SINH"] >= 9.0:
        medical_categories = ['Bác sĩ thú y', 'Y - Dược']
        medical_interests = []
        for cat in medical_categories:
            medical_interests.extend(list(all_interests.get(cat, [])))
        if medical_interests:
            interests.append(random.choice(medical_interests))
    
    # Select remaining interests
    selected_categories = random.sample(target_categories, min(3, len(target_categories)))
    
    remaining_slots = 3 - len(interests)
    for _ in range(remaining_slots):
        if not selected_categories:
            break
            
        category = selected_categories.pop()
        category_interests = list(all_interests.get(category, []))
        
        if category_interests:
            interest = random.choice(category_interests)
            if interest not in interests:  # Avoid duplicates
                interests.append(interest)
    
    # Ensure we have exactly 3 interests
    all_possible_interests = []
    for cat_interests in all_interests.values():
        all_possible_interests.extend(list(cat_interests))
    
    while len(interests) < 3:
        interest = random.choice(all_possible_interests)
        if interest not in interests:
            interests.append(interest)
    
    return interests[:3]  # Return exactly 3 interests

# Calculate the normalized score for a subject combination
def calculate_subject_combination_score(scores, subject_groups, weights_str, priority_area=0, priority_subject=0):
    # Parse weights
    weights = {}
    for weight_pair in weights_str.split(';'):
        subject, weight = weight_pair.split(':')
        weights[subject.strip()] = float(weight.strip())
    
    # Map subject names to our code names
    subject_map = {
        'Toán': 'TOA',
        'Vật lý': 'LY',
        'Hóa học': 'HOA',
        'Sinh học': 'SINH',
        'Ngữ văn': 'VAN',
        'Lịch sử': 'SU',
        'Địa lý': 'DIA',
        'GDKT & PL': 'GDCD',
        'Tiếng Anh': 'ANH',
        'Tin học': 'TIN',
        'Công nghệ': 'CN'
    }
    
    # Choose a subject group
    group_codes = subject_groups.split(';')
    primary_group = random.choice(group_codes)
    
    # Map subject codes to actual subjects
    subject_code_map = {
        'A00': ['TOA', 'LY', 'HOA'],
        'A01': ['TOA', 'LY', 'ANH'],
        'A02': ['TOA', 'LY', 'SINH'],
        'A03': ['TOA', 'LY', 'SU'],
        'A04': ['TOA', 'LY', 'DIA'],
        'A05': ['TOA', 'HOA', 'SU'],
        'A06': ['TOA', 'HOA', 'DIA'],
        'A07': ['TOA', 'SU', 'DIA'],
        'A08': ['TOA', 'SU', 'GDCD'],
        'A09': ['TOA', 'DIA', 'GDCD'],
        'B00': ['TOA', 'HOA', 'SINH'],
        'B02': ['TOA', 'SINH', 'DIA'],
        'B03': ['TOA', 'SINH', 'VAN'],
        'C00': ['VAN', 'SU', 'DIA'],
        'C01': ['VAN', 'TOA', 'LY'],
        'C02': ['VAN', 'TOA', 'HOA'],
        'C03': ['VAN', 'TOA', 'SU'],
        'C04': ['VAN', 'TOA', 'DIA'],
        'C05': ['VAN', 'LY', 'HOA'],
        'C08': ['VAN', 'HOA', 'SINH'],
        'C12': ['VAN', 'SINH', 'SU'],
        'C13': ['VAN', 'SINH', 'DIA'],
        'C14': ['VAN', 'TOA', 'GDCD'],
        'C19': ['VAN', 'SU', 'GDCD'],
        'C20': ['VAN', 'DIA', 'GDCD'],
        'D01': ['VAN', 'TOA', 'ANH'],
        'D07': ['TOA', 'HOA', 'ANH'],
        'D08': ['TOA', 'SINH', 'ANH'],
        'D09': ['TOA', 'SU', 'ANH'],
        'D10': ['TOA', 'DIA', 'ANH'],
        'D11': ['VAN', 'LY', 'ANH'],
        'D12': ['VAN', 'HOA', 'ANH'],
        'D13': ['VAN', 'SINH', 'ANH'],
        'D14': ['VAN', 'SU', 'ANH'],
        'D15': ['VAN', 'DIA', 'ANH'],
        'D66': ['VAN', 'GDCD', 'ANH'],
        'D84': ['TOA', 'GDCD', 'ANH'],
        'A-TIN': ['VAN', 'TOA', 'TIN'],
        'B-TIN': ['TOA', 'LY', 'TIN'],
        'C-TIN': ['TOA', 'HOA', 'TIN'],
        'D-TIN': ['TOA', 'SINH', 'TIN'],
        'E-TIN': ['TOA', 'ANH', 'TIN'],
        'F-TIN': ['HOA', 'SINH', 'TIN'],
        'G-TIN': ['TOA', 'ANH', 'CN'],
        'K01': ['TOA', 'TIN', 'ANH']
        # Add more mappings as needed
    }
    
    # Calculate weighted average of subjects in the group
    total_score = 0
    total_weight = 0
    
    if primary_group in subject_code_map:
        group_subjects = subject_code_map[primary_group]
        
        for subject in group_subjects:
            weight = 1.0  # Default weight
            
            # Try to find a more specific weight from the weights dictionary
            for weight_subject, w in weights.items():
                if subject_map.get(weight_subject) == subject:
                    weight = w
                    break
            
            total_score += scores[subject] * weight
            total_weight += weight
    else:
        # Fallback to a simple average of all subjects
        for subject, score in scores.items():
            total_score += score
            total_weight += 1
    
    # Add priority bonuses (ranging from 0 to 4 points)
    raw_score = total_score / total_weight if total_weight > 0 else 0
    final_score = raw_score + priority_area + priority_subject
    
    # Normalize to 0-1 scale
    normalized_score = min(final_score / 10, 1.0)
    
    return normalized_score, primary_group, final_score

# Calculate interest match score
def calculate_interest_match(student_interests, major_interests_str):
    major_interests = [interest.strip() for interest in major_interests_str.split(',')]
    matching_count = sum(1 for interest in student_interests if interest in major_interests)
    
    if matching_count == 0:
        return 0.0
    elif matching_count == 1:
        return 0.5
    elif matching_count == 2:
        return 0.75
    else:
        return 1.0

# Calculate final compatibility score
def calculate_compatibility_score(normalized_subject_score, interest_match, market_trend, 
                                  w1=0.4, w2=0.4, w3=0.2):
    return w1 * normalized_subject_score + w2 * interest_match + w3 * market_trend

# Generate student data
def generate_student_data(student_id, major_data):
    # Randomly determine student type
    student_type = random.choice(["natural", "social"])
    
    # Generate scores based on student type
    scores = generate_scores(student_type)
    
    # Generate random priority values (0-4 range divided by 10 for 0-0.4)
    priority_area = round(random.uniform(0, 0.4), 1)
    priority_subject = round(random.uniform(0, 0.4), 1)
    
    # Generate interests
    interests = generate_interests(student_type, scores, major_data)
    
    # Calculate compatibility with each major
    major_scores = []
    for _, major in major_data.iterrows():
        # Calculate normalized subject score
        normalized_subject_score, subject_group, raw_score = calculate_subject_combination_score(
            scores, 
            major['primary_subject_groups'],
            major['subjects_weight'],
            priority_area,
            priority_subject
        )
        
        # Calculate interest match
        interest_match = calculate_interest_match(interests, major['interests'])
        
        # Get market trend
        market_trend = float(major['market_trend'])
        
        # Calculate final compatibility score
        compatibility_score = calculate_compatibility_score(
            normalized_subject_score, 
            interest_match, 
            market_trend
        )
        
        major_scores.append({
            'major_name': major['major_name'],
            'category': major['category'],
            'compatibility_score': compatibility_score,
            'subject_group': subject_group,
            'subject_score': raw_score,
            'interest_match': interest_match,
            'market_trend': market_trend
        })
    
    # Sort by compatibility score and get top 3
    major_scores.sort(key=lambda x: x['compatibility_score'], reverse=True)
    top_majors = major_scores[:3]
    
    # Format interests as a string
    interests_str = ','.join(interests)
    
    # Create student record
    student_record = {
        'Student_ID': student_id,
        'Major': top_majors[0]['major_name'],  # Top major
        'Compatibility_Score': round(top_majors[0]['compatibility_score'], 3),
        'Subject_groups': top_majors[0]['subject_group'],
        'Khu_vuc_uu_tien': priority_area,
        'Doi_tuong_uu_tien': priority_subject,
        'Interests': interests_str
    }
    
    # Add scores for each subject
    for subject in ALL_SUBJECTS:
        student_record[subject] = scores[subject]
    
    # Add top 3 majors with scores
    for i, major in enumerate(top_majors):
        student_record[f'Major_{i+1}'] = major['major_name']
        student_record[f'Score_{i+1}'] = round(major['compatibility_score'], 3)
    
    return student_record

# Main function to generate the dataset
def generate_dataset(num_students=1000, output_file='synthetic_student_data.csv'):
    # Load major data
    major_data = load_major_data()
    if major_data is None:
        print("Failed to load major data. Exiting.")
        return
    
    # Generate student records
    students = []
    for i in range(1, num_students + 1):
        student_id = f"S{i:05d}"
        student = generate_student_data(student_id, major_data)
        students.append(student)
    
    # Convert to DataFrame
    df = pd.DataFrame(students)
    
    # Save to CSV
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"Generated {num_students} student records and saved to {output_file}")
    
    # Print sample statistics
    print("\nSample statistics:")
    print(f"Number of natural students: {sum(1 for s in students if s['TOA'] > 7.5)}")
    print(f"Number of social students: {sum(1 for s in students if s['VAN'] > 7.5)}")
    print(f"Number of students with high English: {sum(1 for s in students if s['ANH'] >= 9.0)}")
    print(f"Number of students with high Biology: {sum(1 for s in students if s['SINH'] >= 9.0)}")
    
    return df

if __name__ == "__main__":
    # Generate 1000 student records
    generate_dataset(10000, 'synthetic_student_data.csv') 