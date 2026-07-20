from fastapi import APIRouter
from fastapi.responses import FileResponse
from ..dataset import get_dataset_path

router = APIRouter(prefix="/api/data", tags=["Data"])

# Đường dẫn đến file dữ liệu đã làm sạch

@router.get("/")
async def get_data():
    """
    Trả về file CSV đã làm sạch cho Frontend.
    Frontend sẽ gọi API này thay vì đọc file tĩnh trong /public.
    """
    try:
        return FileResponse(get_dataset_path(), media_type="text/csv", filename="kttv.csv")
    except FileNotFoundError as exc:
        return {"error": str(exc)}
