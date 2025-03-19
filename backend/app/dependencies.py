import pandas as pd
from typing import Dict
from fastapi import Depends

def get_data() -> Dict[str, pd.DataFrame]:
    """
    Load dữ liệu từ các file CSV.
    
    Returns:
        Dict[str, pd.DataFrame]: Dictionary chứa các DataFrame
    """
    try:
        # Load dữ liệu từ các file CSV
        interests_df = pd.read_csv('data/interests.csv')
        majors_df = pd.read_csv('data/major_data.csv')
        subject_combinations_df = pd.read_csv('data/subject_combinations.csv')
        
        return {
            'interests': interests_df,
            'majors': majors_df,
            'subject_combinations': subject_combinations_df
        }
    except Exception as e:
        raise Exception(f"Lỗi khi load dữ liệu: {str(e)}") 