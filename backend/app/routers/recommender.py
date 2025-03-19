from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import pandas as pd
from app.models.data_generator import generate_synthetic_data
from app.models.recommender import recommend_majors
from app.dependencies import get_data

router = APIRouter()

@router.post("/generate-data")
async def generate_data(
    num_samples: int = 100,
    method: str = "bayesian",
    data: Dict[str, pd.DataFrame] = Depends(get_data)
):
    """
    Tạo dữ liệu học sinh giả định để huấn luyện và đánh giá hệ thống.
    
    Parameters:
        num_samples (int): Số lượng học sinh giả định cần tạo
        method (str): Phương pháp tạo dữ liệu ('bayesian' hoặc 'neural')
        data (Dict): Dictionary chứa các DataFrame cần thiết
        
    Returns:
        Dict: Thông tin về dữ liệu đã tạo
    """
    try:
        # Tạo dữ liệu giả định
        synthetic_data = generate_synthetic_data(
            num_samples=num_samples,
            method=method,
            interests_df=data['interests'],
            majors_df=data['majors'],
            subject_combinations_df=data['subject_combinations']
        )
        
        # Lưu dữ liệu vào file
        output_path = f"data/synthetic_data_{method}.csv"
        synthetic_data.to_csv(output_path, index=False)
        
        return {
            "success": True,
            "file_path": output_path,
            "count": len(synthetic_data),
            "method": method
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommend")
async def recommend(
    student_data: Dict[str, Any],
    data: Dict[str, pd.DataFrame] = Depends(get_data)
):
    """
    Gợi ý ngành học dựa trên thông tin của học sinh.
    
    Parameters:
        student_data (Dict): Thông tin của học sinh (điểm số, sở thích, v.v.)
        data (Dict): Dictionary chứa các DataFrame cần thiết
        
    Returns:
        List[Dict]: Danh sách các ngành được gợi ý
    """
    try:
        # Gợi ý ngành học
        recommendations = recommend_majors(
            student_data=student_data,
            interests_df=data['interests'],
            majors_df=data['majors'],
            subject_combinations_df=data['subject_combinations']
        )
        
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 