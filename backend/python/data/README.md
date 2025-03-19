# Hệ thống gợi ý ngành học

Hệ thống gợi ý ngành học dựa trên điểm số, sở thích và các thông tin khác của học sinh.

## Cấu trúc thư mục

```
backend/python/data/
├── api.py                 # API endpoints
├── data_generator.py      # Module tạo dữ liệu mẫu
├── recommender.py         # Module gợi ý ngành học
├── requirements.txt       # Dependencies
├── interests.csv         # Dữ liệu về sở thích
├── major_data.csv        # Dữ liệu về ngành học
└── subject_combinations.csv  # Dữ liệu về tổ hợp môn
```

## Cài đặt

1. Tạo môi trường ảo:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. Cài đặt dependencies:
```bash
pip install -r requirements.txt
```

## Sử dụng

### 1. API Endpoints

#### Gợi ý ngành học
- Endpoint: `/api/recommend`
- Method: POST
- Request body:
```json
{
    "TOA": 8.5,
    "VAN": 7.5,
    "ANH": 8.0,
    "LY": 7.0,
    "HOA": 8.0,
    "SU": 6.5,
    "DIA": 7.0,
    "SINH": 7.5,
    "GDCD": 8.0,
    "TIN": 8.5,
    "CN": 7.0,
    "priority_area": "KV2",
    "priority_subject": "05",
    "interests": ["Lập trình", "Máy tính", "Công nghệ"],
    "subject_groups": ["A00", "A01"]
}
```

#### Tạo dữ liệu mẫu
- Endpoint: `/api/generate-data`
- Method: POST
- Request body:
```json
{
    "num_samples": 100,
    "method": "bayesian"  // hoặc "neural"
}
```

### 2. Format dữ liệu

#### interests.csv
```csv
interest_name
Lập trình
Máy tính
Công nghệ
...
```

#### major_data.csv
```csv
major_name,category,primary_subject_groups,subjects_weight,interests,market_trend
Công nghệ thông tin,Khoa học máy tính,A00;A01,TOA:2;VAN:1;ANH:1,Lập trình;Máy tính;0.8
...
```

#### subject_combinations.csv
```csv
combination_code,subjects
A00,TOA;LY;HOA
A01,TOA;LY;ANH
...
```

## Tích hợp với Frontend

1. Thêm API endpoints vào frontend:
```javascript
// services/api.js
export const recommendationService = {
    getRecommendations: async (studentData) => {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentData)
        });
        return response.json();
    }
};
```

2. Gọi API từ component:
```javascript
const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const result = await recommendationService.getRecommendations(formData);
        if (result.success) {
            setRecommendations(result.data);
        }
    } catch (error) {
        console.error('Error:', error);
    }
};
```

## Lưu ý

1. Đảm bảo các file CSV có đúng format trước khi sử dụng
2. Cài đặt đầy đủ các dependencies
3. Xử lý lỗi phù hợp ở cả frontend và backend
4. Có thể điều chỉnh trọng số các thành phần trong hàm recommend_majors() 