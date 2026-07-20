"""Human-approved query execution with a deliberately small, read-only surface."""
import ast
import json
import re
import sqlite3
from fastapi import APIRouter
from pydantic import BaseModel, Field
import pandas as pd

from ..database import update_log_status
from ..dataset import load_dataset

router = APIRouter(prefix="/api/execute", tags=["Execute"])
ALLOWED_CHARTS = {"bar", "line", "scatter", "pie"}
BANNED_NAMES = {"open", "exec", "eval", "compile", "globals", "locals", "vars", "getattr", "setattr", "delattr", "__import__", "input", "help", "dir"}
BANNED_ATTRIBUTES = {"to_csv", "to_excel", "to_pickle", "to_sql", "to_json", "to_parquet", "read_csv", "read_excel", "query", "eval"}
SAFE_BUILTINS = {"len": len, "min": min, "max": max, "sum": sum, "round": round, "abs": abs, "sorted": sorted, "list": list, "dict": dict, "str": str, "int": int, "float": float}

class ExecuteRequest(BaseModel):
    log_id: int
    code: str = Field(min_length=1, max_length=12000)
    engine: str = Field(default="python", pattern="^(python|sql)$")

class ExecuteResponse(BaseModel):
    status: str
    chart_data: str | None = None
    chart_type: str | None = None
    error_message: str | None = None

def validate_python(code: str) -> None:
    tree = ast.parse(code, mode="exec")
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom, ast.With, ast.Try, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.While, ast.For, ast.AsyncFor)):
            raise ValueError("Chỉ hỗ trợ biến đổi DataFrame; import, vòng lặp và hàm không được phép.")
        if isinstance(node, ast.Name) and (node.id in BANNED_NAMES or node.id.startswith("__")):
            raise ValueError(f"Tên không được phép: {node.id}")
        if isinstance(node, ast.Attribute) and (node.attr in BANNED_ATTRIBUTES or node.attr.startswith("__")):
            raise ValueError(f"Thao tác không được phép: {node.attr}")

def execute_python(code: str, df: pd.DataFrame):
    validate_python(code)
    env = {"df": df.copy(), "pd": pd, "chart_data": None, "chart_type": "bar"}
    exec(compile(code, "<approved-analysis>", "exec"), {"__builtins__": SAFE_BUILTINS}, env)
    return env.get("chart_data"), env.get("chart_type", "bar")

def execute_sql(query: str, df: pd.DataFrame):
    normalized = query.strip().rstrip(";")
    if not re.match(r"^(select|with)\b", normalized, re.IGNORECASE) or ";" in normalized:
        raise ValueError("SQL chỉ hỗ trợ một truy vấn SELECT hoặc WITH ở chế độ chỉ đọc.")
    conn = sqlite3.connect(":memory:")
    try:
        df.to_sql("weather", conn, index=False, if_exists="replace")
        result = pd.read_sql_query(normalized, conn)
    finally:
        conn.close()
    return result.to_dict(orient="records"), "bar"

@router.post("/", response_model=ExecuteResponse)
async def execute_code(request: ExecuteRequest):
    try:
        df = load_dataset()
        chart_data, chart_type = execute_sql(request.code, df) if request.engine == "sql" else execute_python(request.code, df)
        if not isinstance(chart_data, list) or not chart_data:
            raise ValueError("Truy vấn phải tạo `chart_data` là danh sách bản ghi không rỗng.")
        if chart_type not in ALLOWED_CHARTS:
            chart_type = "bar"
        chart_data_str = json.dumps(chart_data, ensure_ascii=False, default=str)
        update_log_status(request.log_id, "Approved_And_Executed", request.code, result_image=chart_data_str)
        return ExecuteResponse(status="success", chart_data=chart_data_str, chart_type=chart_type)
    except Exception as exc:
        error_message = str(exc)
        update_log_status(request.log_id, "Error", request.code, error_message=error_message)
        return ExecuteResponse(status="error", error_message=error_message)
