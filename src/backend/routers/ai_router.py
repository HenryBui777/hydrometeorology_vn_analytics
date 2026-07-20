from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import re
import google.generativeai as genai

from ..database import insert_log

# Cấu hình API Key Gemini
GEMINI_API_KEY = "AQ.Ab8RN6IeBa1n7oyTK4Lh7bngSYrFMYydDOHmiOVc4_fJL_1Wkw"
genai.configure(api_key=GEMINI_API_KEY)

# Khởi tạo mô hình
# Cập nhật model thành gemini-3.5-flash phù hợp với tài khoản hiện tại
model = genai.GenerativeModel('gemini-3.5-flash')

router = APIRouter(prefix="/api/ai", tags=["AI"])

class GenerateRequest(BaseModel):
    prompt: str
    context: str = ""

class GenerateResponse(BaseModel):
    log_id: int
    code: str
    explanation: str

SYSTEM_PROMPT = """
Bạn là một AI Data Analyst chuyên nghiệp (Chuyên gia Python Pandas).
Dữ liệu đầu vào của hệ thống là một DataFrame Pandas tên là `df` đã được nạp sẵn.
Các cột trong `df`: province, region, date, temp_mean, temp_max, temp_min, app_temp_mean, app_temp_max, app_temp_min, precipitation_sum, rain_sum, showers_sum, precipitation_hours, humidity_mean, wind_speed_max, wind_gusts_max, shortwave_radiation_sum, pressure, cloud_cover, dew_point, et0, latitude, longitude, sunshine_hours, daylight_hours, month, week, weather_code, wind_direction_10m_dominant, season.

YÊU CẦU:
Dựa vào câu hỏi của người dùng, hãy viết một đoạn script Python để phân tích dữ liệu trên biến `df`.
1. Bạn phải dùng Pandas để lọc, gom nhóm, hoặc tính toán ra kết quả cần thiết cho biểu đồ.
2. Bạn phải LƯU KẾT QUẢ DƯỚI DẠNG DANH SÁCH DICTIONARY (JSON format) và gán vào biến toàn cục tên là `chart_data`.
   Ví dụ: `chart_data = final_df.to_dict(orient='records')`
3. Bạn phải CHỈ ĐỊNH LOẠI BIỂU ĐỒ bằng cách gán vào biến toàn cục tên là `chart_type`. Giá trị hợp lệ là: 'bar', 'line', 'scatter', 'pie'.
4. KHÔNG dùng matplotlib hoặc plt.show(). Chỉ trả về dữ liệu thô.

Trả về kết quả TUYỆT ĐỐI dưới dạng JSON với 2 trường (không bọc trong markdown):
{
  "code": "đoạn code python ở đây",
  "explanation": "Giải thích ngắn gọn bằng tiếng Việt"
}
"""

@router.post("/generate", response_model=GenerateResponse)
async def generate_code(request: GenerateRequest):
    """
    Gọi Gemini API để sinh mã nguồn phân tích Python
    """
    try:
        # Tạo prompt hoàn chỉnh
        full_prompt = f"{SYSTEM_PROMPT}\n\nCâu hỏi của người dùng: {request.prompt}\nNgữ cảnh: {request.context}"
        
        # Gọi Gemini
        response = model.generate_content(full_prompt)
        response_text = response.text
        
        # Tiền xử lý để loại bỏ markdown bọc ngoài nếu có
        clean_json_str = response_text
        if "```json" in clean_json_str:
            clean_json_str = clean_json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json_str:
            clean_json_str = clean_json_str.split("```")[1].split("```")[0].strip()
            
        # Parse JSON
        result_dict = json.loads(clean_json_str)
        generated_code = result_dict.get('code', '')
        generated_explanation = result_dict.get('explanation', '')
        
        # Lưu log vào DB
        log_id = insert_log(
            prompt=request.prompt,
            context=request.context,
            code=generated_code,
            explanation=generated_explanation
        )

        return GenerateResponse(
            log_id=log_id,
            code=generated_code,
            explanation=generated_explanation
        )
    except Exception as e:
        print("Gemini API Error:", e)
        raise HTTPException(status_code=500, detail=f"Lỗi khi gọi AI: {str(e)}")
