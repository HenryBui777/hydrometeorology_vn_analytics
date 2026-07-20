from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import os

from ..database import update_log_status

router = APIRouter(prefix="/api/execute", tags=["Execute"])

class ExecuteRequest(BaseModel):
    log_id: int
    code: str

class ExecuteResponse(BaseModel):
    status: str
    chart_data: str = None
    chart_type: str = None
    error_message: str = None

# Đường dẫn đến file dữ liệu đã làm sạch
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "cleaned_data.csv")

@router.post("/", response_model=ExecuteResponse)
async def execute_code(request: ExecuteRequest):
    """
    Nhận code từ Frontend (sau khi người dùng đã duyệt/chỉnh sửa), 
    thực thi bằng exec() và trả về kết quả JSON.
    """
    if not os.path.exists(CSV_PATH):
        raise HTTPException(status_code=500, detail="Data file not found. Please run preprocess step first.")

    # Tải dữ liệu vào Pandas DataFrame
    df = pd.read_csv(CSV_PATH)
    
    # Thiết lập môi trường an toàn (sandbox cơ bản)
    # Chỉ truyền biến df vào môi trường cục bộ để code của AI có thể tương tác.
    local_env = {
        'df': df
    }

    try:
        # Thực thi đoạn mã Python mà AI sinh ra (và user đã duyệt)
        # Bất kỳ biến nào được tạo trong đoạn mã (như chart_data) sẽ nằm trong local_env
        exec(request.code, {}, local_env)
        
        # Lấy kết quả từ biến chart_data (AI được dặn phải lưu vào biến này dưới dạng dict/list)
        chart_data = local_env.get('chart_data', None)
        chart_type = local_env.get('chart_type', 'bar') # Default là bar
        
        if not chart_data:
            raise ValueError("Đoạn code không tạo ra biến 'chart_data' (JSON). Vui lòng yêu cầu AI sinh lại đúng định dạng.")

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
            final_code=request.code, 
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
            final_code=request.code, 
            error_message=error_msg
        )
        
        return ExecuteResponse(
            status="error",
            error_message=error_msg
        )
