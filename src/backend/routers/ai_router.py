import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai
from dotenv import load_dotenv

from ..database import insert_log
from ..dataset import schema_summary

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

router = APIRouter(prefix="/api/ai", tags=["AI"])

class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    context: str = Field(default="", max_length=6000)
    engine: str = Field(default="python", pattern="^(python|sql)$")

class GenerateResponse(BaseModel):
    log_id: int
    code: str
    explanation: str

def extract_json(text: str) -> dict:
    text = text.strip()
    if "```" in text:
        text = text.split("```", 2)[1]
        text = text.removeprefix("json").strip()
    return json.loads(text)

@router.post("/generate", response_model=GenerateResponse)
async def generate_code(request: GenerateRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Chưa cấu hình GEMINI_API_KEY trên backend.")
    try:
        client = genai.Client(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
        schema = schema_summary()
        if request.engine == "sql":
            rules = "Sinh đúng một câu SQL SELECT hoặc WITH đọc từ bảng `weather`. Không dùng INSERT, UPDATE, DELETE, PRAGMA hoặc nhiều câu lệnh."
        else:
            rules = "Sinh Python Pandas không import, không dùng vòng lặp/hàm, chỉ dùng DataFrame `df` và `pd`. Gán list of dictionaries vào `chart_data` và một trong bar/line/scatter/pie vào `chart_type`."
        prompt = f"""Bạn là AI Data Analyst. {rules}
Schema dữ liệu: {schema}
Ngữ cảnh hội thoại gần đây: {request.context or 'Không có'}
Câu hỏi mới: {request.prompt}
Trả về JSON thuần, không markdown: {{\"code\": \"...\", \"explanation\": \"giải thích tiếng Việt ngắn gọn\"}}."""
        try:
            response = client.models.generate_content(model=model_name, contents=prompt)
        except Exception:
            # Gemini 3.5 Flash can temporarily return 503 during demand spikes.
            # Keep the premium model as the primary path, then preserve availability.
            fallback_model = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.1-flash-lite")
            if fallback_model == model_name:
                raise
            response = client.models.generate_content(model=fallback_model, contents=prompt)
        result = extract_json(response.text or "")
        code = str(result.get("code", "")).strip()
        explanation = str(result.get("explanation", "")).strip()
        if not code:
            raise ValueError("Mô hình không trả về mã phân tích.")
        log_id = insert_log(request.prompt, request.context, code, explanation)
        return GenerateResponse(log_id=log_id, code=code, explanation=explanation)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Không thể tạo phân tích AI: {exc}")
