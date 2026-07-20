from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any
import math

router = APIRouter(prefix="/api/insights", tags=["Insights"])

class InsightRequest(BaseModel):
    chart_data: list[dict[str, Any]] = Field(default_factory=list, max_length=500)
    question: str = ""

def _numbers(rows: list[dict[str, Any]]) -> list[float]:
    values = []
    for row in rows:
        for value in row.values():
            if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
                values.append(float(value))
    return values

@router.post("/four-axis")
def four_axis_insight(request: InsightRequest):
    rows = request.chart_data
    values = _numbers(rows)
    if not rows or not values:
        return {"descriptive": "Chưa có đủ dữ liệu số để tạo nhận định.", "diagnostic": "Hãy chọn biểu đồ có dữ liệu hợp lệ.", "predictive": "Chưa thể ước lượng xu hướng.", "prescriptive": "Nên bổ sung dữ liệu hoặc điều chỉnh truy vấn."}
    avg = sum(values) / len(values)
    low, high = min(values), max(values)
    spread = high - low
    trend = "biến động đáng kể" if spread > abs(avg) * 0.25 else "khá ổn định"
    return {
        "descriptive": f"Truy vấn có {len(rows)} quan sát. Giá trị số trung bình là {avg:.2f}, thấp nhất {low:.2f} và cao nhất {high:.2f}.",
        "diagnostic": f"Mức chênh lệch {spread:.2f} cho thấy dữ liệu {trend}; cần đối chiếu thêm theo thời gian, vùng hoặc mùa để xác định nguyên nhân.",
        "predictive": "Đây là nhận định mô tả từ mẫu hiện có, không phải dự báo khí tượng. Cần chuỗi thời gian dài hơn để xây dựng mô hình dự báo đáng tin cậy.",
        "prescriptive": "Ưu tiên theo dõi các nhóm có giá trị cực đại/cực tiểu, kiểm tra dữ liệu gốc và dùng bộ lọc thời gian hoặc khu vực trước khi ra quyết định.",
    }
