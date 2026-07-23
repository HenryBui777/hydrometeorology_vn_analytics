from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import os
import duckdb
import re

from ..database import update_log_status

router = APIRouter(prefix="/api/execute", tags=["Execute"])

class ExecuteRequest(BaseModel):
    log_id: int
    code: str
    engine: str = "python"
    dataset_path: str = None

class ExecuteResponse(BaseModel):
    status: str
    chart_data: str = None
    chart_type: str = None
    error_message: str = None

# Đường dẫn đến file dữ liệu đã làm sạch
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "cleaned_data.csv")


def normalize_generated_python(code: str) -> str:
    """Keep AI-generated scripts compatible with the already-loaded ``df``.

    The frontend asks the AI to use ``df`` directly, but an external model can
    still occasionally generate an obsolete ``pd.read_csv(...)`` line.  That
    path must never replace the project's current dataset.
    """
    safe_code = code or ""
    safe_code = re.sub(
        r"(?m)^\s*df\s*=\s*pd\.read_csv\([^\n]*\)\s*$",
        "# Dataset `df` is preloaded by the application.",
        safe_code,
    )
    # Some older prompts returned JSON via print instead of exposing
    # ``chart_data``. Convert that pattern to the contract used by the UI.
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

@router.post("/", response_model=ExecuteResponse)
async def execute_code(request: ExecuteRequest):
    """
    Nhận code từ Frontend (sau khi người dùng đã duyệt/chỉnh sửa), 
    thực thi bằng exec() và trả về kết quả JSON.
    """
    target_csv = request.dataset_path if request.dataset_path and os.path.exists(request.dataset_path) else CSV_PATH

    if not os.path.exists(target_csv):
        raise HTTPException(status_code=500, detail="Data file not found.")

    # Tải dữ liệu vào Pandas DataFrame
    df = pd.read_csv(target_csv)
    
    try:
        chart_data = None
        chart_type = 'bar'
        
        if request.engine == 'sql':
            # 1. Trích xuất chart_type từ comment nếu có
            clean_query = []
            for line in request.code.split('\n'):
                if line.startswith('-- CHART_TYPE:'):
                    chart_type = line.split(':')[1].strip().lower()
                else:
                    clean_query.append(line)
            
            final_query = "\n".join(clean_query)
            
            # 2. Thực thi SQL bằng DuckDB trên Pandas DataFrame 'df'
            duckdb.register("df", df)
            result_df = duckdb.sql(final_query).df()
            chart_data = result_df.to_dict(orient='records')
            
        else:
            # Chế độ Python Pandas Sandbox
            safe_code = normalize_generated_python(request.code)
            local_env = { '__builtins__': __builtins__, 'df': df, 'pd': pd }
            exec(safe_code, local_env, local_env)
            chart_data = local_env.get('chart_data', None)
            chart_type = local_env.get('chart_type', 'bar')
            
        if not chart_data:
            raise ValueError("Không thu được dữ liệu biểu đồ. Hãy thử sinh lại.")

        import json
        if not isinstance(chart_data, str):
            chart_data_str = json.dumps(chart_data)
        else:
            chart_data_str = chart_data

        # Cập nhật DB: Thành công
        # Lưu chart_data vào cột result_image (tạm mượn cột này để khỏi phải đổi schema)
        update_log_status(
            log_id=request.log_id, 
            status="Approved_And_Executed", 
            final_code=safe_code if request.engine != 'sql' else request.code, 
            result_image=chart_data_str
        )

        return ExecuteResponse(
            status="success",
            chart_data=chart_data_str,
            chart_type=chart_type
        )

    except Exception as e:
        error_msg = str(e)
        
        # Cập nhật DB: Lỗi
        update_log_status(
            log_id=request.log_id, 
            status="Error", 
            final_code=normalize_generated_python(request.code) if request.engine != 'sql' else request.code, 
            error_message=error_msg
        )
        
        return ExecuteResponse(
            status="error",
            error_message=error_msg
        )
