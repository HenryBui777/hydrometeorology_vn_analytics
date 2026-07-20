import sys
import os

# Thêm thư mục gốc vào sys.path để có thể import các module khi chạy trực tiếp
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.backend.database import init_db
from src.backend.routers import ai_router, execute_router, data_router

app = FastAPI(title="HydroMeteorology VN API", version="1.0.0")

# Cấu hình CORS để cho phép Frontend (React) gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong thực tế nên giới hạn lại domain của frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo Database khi ứng dụng bắt đầu
@app.on_event("startup")
def startup_event():
    init_db()
    print("SQLite Database initialized successfully at data/ai_logs.db")

# Đăng ký các Routers
app.include_router(data_router.router)
app.include_router(ai_router.router)
app.include_router(execute_router.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to HydroMeteorology VN API. Go to /docs for API documentation."}

if __name__ == "__main__":
    import uvicorn
    # Lệnh này dùng để chạy file trực tiếp bằng 'python src/backend/main.py'
    uvicorn.run("src.backend.main:app", host="0.0.0.0", port=8000, reload=True)
