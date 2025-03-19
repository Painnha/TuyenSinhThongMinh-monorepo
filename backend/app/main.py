from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, users, recommender

app = FastAPI(title="Tuyển Sinh Thông Minh API")

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả các origin trong môi trường development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thêm các router
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(recommender.router, prefix="/api/recommender", tags=["Recommender"])

@app.get("/")
async def root():
    return {"message": "Welcome to Tuyển Sinh Thông Minh API"} 