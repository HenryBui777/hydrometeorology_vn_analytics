import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client
from typing import Optional, List
import time
import json
import re
import pandas as pd

# Load env
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="KTTV AI Analytics API")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "cleaned_data.csv")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Setup Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Select model
model = genai.GenerativeModel('gemini-2.0-flash')

class ChatRequest(BaseModel):
    prompt: str
    context: Optional[str] = "Dữ liệu thời tiết VN"
    engine: str = "python"


def local_analysis_code(prompt: str) -> tuple[str, str]:
    """A valid offline proposal. The executor always provides DataFrame ``df``."""
    text = (prompt or "").lower()
    metric = "precipitation_sum" if any(word in text for word in ("mưa", "mua", "rain")) else "temp_mean"
    label = "lượng mưa" if metric == "precipitation_sum" else "nhiệt độ trung bình"
    group = "region" if any(word in text for word in ("vùng", "vung", "miền", "mien")) else "province"
    return (
        f"""# Dữ liệu df đã được hệ thống nạp sẵn từ cleaned_data.csv
result_df = (df.groupby('{group}', as_index=False)['{metric}']
             .mean()
             .rename(columns={{'{group}': 'name', '{metric}': 'value'}})
             .sort_values('value', ascending=False)
             .head(10))
chart_data = result_df.to_dict(orient='records')
chart_type = 'bar'
""",
        f"Tổng hợp {label} trung bình theo {group} và hiển thị 10 nhóm có giá trị cao nhất."
    )


def normalize_generated_python(code: str) -> str:
    """Remove stale CSV reads and convert legacy printed JSON into chart_data."""
    safe_code = code or ""
    safe_code = re.sub(
        r"(?m)^\s*df\s*=\s*pd\.read_csv\([^\n]*\)\s*$",
        "# df is preloaded by the application.",
        safe_code,
    )
    safe_code = re.sub(
        r"(?m)^\s*print\(\s*([A-Za-z_]\w*)\.to_json\(orient\s*=\s*['\"]records['\"]\)\s*\)\s*$",
        r"chart_data = \1.to_dict(orient='records')",
        safe_code,
    )
    if "chart_data" not in safe_code and re.search(r"\bresult_df\b", safe_code):
        safe_code += "\nchart_data = result_df.to_dict(orient='records')\n"
    if "chart_type" not in safe_code:
        safe_code += "\nchart_type = 'bar'\n"
    return safe_code

class ChatHistoryItem(BaseModel):
    id: str
    role: str
    content: str
    created_at: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "KTTV AI API is running"}

@app.post("/api/ai/generate")
async def generate_ai_response(request: ChatRequest):
    try:
        # 1. Save User query to Supabase
        user_res = supabase.table("chat_history").insert({
            "role": "user",
            "content": request.prompt
        }).execute()

        # Extract Dynamic Schema from CSV
        csv_path = CSV_PATH
        dynamic_context = "Không tìm thấy file dữ liệu."
        if os.path.exists(csv_path):
            try:
                df = pd.read_csv(csv_path, nrows=5)
                cols = ", ".join([f"{c} ({t})" for c, t in zip(df.columns, df.dtypes)])
                sample = df.to_string(index=False)
                dynamic_context = f"File: {csv_path}\nCột: {cols}\n5 dòng đầu:\n{sample}"
            except Exception as e:
                dynamic_context = str(e)

        # 2. Call Gemini with multi-model fallback and bulletproof error handling
        system_prompt = f"""Bạn là chuyên gia phân tích dữ liệu đóng vai trò trợ giúp.
Ngữ cảnh: {request.context}
Cấu trúc DataFrame hiện tại (Dynamic Schema):
{dynamic_context}

Nhiệm vụ: Dựa vào yêu cầu người dùng và cấu trúc DataFrame hiện tại, hãy viết mã Python để thao tác và phân tích.

QUY TẮC BẮT BUỘC:
1. KHÔNG tự tạo hay thêm số liệu giả. Chỉ dùng dữ liệu từ DataFrame 'df' có sẵn (được giả định là DataFrame của file trên).
2. BẮT BUỘC thêm các dòng comment giải thích chi tiết bằng tiếng Việt ngay trong code:
   # Đoạn code này sẽ [thao tác], sử dụng hàm [hàm_sử_dụng] của [thư_viện].
3. Trả về đúng định dạng JSON:
{{
  "explanation": "Tóm tắt ngắn gọn phương pháp đề xuất",
  "code": "mã python có sẵn comment chi tiết (LƯU Ý: Mã Python PHẢI print ra kết quả dạng JSON array. vd: print(df.to_json(orient='records')))"
}}
CHỈ trả về JSON nguyên thủy, không có dấu markdown ```json.
"""

        candidate_models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest']
        ai_text = ""
        
        for model_name in candidate_models:
            try:
                m = genai.GenerativeModel(model_name)
                # Set a 3.5-second timeout to prevent UI hanging when Google API is slow/throttled
                response = m.generate_content(
                    f"{system_prompt}\n\nCâu hỏi: {request.prompt}",
                    request_options={'timeout': 3.5}
                )
                ai_text = response.text.strip()
                if ai_text:
                    break
            except Exception as model_err:
                print(f"Model {model_name} failed quickly: {model_err}")
                # If quota is exceeded (429), all models on this API key will fail, so break immediately
                err_str = str(model_err)
                if "429" in err_str or "Quota exceeded" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    print("API Key Quota Exceeded. Switching immediately to Fast Offline Generator.")
                    break
                continue

        explanation = ""
        code = ""

        if ai_text:
            if ai_text.startswith("```json"):
                ai_text = ai_text[7:]
            if ai_text.endswith("```"):
                ai_text = ai_text[:-3]
            try:
                parsed = json.loads(ai_text)
                explanation = parsed.get("explanation", "")
                code = parsed.get("code", "")
            except:
                explanation = ai_text
                code = ""

        # Fallback if Gemini fails or is rate-limited
        if False and not code:  # legacy fallback retained only for reference
            explanation = f"Đã tự động tạo mã nguồn Python phân tích dữ liệu thời tiết dựa trên yêu cầu: '{request.prompt}'."
            code = f"""# 1. Đọc dữ liệu khí tượng thủy văn Việt Nam từ file CSV
# Sử dụng hàm read_csv của thư viện Pandas
import pandas as pd
import json

df = pd.read_csv('{csv_path}')

# 2. Xử lý và trích xuất dữ liệu phân tích theo yêu cầu: {request.prompt}
# Sử dụng các hàm lọc và chọn cột của Pandas
cols = [c for c in df.columns if any(k in c.lower() for k in ['tinh', 'nhiet', 'mua', 'do_am'])]
if not cols:
    cols = df.columns[:3]

result_df = df[cols].dropna().head(10)

# Đổi tên cột chuẩn cho biểu đồ
rename_dict = {{cols[0]: 'name'}}
if len(cols) > 1: rename_dict[cols[1]] = 'value'
if len(cols) > 2: rename_dict[cols[2]] = 'secondary'
result_df = result_df.rename(columns=rename_dict)

# 3. Xuất kết quả dạng JSON Array cho Frontend hiển thị
print(result_df.to_json(orient='records'))
"""

        # Use the project-safe template whenever Gemini has no usable answer.
        if not code:
            code, explanation = local_analysis_code(request.prompt)
        code = normalize_generated_python(code)

        # 3. Save AI response to Supabase gracefully
        log_id = f"local_log_{int(time.time())}"
        try:
            ai_res = supabase.table("chat_history").insert({
                "role": "ai",
                "content": explanation
            }).execute()
            if ai_res.data:
                log_id = ai_res.data[0]['id']
        except Exception as sb_err:
            print("Supabase log error (ignored):", sb_err)

        return {
            "status": "success",
            "log_id": str(log_id),
            "code": code,
            "explanation": explanation,
            "chart_type": "bar"
        }

    except Exception as e:
        print(f"Error in generate endpoint: {str(e)}")
        # Guaranteed safe return instead of 500 error!
        code, explanation = local_analysis_code(request.prompt)
        return {
            "status": "success",
            "log_id": "fallback_log",
            "explanation": explanation,
            "code": code,
            "chart_type": "bar"
        }

class AnalyzeChartRequest(BaseModel):
    question: str
    chart_data: list
    chart_type: str

@app.post("/api/ai/analyze-chart")
async def analyze_chart(request: AnalyzeChartRequest):
    try:
        data_sample = str(request.chart_data[:5]) if len(request.chart_data) > 5 else str(request.chart_data)
        system_prompt = f"""Bạn là chuyên gia phân tích dữ liệu. Hãy phân tích biểu đồ dựa trên dữ liệu sau.
Câu hỏi gốc: {request.question}
Loại biểu đồ: {request.chart_type}
Dữ liệu mẫu (tối đa 5 dòng): {data_sample}

BẮT BUỘC trả về chuẩn JSON với 4 trục (4-Axis Analytics):
{{
  "descriptive": "Phân tích Mô tả: Chuyện gì đang xảy ra?",
  "diagnostic": "Phân tích Chẩn đoán: Tại sao nó xảy ra?",
  "predictive": "Phân tích Dự đoán: Chuyện gì sẽ xảy ra tiếp theo?",
  "prescriptive": "Phân tích Đề xuất: Chúng ta nên làm gì?"
}}
CHỈ trả về JSON nguyên thủy, không có dấu markdown ```json.
"""
        response = model.generate_content(system_prompt)
        ai_text = response.text.strip()
        if ai_text.startswith("```json"):
            ai_text = ai_text[7:]
        if ai_text.endswith("```"):
            ai_text = ai_text[:-3]
        
        parsed = json.loads(ai_text)
        return parsed
    except Exception as e:
        print(f"Error in analyze-chart: {str(e)}")
        # Return a fallback JSON if parsing fails
        return {
            "descriptive": "Đang phân tích mô tả...",
            "diagnostic": "Đang chẩn đoán nguyên nhân...",
            "predictive": "Đang dự đoán xu hướng...",
            "prescriptive": "Đang đưa ra đề xuất..."
        }

@app.get("/api/history")
async def get_history():
    try:
        # Fetch ordered by created_at
        res = supabase.table("chat_history").select("*").order("created_at", desc=False).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        print(f"Error fetching history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

import sys
import os
import glob
from io import StringIO
import traceback
import json
import pandas as pd

class ExecuteRequest(BaseModel):
    log_id: str
    code: str
    chart_type: Optional[str] = 'bar'
    engine: str = 'python'

@app.post("/api/execute")
async def execute_code(request: ExecuteRequest):
    try:
        if not os.path.exists(CSV_PATH):
            raise FileNotFoundError(f"Không tìm thấy tệp dữ liệu: {CSV_PATH}")

        df = pd.read_csv(CSV_PATH)
        safe_code = normalize_generated_python(request.code)
        execution_env = {"__builtins__": __builtins__, "pd": pd, "df": df}
        exec(safe_code, execution_env, execution_env)
        chart_data = execution_env.get("chart_data")
        chart_type = execution_env.get("chart_type", request.chart_type or "bar")
        if not chart_data:
            raise ValueError("Mã phân tích chưa tạo chart_data. Hãy sinh lại đề xuất.")
        result_data = json.dumps(chart_data, ensure_ascii=False, default=str)
    except Exception as e:
        return {
            "status": "error",
            "error_message": str(e)
        }

    # Save logs opportunistically; analysis must not fail if Supabase is offline.
    try:
        supabase.table("execution_logs").insert({
            "chat_id": request.log_id,
            "code": safe_code,
            "result_data": result_data,
            "status": "success"
        }).execute()
    except Exception as e:
        print("Failed to save log to Supabase:", e)

    return {
        "status": "success",
        "chart_data": result_data,
        "chart_type": chart_type,
        "raw_logs": ""
    }

class LogSaveRequest(BaseModel):
    prompt: str
    original_ai_code: str
    human_edited_code: str
    execution_result: str

@app.post("/api/logs/save")
async def save_log(request: LogSaveRequest):
    try:
        res = supabase.table("execution_logs").insert({
            "prompt": request.prompt,
            "original_code": request.original_ai_code,
            "code": request.human_edited_code,
            "result_data": request.execution_result,
            "status": "saved"
        }).execute()
        return {"status": "success", "message": "Log saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
