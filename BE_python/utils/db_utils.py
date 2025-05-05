import pymongo
from pymongo import MongoClient
import os
import sys

# Thêm đường dẫn gốc vào sys.path để có thể import
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config.config import MONGO_URI, MONGO_DB_NAME, COLLECTIONS

class MongoDBClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDBClient, cls).__new__(cls)
            cls._instance.client = MongoClient(MONGO_URI)
            cls._instance.db = cls._instance.client[MONGO_DB_NAME]
        return cls._instance
    
    def get_collection(self, collection_name):
        """Lấy collection theo tên đã định nghĩa trong config"""
        if collection_name not in COLLECTIONS:
            raise ValueError(f"Collection {collection_name} không được định nghĩa")
        return self.db[COLLECTIONS[collection_name]]
    
    def fetch_data(self, collection_name, query=None, projection=None, limit=0, sort=None):
        """
        Lấy dữ liệu từ MongoDB
        
        Args:
            collection_name: Tên collection
            query: Điều kiện truy vấn
            projection: Các trường cần lấy
            limit: Giới hạn số lượng kết quả
            sort: Sắp xếp kết quả
            
        Returns:
            Danh sách kết quả
        """
        collection = self.get_collection(collection_name)
        cursor = collection.find(query or {}, projection or {})
        
        if sort:
            cursor = cursor.sort(sort)
        
        if limit > 0:
            cursor = cursor.limit(limit)
            
        return list(cursor)
    
    def insert_one(self, collection_name, document):
        """Thêm một document vào collection"""
        collection = self.get_collection(collection_name)
        return collection.insert_one(document)
    
    def insert_many(self, collection_name, documents):
        """Thêm nhiều document vào collection"""
        collection = self.get_collection(collection_name)
        return collection.insert_many(documents)
    
    def update_one(self, collection_name, query, update):
        """Cập nhật một document"""
        collection = self.get_collection(collection_name)
        return collection.update_one(query, update)
    
    def update_many(self, collection_name, query, update):
        """Cập nhật nhiều document"""
        collection = self.get_collection(collection_name)
        return collection.update_many(query, update)
    
    def delete_one(self, collection_name, query):
        """Xóa một document"""
        collection = self.get_collection(collection_name)
        return collection.delete_one(query)
    
    def delete_many(self, collection_name, query):
        """Xóa nhiều document"""
        collection = self.get_collection(collection_name)
        return collection.delete_many(query)
    
    def fetch_and_normalize_interests(self):
        """Lấy và chuẩn hóa dữ liệu sở thích"""
        interests = self.fetch_data('interests')
        return {interest['name']: interest['_id'] for interest in interests}
    
    def fetch_and_normalize_subject_combinations(self):
        """Lấy và chuẩn hóa dữ liệu tổ hợp môn"""
        subject_combinations = self.fetch_data('subject_combinations')
        return {combination['code']: {
            'id': combination['_id'],
            'subjects': combination['subjects']
        } for combination in subject_combinations}
    
    def fetch_university_by_code(self, university_code):
        """Lấy thông tin trường theo mã"""
        collection = self.get_collection('universities')
        return collection.find_one({'code': university_code})
    
    def fetch_major_by_code(self, major_code):
        """Lấy thông tin ngành theo mã"""
        collection = self.get_collection('majors')
        return collection.find_one({'code': major_code})
    
    def check_collection_exists(self, collection_name):
        """Kiểm tra collection có tồn tại không"""
        if collection_name not in COLLECTIONS:
            raise ValueError(f"Collection {collection_name} không được định nghĩa")
        collection_name = COLLECTIONS[collection_name]
        return collection_name in self.db.list_collection_names()
    
    def count_documents(self, collection_name, query=None):
        """Đếm số lượng document trong collection"""
        collection = self.get_collection(collection_name)
        return collection.count_documents(query or {})

# Singleton instance
db_client = MongoDBClient() 