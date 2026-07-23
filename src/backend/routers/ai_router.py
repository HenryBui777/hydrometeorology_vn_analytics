import os
import json
import re
from typing import Any
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..database import insert_log
from dotenv import load_dotenv

load_dotenv()

# Cấu hình API Key Gemini từ môi trường (.env)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
AI_MODEL_NAME = os.getenv("AI_ENGINE_MODEL", "gemini-2.5-flash")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_model():
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Chưa cấu hình GEMINI_API_KEY cho backend.")
    return genai.GenerativeModel(AI_MODEL_NAME)

def parse_json_response(text: str) -> dict[str, Any]:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", (text or "").strip(), flags=re.IGNORECASE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if not match:
            raise ValueError("AI không trả về JSON hợp lệ.")
        return json.loads(match.group(0))

router = APIRouter(prefix="/api/ai", tags=["AI"])

class GenerateRequest(BaseModel):
    prompt: str
    context: str = ""
    engine: str = "python"
    chat_history: list[dict[str, Any]] = Field(default_factory=list)

class GenerateResponse(BaseModel):
    log_id: int
    code: str
    explanation: str
    chart_type: str = "bar"

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

SQL_SYSTEM_PROMPT = """
Bạn là một AI Data Analyst chuyên nghiệp (Chuyên gia SQL).
Hệ thống sử dụng DuckDB. Có một bảng tên là `df` đã được nạp sẵn.
Các cột trong `df`: province, region, date, temp_mean, temp_max, temp_min, app_temp_mean, app_temp_max, app_temp_min, precipitation_sum, rain_sum, showers_sum, precipitation_hours, humidity_mean, wind_speed_max, wind_gusts_max, shortwave_radiation_sum, pressure, cloud_cover, dew_point, et0, latitude, longitude, sunshine_hours, daylight_hours, month, week, weather_code, wind_direction_10m_dominant, season.

YÊU CẦU:
Dựa vào câu hỏi của người dùng, hãy viết một đoạn truy vấn SQL để phân tích dữ liệu trên bảng `df`.
1. Trả về đúng MỘT câu truy vấn SQL SELECT duy nhất (không có dấu chấm phẩy ở cuối nếu không cần).
2. Câu truy vấn này phải tính toán/gom nhóm ra dữ liệu trực tiếp để vẽ biểu đồ.
3. Bạn phải CHỈ ĐỊNH LOẠI BIỂU ĐỒ. Giá trị hợp lệ là: 'bar', 'line', 'scatter', 'pie'.

Trả về kết quả TUYỆT ĐỐI dưới dạng JSON với 3 trường (không bọc trong markdown):
{
  "code": "câu truy vấn SQL ở đây",
  "chart_type": "loại biểu đồ (bar/line/pie/scatter)",
  "explanation": "Giải thích ngắn gọn bằng tiếng Việt"
}
"""

@router.post("/generate", response_model=GenerateResponse)
async def generate_code(request: GenerateRequest):
    """
    Gọi Gemini API để sinh mã nguồn phân tích Python
    """
    try:
        # Xây dựng lịch sử trò chuyện
        history_text = ""
        if request.chat_history:
            history_text = "Lịch sử trò chuyện trước đó (dùng làm ngữ cảnh):\n"
            for msg in request.chat_history:
                role = "User" if msg.get("sender") == "user" else "AI"
                text = msg.get("text", "")
                history_text += f"[{role}]: {text}\n"
            history_text += "\n"

        # Chọn prompt
        base_prompt = SYSTEM_PROMPT if request.engine == "python" else SQL_SYSTEM_PROMPT
        
        # Tạo prompt hoàn chỉnh
        full_prompt = f"{base_prompt}\n\n{history_text}Câu hỏi hiện tại của người dùng: {request.prompt}\nNgữ cảnh bổ sung: {request.context}"
        
        # Gọi Gemini
        response = get_model().generate_content(full_prompt)
        response_text = response.text
        
        # Tiền xử lý để loại bỏ markdown bọc ngoài nếu có
        result_dict = parse_json_response(response_text)
        generated_code = str(result_dict.get('code', '')).strip()
        generated_explanation = str(result_dict.get('explanation', '')).strip()
        chart_type = str(result_dict.get('chart_type', 'bar')).lower()
        if chart_type not in {'bar', 'line', 'scatter', 'pie'}:
            chart_type = 'bar'
        if not generated_code:
            raise ValueError("AI không sinh được mã phân tích.")
        
        # Nếu dùng engine SQL, ta cần gài chart_type vào để client/execute router biết
        if request.engine == "sql":
            generated_code = f"-- CHART_TYPE: {chart_type}\n" + generated_code
        elif "chart_type" not in generated_code:
            generated_code += f"\n\nchart_type = {chart_type!r}\n"
        
        # Lưu log vào DB
        log_id = insert_log(
            prompt=request.prompt,
            context=request.context,
            code=generated_code,
            explanation=generated_explanation,
            chart_type=chart_type
        )

        return GenerateResponse(
            log_id=log_id,
            code=generated_code,
            explanation=generated_explanation
        )
    except Exception as e:
        print("Gemini API Error:", e)
        raise HTTPException(status_code=500, detail=f"Lỗi khi gọi AI: {str(e)}")

class AnalyzeChartRequest(BaseModel):
    question: str
    chart_data: list
    chart_type: str

class AnalyzeChartResponse(BaseModel):
    descriptive: str
    diagnostic: str
    predictive: str
    prescriptive: str

ANALYZE_PROMPT = """
Bạn là một AI Data Analyst chuyên nghiệp.
Người dùng vừa thực hiện một truy vấn phân tích dữ liệu khí tượng.
Câu hỏi của người dùng: "{question}"
Dữ liệu biểu đồ (loại {chart_type}) thu được (chỉ là một tập con mẫu đại diện nếu quá lớn):
{chart_data_summary}

YÊU CẦU:
Hãy phân tích dữ liệu trên theo 4 trục (4-Axis Analytics) và trả về ĐÚNG MỘT JSON với 4 trường sau:
1. "descriptive": Mô tả (Chuyện gì đang xảy ra? Mô tả số liệu nổi bật)
2. "diagnostic": Chẩn đoán (Tại sao lại như vậy? Khí hậu Việt Nam giải thích điều này thế nào?)
3. "predictive": Dự đoán (Dự báo xu hướng sắp tới dựa trên mẫu dữ liệu hiện tại)
4. "prescriptive": Đề xuất (Khuyến nghị hành động thực tiễn cho nông nghiệp/đời sống)

Chỉ trả về JSON thuần túy, không markdown, không text thừa:
{{
  "descriptive": "...",
  "diagnostic": "...",
  "predictive": "...",
  "prescriptive": "..."
}}
"""

@router.post("/analyze-chart", response_model=AnalyzeChartResponse)
async def analyze_chart(request: AnalyzeChartRequest):
    try:
        # Nếu data quá dài, chỉ lấy 20 record đầu và cuối để AI không bị quá tải token
        data_summary = request.chart_data
        if len(data_summary) > 40:
            data_summary = data_summary[:20] + [{"...": "..."}] + data_summary[-20:]
            
        full_prompt = ANALYZE_PROMPT.format(
            question=request.question,
            chart_type=request.chart_type,
            chart_data_summary=json.dumps(data_summary, ensure_ascii=False)
        )
        
        response = get_model().generate_content(full_prompt)
        result_dict = parse_json_response(response.text)
        return AnalyzeChartResponse(
            descriptive=result_dict.get("descriptive", ""),
            diagnostic=result_dict.get("diagnostic", ""),
            predictive=result_dict.get("predictive", ""),
            prescriptive=result_dict.get("prescriptive", "")
        )
    except Exception as e:
        print("Gemini Analysis API Error:", e)
        raise HTTPException(status_code=500, detail=f"Lỗi khi gọi AI phân tích: {str(e)}")
