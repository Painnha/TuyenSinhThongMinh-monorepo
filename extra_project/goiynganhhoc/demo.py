import json
from recommend import recommend_majors, process_input_data

def run_demo():
    """Run a demo of the major recommendation system"""
    
    # Create a sample student profile
    print("Tạo hồ sơ học sinh mẫu...")
    

    
    # Sample student data with medical interests
    student_data = {
        'scores': {
            'TOA': 8.0,  # Math
            'VAN': 7.5,  # Literature 
            'ANH': 9.0,
            'LY': 9.0,
            'HOA': 9.0,  # Chemistry
            'SINH': 9.2, # Biology
            'SU': 9.0,
            'DIA': 9.0,
            'GDCD': 9.0,
            'TIN': 0.0,
            'CN': 0.0
        },
        'priority_area': 'KV2',
        'priority_subject': '03',
        'interests': ['Lập trình', 'Phân tích dữ liệu'],
        'subject_groups': ['A01', 'D01']
    }
    
    profiles = [

        ("Học sinh", student_data)
    ]
    
    # Run recommendations for each profile
    for name, profile in profiles:
        print("\n" + "=" * 60)
        print(f"Gợi ý ngành học cho: {name}")
        print("=" * 60)
        
        # Validate and process student data
        try:
            processed_data = process_input_data(profile)
            
            # Get recommendations
            recommendations = recommend_majors(processed_data)
            
            # Display recommendations
            print("\nKết quả gợi ý ngành học:")
            for i, rec in enumerate(recommendations, 1):
                print(f"\n{i}. {rec['major_name']} ({rec['category']})")
                print(f"   - Độ phù hợp: {rec['confidence']:.2f}")
                print(f"   - Xu hướng thị trường: {rec['market_trend']:.2f}")
                print(f"   - Tổ hợp môn phù hợp: {rec['primary_subject_groups']}")
                print(f"   - Sở thích liên quan: {rec['interests']}")
            
        except Exception as e:
            print(f"Lỗi: {str(e)}")
    
    print("\n" + "=" * 60)
    print("Demo kết thúc!")

if __name__ == "__main__":
    print("Bắt đầu chạy demo hệ thống gợi ý ngành học...")
    run_demo() 