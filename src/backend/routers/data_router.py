from fastapi import APIRouter
from fastapi.responses import FileResponse
import os

router = APIRouter(prefix="/api/data", tags=["Data"])

# Đường dẫn đến file dữ liệu đã làm sạch
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "cleaned_data.csv")

@router.get("/")
async def get_data():
    """
    Trả về file CSV đã làm sạch cho Frontend.
    Frontend sẽ gọi API này thay vì đọc file tĩnh trong /public.
    """
    if os.path.exists(CSV_PATH):
        return FileResponse(CSV_PATH, media_type="text/csv", filename="cleaned_data.csv")
    return {"error": "Data file not found. Please run preprocess step first."}
