import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from openai import OpenAI as OpenAIClient
from supabase import create_client, Client
from typing import Optional, List
import time
import json
import re
import pandas as pd
import unicodedata
import sqlite3
import datetime

# Load env
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="KTTV AI Analytics API")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "cleaned_data.csv")
SQLITE_PATH = os.path.join(BASE_DIR, "data", "ai_logs.db")

# ---------- SQLite Local Logging ----------
def _init_sqlite():
    conn = sqlite3.connect(SQLITE_PATH)
    conn.execute("""CREATE TABLE IF NOT EXISTS ai_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        question TEXT NOT NULL,
        explanation TEXT,
        original_code TEXT,
        human_edited_code TEXT,
        status TEXT DEFAULT 'pending',
        chart_type TEXT,
        chart_data TEXT,
        insight_json TEXT,
        source TEXT DEFAULT 'template',
        engine TEXT DEFAULT 'python',
        execution_time_ms INTEGER DEFAULT 0,
        row_count INTEGER DEFAULT 0,
        table_data TEXT DEFAULT '',
        error_log TEXT DEFAULT '',
        ai_model TEXT DEFAULT '',
        human_modified INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime'))
    )""")
    # Migrate existing DBs — add missing columns safely
    new_cols = [
        ("engine",           "TEXT DEFAULT 'python'"),
        ("execution_time_ms","INTEGER DEFAULT 0"),
        ("row_count",        "INTEGER DEFAULT 0"),
        ("table_data",       "TEXT DEFAULT ''"),
        ("error_log",        "TEXT DEFAULT ''"),
        ("ai_model",         "TEXT DEFAULT ''"),
        ("human_modified",   "INTEGER DEFAULT 0"),
    ]
    for col, typedef in new_cols:
        try:
            conn.execute(f"ALTER TABLE ai_sessions ADD COLUMN {col} {typedef}")
        except Exception:
            pass
    conn.commit()
    conn.close()

_init_sqlite()

def _save_local_log(question, code, explanation, chart_type, source="template",
                    user_email="", human_code="", status="pending", chart_data="", insight_json="",
                    engine="python", execution_time_ms=0, row_count=0, table_data="",
                    error_log="", ai_model="", human_modified=0):
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.execute(
        """INSERT INTO ai_sessions
           (user_email, question, explanation, original_code, human_edited_code,
            status, chart_type, chart_data, insight_json, source, engine,
            execution_time_ms, row_count, table_data, error_log, ai_model, human_modified)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (user_email, question, explanation, code, human_code or code,
         status, chart_type, chart_data, insight_json, source, engine,
         execution_time_ms, row_count, table_data, error_log, ai_model, human_modified)
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id  # Return SQLite ID so caller can use it as log_id

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

# Setup Gemini (fallback)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Setup 9Router (primary AI layer — OpenAI-compatible local proxy)
# Chạy: npm install -g 9router && 9router  → http://localhost:20128
NINE_ROUTER_URL = os.getenv("NINE_ROUTER_URL", "http://localhost:20128/v1")
NINE_ROUTER_API_KEY = os.getenv("NINE_ROUTER_API_KEY", "9router")
NINE_ROUTER_MODEL = os.getenv("NINE_ROUTER_MODEL", "auto")  # 9Router tự chọn model tốt nhất

def _call_9router(prompt: str, system: str) -> str:
    """Gọi 9Router (OpenAI-compatible proxy). Trả về text hoặc raise Exception nếu offline."""
    client = OpenAIClient(
        base_url=NINE_ROUTER_URL,
        api_key=NINE_ROUTER_API_KEY,
        timeout=8.0  # Timeout 8 giây — nếu 9Router offline sẽ nhanh chóng fallback
    )
    response = client.chat.completions.create(
        model=NINE_ROUTER_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        max_tokens=2048,
        temperature=0.2
    )
    return response.choices[0].message.content.strip()

# Select Gemini model
model = genai.GenerativeModel('gemini-2.0-flash')

class ChatRequest(BaseModel):
    prompt: str
    context: Optional[str] = "Dữ liệu thời tiết VN"
    engine: str = "python"
    user_email: str = ""


PROVINCE_ALIASES = {
    "Hà Nội": ("ha noi", "hanoi"), "Hồ Chí Minh": ("ho chi minh", "hcm", "tp hcm", "tphcm"),
    "Đà Nẵng": ("da nang",), "Huế": ("hue",), "Lào Cai": ("lao cai", "sapa"),
    "Lâm Đồng": ("lam dong", "da lat"), "Khánh Hòa": ("khanh hoa", "nha trang"),
    "Cần Thơ": ("can tho",), "Hải Phòng": ("hai phong",), "Quảng Ninh": ("quang ninh",),
    "An Giang": ("an giang",), "Cà Mau": ("ca mau",), "Gia Lai": ("gia lai",),
    "Đắk Lắk": ("dak lak", "daklak"), "Đồng Nai": ("dong nai",), "Tây Ninh": ("tay ninh",),
    "Nghệ An": ("nghe an",), "Thanh Hóa": ("thanh hoa",), "Hà Tĩnh": ("ha tinh",),
    "Quảng Trị": ("quang tri",), "Quảng Ngãi": ("quang ngai",), "Bắc Ninh": ("bac ninh",),
    "Cao Bằng": ("cao bang",), "Điện Biên": ("dien bien",), "Sơn La": ("son la",),
    "Lạng Sơn": ("lang son",), "Phú Thọ": ("phu tho",), "Thái Nguyên": ("thai nguyen",),
    "Tuyên Quang": ("tuyen quang",), "Hưng Yên": ("hung yen",), "Ninh Bình": ("ninh binh",),
    "Vĩnh Long": ("vinh long",), "Đồng Tháp": ("dong thap",),
}

REGION_ALIASES = {
    "Trung du miền núi Bắc Bộ": ("trung du mien nui bac bo",),
    "Đồng bằng sông Hồng": ("dong bang song hong",),
    "Bắc Trung Bộ": ("bac trung bo",),
    "Duyên hải Nam Trung Bộ": ("duyen hai nam trung bo", "nam trung bo"),
    "Tây Nguyên": ("tay nguyen",),
    "Đông Nam Bộ": ("dong nam bo",),
    "Đồng bằng sông Cửu Long": ("dong bang song cuu long", "mien tay"),
}
MACRO_REGION_ALIASES = {
    "miền bắc": ["Trung du miền núi Bắc Bộ", "Đồng bằng sông Hồng"],
    "miền trung": ["Bắc Trung Bộ", "Duyên hải Nam Trung Bộ", "Tây Nguyên"],
    "miền nam": ["Đông Nam Bộ", "Đồng bằng sông Cửu Long"],
}
# Climate-area aliases that do not match the CSV's seven broad regions.  The
# province lists are intentionally intersected with the actual CSV at query
# time, so the assistant never invents a value for a province that is absent.
CLIMATE_AREA_ALIASES = {
    "tây bắc bộ": ["Điện Biên", "Lai Châu", "Sơn La", "Hòa Bình", "Lào Cai", "Yên Bái"],
    "đông bắc bộ": ["Hà Giang", "Tuyên Quang", "Cao Bằng", "Bắc Kạn", "Thái Nguyên", "Lạng Sơn", "Bắc Giang", "Quảng Ninh", "Phú Thọ"],
}


def normalized_text(value: str) -> str:
    return " ".join("".join(
        char for char in unicodedata.normalize("NFD", (value or "").lower())
        if unicodedata.category(char) != "Mn"
    ).replace("đ", "d").split())


def select_visualization(text: str, metrics: list[str], provinces: list[str]) -> str:
    """Choose a chart from the visual-vocabulary matrix.

    This is deliberately deterministic: an AI response may suggest code, but
    it must not choose a chart that conflicts with the analytical purpose.
    """
    is_time = any(term in text for term in ("xu huong", "dien bien", "theo thoi gian", "qua 12 thang", "theo thang", "hang thang", "theo nam", "theo tuan"))
    is_relation = any(term in text for term in ("tuong quan", "moi quan he", "ty le nghich", "anh huong", "lien quan", "scatter", "phan tan"))
    is_distribution = any(term in text for term in ("phan phoi", "phan bo", "tan suat", "histogram", "ngoai le", "outlier"))
    is_composition = any(term in text for term in ("ty trong", "ti trong", "co cau", "phan tram", "thanh phan", "dong gop"))
    is_true_part_to_whole = "phan tram" in text or any(term in text for term in ("so ngay nang", "so ngay mua", "am u", "nang mua am"))
    is_ranking = any(term in text for term in ("top", "cao nhat", "thap nhat", "nhieu nhat", "it nhat", "xep hang", "noi nao", "tinh nao"))
    is_flow_or_finance = any(term in text for term in ("nen", "candlestick", "waterfall", "phieu", "funnel", "sankey", "luong chuyen", "chuyen doi"))

    # The weather dataset has no OHLC, workflow stages, or source→target flow.
    # Returning no chart is more honest than fabricating one of these forms.
    if is_flow_or_finance:
        return "none"
    if "wind_speed_max" in metrics and any(term in text for term in ("huong gio", "toc do gio", "hoa gio", "gio")):
        return "wind-rose"
    if is_distribution:
        return "histogram"
    if is_relation:
        return "bubble" if len(metrics) >= 3 or "3 bien" in text else "scatter"
    if is_time:
        if is_composition:
            return "stacked-area"
        if 2 <= len(provinces) <= 5:
            return "multi-line"
        return "area" if any(term in text for term in ("tich luy", "quy mo", "tong cong")) else "line"
    if is_composition and is_true_part_to_whole:
        return "donut" if len(metrics) == 1 else "bar"
    # Radar is only meaningful for one or two entities evaluated by several
    # metrics. It is never used for a long list of provinces.
    if 1 <= len(provinces) <= 2 and len(metrics) >= 4:
        return "radar"
    if is_ranking:
        return "bar-horizontal"
    return "bar"


def infer_general_analysis(prompt: str) -> tuple[str, str, str]:
    """Infer an analysis plan for natural questions outside the predefined set."""
    text = normalized_text(prompt)
    provinces = [name for name, aliases in PROVINCE_ALIASES.items() if any(alias in text for alias in aliases)]
    regions = [name for name, aliases in REGION_ALIASES.items() if any(alias in text for alias in aliases)]
    for alias, members in MACRO_REGION_ALIASES.items():
        if alias in text:
            regions.extend(member for member in members if member not in regions)
    climate_area_provinces = []
    for alias, members in CLIMATE_AREA_ALIASES.items():
        if alias in text:
            climate_area_provinces.extend(member for member in members if member not in climate_area_provinces)
    provinces.extend(member for member in climate_area_provinces if member not in provinces)
    month_match = re.search(r"thang\s*(1[0-2]|[1-9])", text)
    season = next((label for label, aliases in {
        "Xuân": ("mua xuan",), "Hè": ("mua he",), "Thu": ("mua thu",), "Đông": ("mua dong",)
    }.items() if any(alias in text for alias in aliases)), None)

    metrics = []
    metric_rules = [
        ("temp_max", ("nhiet do cao nhat", "nhiet do max", "cuc dai")),
        ("temp_min", ("nhiet do thap nhat", "nhiet do min", "cuc tieu")),
        ("temp_mean", ("nhiet do", "nong", "lanh")),
        ("precipitation_sum", ("luong mua", "mua", "rain")),
        ("humidity_mean", ("do am", "humidity")),
        ("sunshine_hours", ("gio nang", "nang", "sunshine")),
        ("wind_speed_max", ("toc do gio", "gio", "wind")),
        ("et0", ("boc hoi", "et0")),
        ("cloud_cover", ("may che", "cloud")),
        ("pressure", ("ap suat", "pressure")),
    ]
    for metric, aliases in metric_rules:
        # "giờ nắng" becomes "gio nang" after normalization; it must never
        # be mistaken for the different metric "gió".
        if metric == "wind_speed_max":
            matched = "toc do gio" in text or "gio giat" in text or "wind" in text or ("gio" in text and "gio nang" not in text)
        else:
            matched = any(alias in text for alias in aliases)
        if matched and metric not in metrics:
            metrics.append(metric)
    if not metrics:
        metrics = ["temp_mean"]

    filters = [
        "# Đoạn code này tạo bản sao dữ liệu gốc để tránh làm thay đổi DataFrame ban đầu, sử dụng hàm copy() của Pandas.",
        "df_work = df.copy()"
    ]
    if provinces:
        filters += [
            f"# Đoạn code này lọc chỉ giữ lại các tỉnh/thành phố được yêu cầu ({', '.join(provinces)}), sử dụng hàm isin() của Pandas.",
            f"df_work = df_work[df_work['province'].isin({provinces!r})]"
        ]
    if regions:
        filters += [
            f"# Đoạn code này lọc chỉ giữ lại dữ liệu thuộc vùng khí hậu được yêu cầu ({', '.join(regions)}), sử dụng hàm isin() của Pandas.",
            f"df_work = df_work[df_work['region'].isin({regions!r})]"
        ]
    if month_match:
        filters += [
            f"# Đoạn code này lọc chỉ giữ lại dữ liệu của tháng {int(month_match.group(1))} trong năm, sử dụng hàm eq() của Pandas.",
            f"df_work = df_work[df_work['month'].eq({int(month_match.group(1))})]"
        ]
    if season:
        filters += [
            f"# Đoạn code này lọc chỉ giữ lại dữ liệu của mùa {season}, sử dụng hàm eq() của Pandas.",
            f"df_work = df_work[df_work['season'].eq({season!r})]"
        ]
    filter_code = "\n".join(filters)

    chart_type = select_visualization(text, metrics, provinces)
    wants_relationship = chart_type in ("scatter", "bubble")
    wants_time = chart_type in ("line", "multi-line", "area", "stacked-area")
    wants_composition = chart_type == "donut"

    if chart_type == "none":
        return ("""# Câu hỏi này yêu cầu dạng dữ liệu không có trong bộ CSV khí tượng hiện tại.
chart_data = []
chart_type = 'none'""", "Không tạo biểu đồ vì dữ liệu hiện tại không có cấu trúc tài chính (OHLC), các bước quy trình, hoặc luồng nguồn–đích. Hãy cung cấp dữ liệu tương ứng nếu cần biểu đồ nến, phễu, thác nước hoặc Sankey.", "none")

    if chart_type == "wind-rose":
        return (f"""{filter_code}
df_work = df_work.dropna(subset=['wind_direction_10m_dominant', 'wind_speed_max']).copy()
bins = [-22.5, 22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5, 382.5]
labels = ['Bac', 'Dong Bac', 'Dong', 'Dong Nam', 'Nam', 'Tay Nam', 'Tay', 'Tay Bac', 'Bac_360']
df_work['wind_direction'] = pd.cut((df_work['wind_direction_10m_dominant'] + 22.5) % 360, bins=bins, labels=labels, include_lowest=True, ordered=False)
# Gop 2 nhom Bac (0 do va 360 do) thanh 1 nhom duy nhat
df_work['wind_direction'] = df_work['wind_direction'].astype(str).replace('Bac_360', 'Bac')
result_df = (df_work.groupby('wind_direction', observed=True, as_index=False)['wind_speed_max'].mean()
    .rename(columns={{'wind_direction': 'name'}}))
# Sap xep theo thu tu huong gio
order = ['Bac', 'Dong Bac', 'Dong', 'Dong Nam', 'Nam', 'Tay Nam', 'Tay', 'Tay Bac']
result_df['_ord'] = result_df['name'].apply(lambda x: order.index(x) if x in order else 99)
result_df = result_df.sort_values('_ord').drop(columns=['_ord'])
chart_data = result_df.to_dict(orient='records')
chart_type = 'wind-rose'""", "Bieu do hoa gio duoc chon vi cau hoi co huong gio hoac toc do gio; moi canh the hien toc do gio trung binh theo huong.", "wind-rose")


    if chart_type == "histogram":
        metric = metrics[0]
        return (f"""{filter_code}
series = df_work[{metric!r}].dropna()
if series.empty:
    chart_data = []
else:
    bins = pd.cut(series, bins=10)
    result_df = (bins.value_counts().sort_index().rename_axis('name').reset_index(name='value'))
    result_df['name'] = result_df['name'].astype(str)
    chart_data = result_df.to_dict(orient='records')
chart_type = 'histogram'""", "Biểu đồ tần suất được chọn để cho thấy phân bố của chỉ số được hỏi.", "histogram")

    if wants_relationship:
        if len(metrics) < 2:
            metrics.append("humidity_mean" if metrics[0] != "humidity_mean" else "temp_mean")
        if chart_type == "bubble" and len(metrics) < 3:
            metrics.append("precipitation_sum" if "precipitation_sum" not in metrics else "sunshine_hours")
        x_metric, y_metric = metrics[:2]
        size_metric = metrics[2] if chart_type == "bubble" else None
        selected = ["province", x_metric, y_metric] + ([size_metric] if size_metric else [])
        return (f"""{filter_code}
# Đoạn code này chọn các cột cần thiết và loại bỏ hàng thiếu dữ liệu, sử dụng hàm dropna() của Pandas.
result_df = df_work[{selected!r}].dropna().copy()
# Đoạn code này giới hạn tối đa 800 điểm để biểu đồ không bị quá dày, sử dụng hàm sample() của Pandas.
if len(result_df) > 800:
    result_df = result_df.sample(800, random_state=42)
# Đoạn code này đổi tên cột 'province' thành 'name' theo chuẩn biểu đồ, sử dụng hàm rename() của Pandas.
result_df = result_df.rename(columns={{"province": "name"}})
# Đoạn code này chuyển DataFrame thành danh sách dict để frontend đọc được, sử dụng hàm to_dict() của Pandas.
chart_data = result_df.to_dict(orient='records')
chart_type = '{chart_type}'""",
        f"""Yêu cầu: Phân tích mối quan hệ giữa {x_metric} và {y_metric} trên dữ liệu khí tượng.
Các bước thực hiện:
1. Lọc dữ liệu theo điều kiện đã chọn (tỉnh, vùng, tháng).
2. Chọn các cột phân tích và loại bỏ giá trị thiếu.
3. Giới hạn 800 mẫu ngẫu nhiên nếu dữ liệu quá lớn.
4. Chuẩn hóa tên cột và xuất dữ liệu cho biểu đồ.
Kết quả mong đợi: Biểu đồ phân tán với mỗi điểm là một tỉnh/bản ghi, trục X là {x_metric}, trục Y là {y_metric}.""", chart_type)

    # A time question uses a line chart; each explicitly named province becomes one series.
    if wants_time and not month_match:
        metric = metrics[0]
        if chart_type == "stacked-area":
            return (f"""{filter_code}
# Đoạn code này nhóm dữ liệu theo tháng và vùng rồi tính trung bình, sử dụng hàm groupby() và unstack() của Pandas.
result_df = (df_work.groupby(['month', 'region'])[{metric!r}].mean().unstack('region').reset_index())
# Đoạn code này đổi tên cột và sắp xếp theo thứ tự tháng tăng dần, sử dụng hàm sort_values() của Pandas.
result_df = result_df.rename(columns={{"month": "name"}}).sort_values('name')
# Đoạn code này định dạng lại số tháng thành dạng chữ 'Tháng 1', 'Tháng 2'...
result_df['name'] = result_df['name'].map(lambda month: f'Tháng {{month}}')
# Đoạn code này xuất dữ liệu cho biểu đồ miền chồng, sử dụng hàm to_dict() của Pandas.
chart_data = result_df.to_dict(orient='records')
chart_type = 'stacked-area'""",
            """Yêu cầu: Xem đóng góp của mỗi vùng địa lý theo tháng trong năm.
Các bước thực hiện:
1. Lọc dữ liệu theo điều kiện.
2. Tính trung bình chỉ số theo tháng cho từng vùng.
3. Chuyển sang dạng wide-format (mỗi cột là một vùng).
4. Định dạng tên tháng và xuất dữ liệu.
Kết quả mong đợi: Biểu đồ miền chồng, mỗi màu là một vùng địa lý.""", "stacked-area")
        if len(provinces) >= 2 or len(regions) >= 2:
            series_key = 'province' if len(provinces) >= 2 else 'region'
            return (f"""{filter_code}
# Đoạn code này nhóm dữ liệu theo tháng và {series_key} rồi tính trung bình {metric}, sử dụng groupby() và unstack() của Pandas.
result_df = (df_work.groupby(['month', {series_key!r}])[{metric!r}].mean().unstack({series_key!r}).reset_index())
# Đoạn code này đổi tên và sắp xếp theo thứ tự tháng tăng dần, sử dụng sort_values() của Pandas.
result_df = result_df.rename(columns={{"month": "name"}}).sort_values('name')
# Đoạn code này hiển thị tên tháng dạng chữ 'Tháng 1'...'Tháng 12' thay vì số nguyên.
result_df['name'] = result_df['name'].map(lambda month: f'Tháng {{month}}')
# Đoạn code này xuất dữ liệu cho biểu đồ đa đường, sử dụng to_dict() của Pandas.
chart_data = result_df.to_dict(orient='records')
chart_type = '{chart_type}'""",
            f"""Yêu cầu: So sánh diễn biến của {metric} theo tháng cho từng {series_key}.
Các bước thực hiện:
1. Lọc dữ liệu theo điều kiện đã chọn.
2. Tính giá trị trung bình của {metric} theo tháng cho mỗi {series_key}.
3. Chuyển sang dạng wide-format để mỗi cột là một chuỗi.
4. Định dạng tên tháng và xuất dữ liệu.
Kết quả mong đợi: Biểu đồ đa đường, mỗi đường là diễn biến của một địa điểm.""", chart_type)
        return (f"""{filter_code}
# Đoạn code này nhóm dữ liệu theo tháng và tính giá trị trung bình của {metric}, sử dụng groupby() của Pandas.
result_df = (df_work.groupby('month', as_index=False)[{metric!r}].mean()
    .rename(columns={{"month": "name", {metric!r}: "value"}}).sort_values('name'))
# Đoạn code này chuyển số tháng thành nhãn chữ 'Tháng 1'...'Tháng 12' bằng hàm map() của Pandas.
result_df['name'] = result_df['name'].map(lambda month: f'Tháng {{month}}')
# Đoạn code này xuất dữ liệu dạng danh sách dict cho biểu đồ đường, sử dụng to_dict() của Pandas.
chart_data = result_df.to_dict(orient='records')
chart_type = '{chart_type}'""",
        f"""Yêu cầu: Xem diễn biến của {metric} theo tháng trong năm.
Các bước thực hiện:
1. Lọc dữ liệu theo điều kiện.
2. Tính giá trị trung bình của {metric} cho mỗi tháng.
3. Định dạng tên tháng và sắp xếp tăng dần.
4. Xuất dữ liệu cho biểu đồ đường.
Kết quả mong đợi: Biểu đồ đường thể hiện xu hướng theo 12 tháng.""", chart_type)

    if chart_type == "radar":
        return (f"""{filter_code}
# Đoạn code này tính giá trị trung bình của các chỉ số cho mỗi tỉnh, sử dụng hàm groupby().agg() của Pandas.
summary = (df_work.groupby('province', as_index=False).agg({', '.join(f"{metric}=({metric!r}, 'mean')" for metric in metrics)}))
# Đoạn code này chuyển sang định dạng radar: mỗi dòng là một chỉ số, mỗi cột là một tỉnh.
chart_data = [{{"name": metric, **{{row["province"]: round(float(row[metric]), 2) for _, row in summary.iterrows()}}}}
              for metric in {metrics!r}]
# Đoạn code này xác định kiểu biểu đồ là radar để frontend hiển thị đúng dạng.
chart_type = 'radar'""",
        f"""Yêu cầu: So sánh nhiều chỉ số ({', '.join(metrics)}) của các địa điểm trên cùng một biểu đồ.
Các bước thực hiện:
1. Lọc dữ liệu theo điều kiện.
2. Tính trung bình của từng chỉ số cho mỗi tỉnh.
3. Chuyển sang định dạng radar: mỗi trục là một chỉ số.
Kết quả mong đợi: Biểu đồ radar với mỗi địa điểm là một đa giác.""", "radar")

    # Asking about a region means the result must list only the provinces
    # inside that region, never the whole national dataset.
    group = "province" if provinces or regions or "tinh" in text or "thanh pho" in text else ("season" if "mua" in text else "region")
    aggregations = ", ".join(f"{metric}=({metric!r}, 'mean')" for metric in metrics)
    # Donut is allowed only for 2-5 parts. For larger result sets the runtime
    # safely switches to a horizontal bar chart instead of a cluttered donut.
    output_type = chart_type
    return (f"""{filter_code}
# Đoạn code này nhóm dữ liệu theo {group} và tính giá trị trung bình, sử dụng hàm groupby().agg() của Pandas.
result_df = (df_work.groupby('{group}', as_index=False).agg({aggregations})
    .rename(columns={{'{group}': 'name'}}))
# Đoạn code này kiểm tra số nhóm dữ liệu — cần ít nhất 2 nhóm mới vẽ biểu đồ có ý nghĩa.
if len(result_df) < 2:
    # Một giá trị duy nhất không tạo thành biểu đồ so sánh có ý nghĩa.
    chart_data = []
    chart_type = 'none'
else:
    if '{output_type}' == 'donut' and 2 <= len(result_df) <= 5:
        total = result_df[{metrics[0]!r}].sum()
        if total > 0:
            result_df['share'] = result_df[{metrics[0]!r}] / total
            small = result_df['share'] < 0.03
            if small.any():
                others = result_df.loc[small, {metrics[0]!r}].sum()
                result_df = result_df.loc[~small, ['name', {metrics[0]!r}]]
                if others > 0:
                    result_df.loc[len(result_df)] = ['Khác', others]
        chart_data = result_df[['name', {metrics[0]!r}]].rename(columns={{{metrics[0]!r}: 'value'}}).to_dict(orient='records')
        chart_type = 'donut'
    else:
        # Nhiều hơn 5 nhóm: dùng biểu đồ cột ngang để dễ đọc.
        chart_data = result_df.to_dict(orient='records')
        chart_type = 'bar-horizontal' if '{output_type}' == 'donut' else '{output_type}'""",
    f"""Yêu cầu: Tính giá trị trung bình của {', '.join(metrics)} theo {group} từ dữ liệu khí tượng.
Các bước thực hiện:
1. Lọc dữ liệu theo điều kiện (tỉnh, vùng, tháng, mùa).
2. Nhóm theo {group} và tính giá trị trung bình.
3. Kiểm tra số nhóm: nếu chỉ 1 nhóm thì không vẽ biểu đồ.
4. Tự động chọn loại biểu đồ phù hợp với số nhóm.
Kết quả mong đợi: Biểu đồ cột/ngang thể hiện giá trị trung bình theo từng {group}.""", output_type)


def local_analysis_code(prompt: str) -> tuple[str, str, str]:
    """Intent templates for the 15 approved KTTV analysis questions.

    Every proposal uses the preloaded ``df`` and follows one output contract:
    ``chart_data``, ``chart_type`` and optional ``additional_charts``.
    """
    text = (prompt or "").lower()
    north = "['Trung du miền núi Bắc Bộ', 'Đồng bằng sông Hồng']"
    south_central = "'Duyên hải Nam Trung Bộ'"

    # Strict entity rule: when the user names Hanoi and HCMC, never include
    # any other province. A single requested month is a direct two-group
    # comparison, so a grouped bar chart is the most readable form.
    has_hanoi = "hà nội" in text or "ha noi" in text
    has_hcm = any(alias in text for alias in ("hồ chí minh", "ho chi minh", "tp.hcm", "tp hcm", "hcm"))
    month_match = re.search(r"tháng\s*(1[0-2]|[1-9])", text)
    if has_hanoi and has_hcm and month_match:
        month = int(month_match.group(1))
        selected_metrics = []
        if "nhiệt" in text or "nóng" in text or "lạnh" in text:
            selected_metrics.append("temp_mean")
        if "nắng" in text or "sunshine" in text:
            selected_metrics.append("sunshine_hours")
        if "mưa" in text or "rain" in text:
            selected_metrics.append("precipitation_sum")
        if "độ ẩm" in text or "humidity" in text:
            selected_metrics.append("humidity_mean")
        if not selected_metrics:
            selected_metrics = ["temp_mean"]
        aggregation = ", ".join(f"{metric}=('{metric}', 'mean')" for metric in selected_metrics)
        return (f"""# Chỉ sử dụng đúng hai địa điểm được nêu trong câu hỏi.
selected_provinces = ['Hà Nội', 'Hồ Chí Minh']
result_df = (df[df['province'].isin(selected_provinces) & df['month'].eq({month})]
    .groupby('province', as_index=False)
    .agg({aggregation})
    .rename(columns={{'province': 'name'}}))
chart_data = result_df.to_dict(orient='records')
chart_type = 'bar'""", f"So sánh đúng Hà Nội và Hồ Chí Minh trong tháng {month}; không đưa bất kỳ tỉnh nào khác vào biểu đồ.", "bar")

    # 1. Top hottest provinces
    if "top 5" in text and ("nhiệt" in text or "nóng" in text):
        return ("""result_df = (df.groupby('province', as_index=False)['temp_mean'].mean()
    .rename(columns={'province': 'name', 'temp_mean': 'value'})
    .nlargest(5, 'value'))
chart_data = result_df.to_dict(orient='records')
chart_type = 'bar'""", "Xếp hạng 5 tỉnh có nhiệt độ trung bình cao nhất trên toàn bộ dữ liệu.", "bar")

    # 2. Hanoi monthly temperature trend
    if "hà nội" in text and not has_hcm and ("12 tháng" in text or "diễn biến" in text or "xu hướng" in text):
        return ("""result_df = (df[df['province'].eq('Hà Nội')].groupby('month', as_index=False)['temp_mean'].mean()
    .rename(columns={'month': 'name', 'temp_mean': 'value'}).sort_values('name'))
result_df['name'] = result_df['name'].map(lambda month: f'Tháng {month}')
chart_data = result_df.to_dict(orient='records')
chart_type = 'line'""", "Theo dõi nhiệt độ trung bình của Hà Nội theo 12 tháng.", "line")

    # 3. Rainfall by season
    if "4 mùa" in text or ("mùa" in text and "lượng mưa" in text and "trung bình" in text):
        return ("""result_df = (df.groupby('season', as_index=False)['precipitation_sum'].mean()
    .rename(columns={'season': 'name', 'precipitation_sum': 'value'}))
season_order = {'Xuân': 1, 'Hè': 2, 'Thu': 3, 'Đông': 4}
result_df = result_df.sort_values('name', key=lambda series: series.map(season_order))
chart_data = result_df.to_dict(orient='records')
chart_type = 'bar'""", "So sánh lượng mưa trung bình giữa bốn mùa.", "bar")

    # 4. Sunshine by macro region
    if "giờ nắng" in text and ("miền bắc" in text or "miền trung" in text or "miền nam" in text):
        return ("""df_work = df.copy()
df_work['macro_region'] = df_work['region'].map({
    'Trung du miền núi Bắc Bộ': 'Miền Bắc', 'Đồng bằng sông Hồng': 'Miền Bắc',
    'Bắc Trung Bộ': 'Miền Trung', 'Duyên hải Nam Trung Bộ': 'Miền Trung',
    'Tây Nguyên': 'Miền Trung', 'Đông Nam Bộ': 'Miền Nam',
    'Đồng bằng sông Cửu Long': 'Miền Nam'})
result_df = (df_work.groupby('macro_region', as_index=False)['sunshine_hours'].mean()
    .rename(columns={'macro_region': 'name', 'sunshine_hours': 'value'}))
chart_data = result_df.to_dict(orient='records')
chart_type = 'bar'""", "So sánh số giờ nắng trung bình giữa ba miền Bắc, Trung và Nam.", "bar")

    # 5. Driest provinces
    if ("khô hạn" in text or "thấp nhất" in text) and ("mưa" in text or "lượng mưa" in text):
        return ("""result_df = (df.groupby('province', as_index=False)['precipitation_sum'].mean()
    .rename(columns={'province': 'name', 'precipitation_sum': 'value'})
    .nsmallest(10, 'value'))
chart_data = result_df.to_dict(orient='records')
chart_type = 'bar'""", "Liệt kê 10 tỉnh có lượng mưa trung bình thấp nhất để nhận diện khu vực khô hạn.", "bar")

    # 6. HCMC temperature and rainfall by month
    if ("tp.hcm" in text or "tp hcm" in text or "hồ chí minh" in text) and "lượng mưa" in text and "nhiệt độ" in text:
        return ("""result_df = (df[df['province'].eq('Hồ Chí Minh')].groupby('month', as_index=False)
    .agg(precipitation_sum=('precipitation_sum', 'mean'), temp_mean=('temp_mean', 'mean'))
    .rename(columns={'month': 'name'}).sort_values('name'))
result_df['name'] = result_df['name'].map(lambda month: f'Tháng {month}')
chart_data = result_df.to_dict(orient='records')
chart_type = 'composed'""", "Biểu đồ kép: cột lượng mưa và đường nhiệt độ trung bình của TP.HCM theo tháng.", "composed")

    # 7. Central Highlands temperature range
    if "tây nguyên" in text and ("max" in text or "min" in text or "chênh lệch" in text or "biên độ" in text):
        return ("""result_df = (df[df['region'].eq('Tây Nguyên')].groupby('province', as_index=False)
    .agg(temp_max=('temp_max', 'mean'), temp_min=('temp_min', 'mean')))
result_df['amplitude'] = result_df['temp_max'] - result_df['temp_min']
result_df = result_df.rename(columns={'province': 'name'}).sort_values('amplitude', ascending=False)
chart_data = result_df.to_dict(orient='records')
chart_type = 'line'""", "So sánh nhiệt độ cực đại, cực tiểu và biên độ nhiệt của các tỉnh Tây Nguyên.", "line")

    # 8. Northern temperature-humidity relationship
    if ("độ ẩm" in text and "nhiệt độ" in text) and ("miền bắc" in text or "tỷ lệ nghịch" in text or "phân tán" in text):
        return (f"""result_df = (df[df['region'].isin({north})].groupby(['province', 'month'], as_index=False)
    .agg(temp_mean=('temp_mean', 'mean'), humidity_mean=('humidity_mean', 'mean')))
result_df = result_df.rename(columns={{'province': 'name'}})
chart_data = result_df.to_dict(orient='records')
chart_type = 'scatter'""", "Kiểm chứng quan hệ nhiệt độ–độ ẩm tại miền Bắc bằng biểu đồ phân tán.", "scatter")

    # 9. Coastal location radar. Use available province aliases transparently.
    if "radar" in text and ("ven biển" in text or "gió" in text):
        return ("""selected = ['Đà Nẵng', 'Khánh Hòa']
summary = (df[df['province'].isin(selected)].groupby('province', as_index=False)
    .agg(wind_speed_max=('wind_speed_max', 'mean'), et0=('et0', 'mean'),
         temp_mean=('temp_mean', 'mean'), precipitation_sum=('precipitation_sum', 'mean')))
metrics = [('Gió', 'wind_speed_max'), ('Bốc hơi', 'et0'), ('Nhiệt độ', 'temp_mean'), ('Lượng mưa', 'precipitation_sum')]
chart_data = [{'name': label, **{row['province']: round(float(row[key]), 2) for _, row in summary.iterrows()}}
              for label, key in metrics]
chart_type = 'radar'""", "So sánh radar Đà Nẵng và Khánh Hòa. Vũng Tàu không có trong bộ dữ liệu 34 tỉnh hiện tại nên không tự thay bằng dữ liệu khác.", "radar")

    # 10. Summer Hanoi versus HCMC
    if "mùa hè" in text and "hà nội" in text and ("tp.hcm" in text or "tp hcm" in text or "hồ chí minh" in text):
        return ("""result_df = (df[df['season'].eq('Hè') & df['province'].isin(['Hà Nội', 'Hồ Chí Minh'])]
    .groupby('province', as_index=False)
    .agg(temp_mean=('temp_mean', 'mean'), sunshine_hours=('sunshine_hours', 'mean'))
    .rename(columns={'province': 'name'}))
chart_data = result_df.to_dict(orient='records')
chart_type = 'bar'""", "Chỉ lọc mùa Hè, sau đó so sánh đồng thời nhiệt độ trung bình và số giờ nắng của Hà Nội với TP.HCM.", "bar")

    # 11. December trip comfort: Lao Cai vs Lam Dong
    if ("sapa" in text or "lào cai" in text) and ("đà lạt" in text or "lâm đồng" in text):
        return ("""summary = (df[df['month'].eq(12) & df['province'].isin(['Lào Cai', 'Lâm Đồng'])]
    .groupby('province', as_index=False)
    .agg(temp_mean=('temp_mean', 'mean'), humidity_mean=('humidity_mean', 'mean'),
         precipitation_sum=('precipitation_sum', 'mean'), sunshine_hours=('sunshine_hours', 'mean'),
         temp_max=('temp_max', 'mean'), temp_min=('temp_min', 'mean')))
metrics = [('Nhiệt độ TB', 'temp_mean'), ('Độ ẩm', 'humidity_mean'), ('Lượng mưa', 'precipitation_sum'), ('Giờ nắng', 'sunshine_hours')]
chart_data = [{'name': label, **{row['province']: round(float(row[key]), 2) for _, row in summary.iterrows()}}
              for label, key in metrics]
additional_charts = [{'title': 'Biên độ nhiệt tháng 12', 'type': 'bar', 'data': (summary.assign(amplitude=summary['temp_max']-summary['temp_min'])
    .rename(columns={'province':'name', 'amplitude':'value'})[['name','value']].to_dict(orient='records'))}]
chart_type = 'radar'""", "So sánh đa chiều Lào Cai và Lâm Đồng trong tháng 12, kèm biểu đồ biên độ nhiệt.", "radar")

    # 12. Wind and solar potential in South Central Coast
    if "điện gió" in text or "điện mặt trời" in text or "tiềm năng" in text:
        return (f"""summary = (df[df['region'].eq({south_central})].groupby('province', as_index=False)
    .agg(wind_speed_max=('wind_speed_max', 'mean'), sunshine_hours=('sunshine_hours', 'mean')))
summary['score'] = (summary['wind_speed_max'] / summary['wind_speed_max'].max()) + (summary['sunshine_hours'] / summary['sunshine_hours'].max())
chart_data = summary.rename(columns={{'province': 'name'}}).to_dict(orient='records')
additional_charts = [{{'title': 'Top 3 tiềm năng gió – mặt trời', 'type': 'bar', 'data': (summary.nlargest(3, 'score')
    .rename(columns={{'province':'name', 'score':'value'}})[['name','value']].to_dict(orient='records'))}}]
chart_type = 'scatter'""", "Xác định tiềm năng tổng hợp từ tốc độ gió và số giờ nắng tại Duyên hải Nam Trung Bộ.", "scatter")

    # 13. Sunshine and evaporation by region
    if ("bốc hơi" in text or "et0" in text) and ("nắng" in text or "sunshine" in text):
        return ("""summary = (df.groupby('region', as_index=False)
    .agg(sunshine_hours=('sunshine_hours', 'mean'), et0=('et0', 'mean')))
summary['ratio'] = summary['et0'] / summary['sunshine_hours'].replace(0, pd.NA)
chart_data = summary.rename(columns={'region': 'name'}).to_dict(orient='records')
additional_charts = [{'title': 'Tỷ lệ bốc hơi trên giờ nắng theo vùng', 'type': 'bar', 'data': (summary.rename(columns={'region':'name', 'ratio':'value'})[['name','value']].to_dict(orient='records'))}]
chart_type = 'scatter'""", "Phân tích quan hệ giữa giờ nắng và bốc hơi theo từng vùng, kèm tỷ lệ bốc hơi/giờ nắng.", "scatter")

    # 14. Weather variability
    if "ẩm ương" in text or "thất thường" in text or "biên độ nhiệt" in text:
        return ("""df_work = df.copy()
df_work['temp_range'] = df_work['temp_max'] - df_work['temp_min']
result_df = (df_work.groupby('province', as_index=False)
    .agg(temp_range=('temp_range', 'mean'), rain_std=('precipitation_sum', 'std'))
    .dropna().rename(columns={'province':'name'}))
result_df['variability_score'] = (
    result_df['temp_range'] / result_df['temp_range'].max()
    + result_df['rain_std'] / result_df['rain_std'].max()
)
ranking = (result_df.nlargest(10, 'variability_score')
    [['name', 'variability_score']]
    .rename(columns={'variability_score': 'value'}))
chart_data = result_df.to_dict(orient='records')
additional_charts = [{
    'title': 'Top 10 tỉnh có thời tiết thất thường nhất',
    'type': 'bar',
    'data': ranking.to_dict(orient='records')
}]
chart_type = 'scatter'""", "Tìm các tỉnh có đồng thời biên độ nhiệt lớn và lượng mưa biến động mạnh.", "scatter")

    # 15. Autumn cloud-cover effects
    if "mùa thu" in text and ("mây" in text or "cloud" in text):
        return ("""summary = (df[df['season'].eq('Thu')].groupby('province', as_index=False)
    .agg(cloud_cover=('cloud_cover', 'mean'), temp_mean=('temp_mean', 'mean'), sunshine_hours=('sunshine_hours', 'mean'))
    .rename(columns={'province':'name'}))
chart_data = summary[['name', 'cloud_cover', 'temp_mean']].to_dict(orient='records')
additional_charts = [{'title': 'Mây che phủ và giờ nắng trong mùa Thu', 'type': 'scatter', 'data': summary[['name', 'cloud_cover', 'sunshine_hours']].to_dict(orient='records')}]
chart_type = 'scatter'""", "Đối chiếu tác động của mây che phủ tới nhiệt độ và giờ nắng trong mùa Thu.", "scatter")

    return infer_general_analysis(prompt)


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
        # --- Layer 1: Local verified templates (fast, deterministic) ---
        code, explanation, chart_type = local_analysis_code(request.prompt)
        is_generic_fallback = (not code) or (code.strip().startswith("# Câu hỏi này"))

        if not is_generic_fallback:
            # Template matched — use it directly
            code = normalize_generated_python(code)
            _save_local_log(request.prompt, code, explanation, chart_type, source="template",
                            user_email=request.user_email, engine=request.engine)
            return {
                "status": "success",
                "log_id": f"local_log_{int(time.time())}",
                "code": code,
                "explanation": explanation,
                "chart_type": chart_type,
            }

        # --- Layer 2: AI LLM (9Router → Gemini fallback) cho câu hỏi mới ---
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

        engine_label = "SQL" if request.engine == "sql" else "Python"
        system_prompt = f"""Bạn là chuyên gia phân tích dữ liệu khí tượng thủy văn Việt Nam. Vai trò: TRỢ GIÚP — không được tự quyết định thay người dùng.

Ngữ cảnh: {request.context}
Ngôn ngữ mã nguồn: {engine_label}

Cấu trúc DataFrame (CHỈ dùng các cột này, 'df' đã được load sẵn — KHÔNG gọi read_csv lại):
{dynamic_context}

=== QUY TẮC BẮT BUỘC ===

[DỮ LIỆU]
1. TUYỆT ĐỐI KHÔNG tạo dữ liệu giả (pd.DataFrame({{...}}), np.random.*, mock data).
2. TUYỆT ĐỐI KHÔNG import dataset ngoài (pd.read_csv() path khác, requests, open() file).
3. CHỈ dùng cột đã liệt kê trong schema. Nếu cột không tồn tại, báo lỗi trong explanation.
4. Code PHẢI kết thúc bằng: chart_data = [...] và chart_type = '...'

[QUY TẮC XẾP HẠNG "TOP N" — QUAN TRỌNG]
Khi người dùng hỏi "N tỉnh cao nhất", "top N", "5 tỉnh có...", "3 tỉnh thấp nhất"... PHẢI dùng sort_values + head(N):
# Đoạn code này sắp xếp giảm dần theo nhiệt độ trung bình để tìm các tỉnh cao nhất, sử dụng hàm sort_values() của Pandas.
result_df = result_df.sort_values('temp_mean', ascending=False)
# Đoạn code này chỉ giữ lại 5 tỉnh đầu tiên (cao nhất), sử dụng hàm head() của Pandas.
result_df = result_df.head(5)
KHÔNG được trả về toàn bộ dữ liệu khi người dùng chỉ hỏi N phần tử.

[ĐỊNH DẠNG GIẢI THÍCH — BẮT BUỘC]
Trường "explanation" phải viết ĐẦY ĐỦ, CỤ THỂ cho câu hỏi NÀY (không dùng template chung):
"Yêu cầu: [mô tả cụ thể người dùng muốn phân tích gì, chỉ số nào, so sánh gì, phạm vi nào].
Các bước thực hiện:
1. [Bước 1: thao tác gì, dùng hàm gì, lọc theo điều kiện gì — cụ thể]
2. [Bước 2: tiếp theo]
3. [...]
Kết quả mong đợi: [mô tả biểu đồ/bảng hiển thị gì, trục X là gì, trục Y là gì, đơn vị là gì]"

[ĐỊNH DẠNG COMMENT CODE — BẮT BUỘC]
MỖI dòng hoặc nhóm lệnh PHẢI có comment tiếng Việt ngay TRÊN, theo đúng mẫu:
# Đoạn code này [làm gì cụ thể], sử dụng hàm [hàm()] của [thư viện].
Ví dụ chuẩn:
# Đoạn code này tạo bản sao dữ liệu để không làm thay đổi DataFrame gốc, sử dụng hàm copy() của Pandas.
df_work = df.copy()
# Đoạn code này nhóm dữ liệu theo tỉnh và tính nhiệt độ trung bình mỗi tỉnh, sử dụng hàm groupby() và mean() của Pandas.
result_df = df_work.groupby('province')['temp_mean'].mean().reset_index()
# Đoạn code này sắp xếp giảm dần để tìm tỉnh có nhiệt độ cao nhất, sử dụng hàm sort_values() của Pandas.
result_df = result_df.sort_values('temp_mean', ascending=False)
# Đoạn code này chỉ giữ lại 5 tỉnh đầu tiên có nhiệt độ cao nhất, sử dụng hàm head() của Pandas.
result_df = result_df.head(5)
KHÔNG bỏ qua dòng nào không có comment. KHÔNG viết comment chung như "# xử lý dữ liệu".

[ĐỊNH DẠNG TRẢ VỀ]
Trả về JSON thuần (KHÔNG có markdown ```json):
{{
  "explanation": "[Yêu cầu / Các bước / Kết quả mong đợi — cụ thể cho câu hỏi này]",
  "code": "[{engine_label} code với comment tiếng Việt kiểu 'Đoạn code này...' trên MỖI dòng/nhóm lệnh]"
}}
"""

        ai_text = ""
        ai_source = "unknown"

        # === Layer 2a: Thử 9Router trước (nếu đang chạy local) ===
        try:
            ai_text = _call_9router(
                f"Câu hỏi: {request.prompt}",
                system_prompt
            )
            if ai_text:
                ai_source = "9router"
                print(f"[AI] 9Router responded successfully")
        except Exception as router_err:
            print(f"[AI] 9Router unavailable ({router_err}), falling back to Gemini...")

        # === Layer 2b: Fallback sang Gemini nếu 9Router offline ===
        if not ai_text:
            candidate_models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest']
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
                        ai_source = f"gemini/{model_name}"
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
            code, explanation, _ = local_analysis_code(request.prompt)
            source = "template_fallback"
        else:
            source = "gemini"
        code = normalize_generated_python(code)

        # Save to local SQLite — get real row ID to use as log_id for execute endpoint
        resolved_chart_type = chart_type if chart_type else "bar"
        sqlite_row_id = _save_local_log(
            request.prompt, code, explanation, resolved_chart_type,
            source=source, user_email=request.user_email, engine=request.engine
        )

        # 3. Save AI response to Supabase gracefully
        log_id = str(sqlite_row_id)  # Use real SQLite ID so /api/execute can UPDATE it
        try:
            ai_res = supabase.table("chat_history").insert({
                "role": "ai",
                "content": explanation
            }).execute()
        except Exception as sb_err:
            print("Supabase log error (ignored):", sb_err)

        return {
            "status": "success",
            "log_id": log_id,
            "code": code,
            "explanation": explanation,
            "chart_type": resolved_chart_type
        }

    except Exception as e:
        print(f"Error in generate endpoint: {str(e)}")
        # Guaranteed safe return instead of 500 error!
        code, explanation, chart_type = local_analysis_code(request.prompt)
        return {
            "status": "success",
            "log_id": "fallback_log",
            "explanation": explanation,
            "code": code,
            "chart_type": chart_type
        }

class AnalyzeChartRequest(BaseModel):
    question: str
    chart_data: list
    chart_type: str


def local_four_axis_insight(request: AnalyzeChartRequest) -> dict:
    """Create useful 4-axis insight directly from the chart data."""
    rows = [row for row in (request.chart_data or []) if isinstance(row, dict)]
    values = []
    for row in rows:
        value = row.get("value")
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            values.append((str(row.get("name", "Nhóm dữ liệu")), float(value)))

    if not values:
        return {
            "available": False,
            "descriptive": f"Truy vấn có {len(rows)} bản ghi, nhưng chưa có cột giá trị số chuẩn để tổng hợp.",
            "diagnostic": "Cần kiểm tra lại cột dùng làm giá trị biểu đồ hoặc chọn một phép tổng hợp số học.",
            "predictive": "Chưa đủ dữ liệu định lượng để suy ra xu hướng đáng tin cậy.",
            "prescriptive": "Hãy tạo lại đề xuất với các trường như nhiệt độ, lượng mưa, độ ẩm hoặc tốc độ gió.",
        }

    highest_name, highest = max(values, key=lambda item: item[1])
    lowest_name, lowest = min(values, key=lambda item: item[1])
    average = sum(value for _, value in values) / len(values)
    spread = highest - lowest
    subject = request.question.strip() or "chỉ số được chọn"

    return {
        "available": True,
        "descriptive": (
            f"Với câu hỏi '{subject}', biểu đồ gồm {len(values)} nhóm. "
            f"Giá trị trung bình là {average:.2f}; cao nhất thuộc {highest_name} ({highest:.2f}) "
            f"và thấp nhất thuộc {lowest_name} ({lowest:.2f})."
        ),
        "diagnostic": (
            f"Độ chênh giữa nhóm cao nhất và thấp nhất là {spread:.2f}. "
            "Khác biệt này thường liên quan đến vị trí địa lý, mùa quan sát và điều kiện khí hậu từng khu vực; "
            "cần đối chiếu thêm theo thời gian để kết luận nguyên nhân cụ thể."
        ),
        "predictive": (
            f"Nếu điều kiện quan sát giữ tương tự, {highest_name} là nhóm cần được theo dõi ưu tiên. "
            "Đây là xu hướng tham khảo từ dữ liệu hiện có, không thay thế dự báo khí tượng chính thức."
        ),
        "prescriptive": (
            f"Ưu tiên kiểm tra {highest_name} và các nhóm gần mức cao, cập nhật dữ liệu định kỳ, "
            "đồng thời kết hợp cảnh báo thời tiết thực tế trước khi ra quyết định vận hành hoặc sản xuất."
        ),
    }

@app.post("/api/ai/analyze-chart")
async def analyze_chart(request: AnalyzeChartRequest):
    try:
        data_sample = str(request.chart_data[:5]) if len(request.chart_data) > 5 else str(request.chart_data)
        system_prompt = f"""Ban la chuyen gia phan tich du lieu khi tuong thuy van Viet Nam.
Cau hoi goc cua nguoi dung: \"{request.question}\"
Loai bieu do: {request.chart_type}
Du lieu mau (toi da 5 dong): {data_sample}

Hay phan tich SAU VA LINH HOAT dua tren dung noi dung cau hoi va du lieu thuc te.
NGHIEM CAM viet chung chung, copy template. PHAI cu the hoa theo cau hoi va so lieu trong du lieu.

Bat buoc tra ve JSON voi 4 truc phan tich (4-Axis Analytics).
Moi truc PHAI:
- Neu ten cu the cac tinh/vung/gia tri xuat hien trong du lieu
- Tra loi dung vao cau hoi nguoi dung dat ra
- Dung so lieu thuc te tu du lieu mau neu co
- Linh hoat theo loai cau hoi (so sanh, xu huong, tuong quan, phan bo...)

{{
  "descriptive": "[Mo ta: Dang xay ra dieu gi trong du lieu? Neu cu the so lieu, ten dia diem, gia tri cao/thap]",
  "diagnostic": "[Chan doan: Tai sao lai co ket qua nhu vay? Giai thich nguyen nhan khi hau, dia ly, mua vu lien quan den cau hoi]",
  "predictive": "[Du doan: Xu huong tiep theo se nhu the nao? Cu the hoa theo loai phan tich dang lam]",
  "prescriptive": "[De xuat: Can lam gi? Kien nghi hanh dong cu the phu hop voi ket qua phan tich]"
}}
CHI tra ve JSON nguyen thuy, khong co markdown ```json.
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
        return local_four_axis_insight(request)


@app.get("/api/ai/suggest-methods")
async def suggest_analysis_methods():
    """Return curated analysis method suggestions for users who don't know where to start."""
    suggestions = [
        {
            "id": "trend",
            "category": "Xu hướng thời gian",
            "icon": "📈",
            "title": "Phân tích xu hướng nhiệt độ theo năm",
            "description": "Xem nhiệt độ trung bình các tỉnh tăng hay giảm theo thời gian",
            "example_prompt": "Vẽ biểu đồ xu hướng nhiệt độ trung bình theo tháng của Hà Nội, TP.HCM và Đà Nẵng",
            "difficulty": "Dễ",
            "chart_hint": "line"
        },
        {
            "id": "ranking",
            "category": "Xếp hạng so sánh",
            "icon": "🏆",
            "title": "Xếp hạng tỉnh theo lượng mưa",
            "description": "Tìm 10 tỉnh có lượng mưa cao nhất hoặc thấp nhất",
            "example_prompt": "Xếp hạng 10 tỉnh có lượng mưa trung bình cao nhất",
            "difficulty": "Dễ",
            "chart_hint": "bar-horizontal"
        },
        {
            "id": "seasonal",
            "category": "Phân tích mùa vụ",
            "icon": "🌸",
            "title": "So sánh các mùa trong năm",
            "description": "Xem sự khác biệt về thời tiết giữa 4 mùa Xuân-Hè-Thu-Đông",
            "example_prompt": "So sánh nhiệt độ và lượng mưa trung bình theo 4 mùa của miền Bắc",
            "difficulty": "Dễ",
            "chart_hint": "bar"
        },
        {
            "id": "correlation",
            "category": "Tương quan",
            "icon": "🔗",
            "title": "Mối quan hệ nhiệt độ và độ ẩm",
            "description": "Phân tích tương quan giữa nhiệt độ và độ ẩm không khí",
            "example_prompt": "Phân tích tương quan giữa nhiệt độ trung bình và độ ẩm trung bình của toàn bộ các tỉnh",
            "difficulty": "Trung bình",
            "chart_hint": "scatter"
        },
        {
            "id": "regional",
            "category": "So sánh vùng miền",
            "icon": "🗺️",
            "title": "So sánh khí hậu 7 vùng của Việt Nam",
            "description": "Nhìn tổng thể sự khác biệt khí hậu giữa các vùng địa lý",
            "example_prompt": "So sánh nhiệt độ trung bình và lượng mưa trung bình của 7 vùng khí hậu Việt Nam",
            "difficulty": "Trung bình",
            "chart_hint": "radar"
        },
        {
            "id": "extreme",
            "category": "Phân tích cực đoan",
            "icon": "⚡",
            "title": "Phát hiện đợt nắng nóng / mưa lớn",
            "description": "Tìm các ngày có nhiệt độ cao bất thường hoặc lượng mưa cực đại",
            "example_prompt": "Tìm 20 ngày có nhiệt độ cao nhất trong lịch sử dữ liệu và tỉnh xảy ra",
            "difficulty": "Trung bình",
            "chart_hint": "bar-horizontal"
        },
        {
            "id": "wind",
            "category": "Phân tích gió",
            "icon": "💨",
            "title": "Phân tích hướng gió và tốc độ gió",
            "description": "Xem hoa gió và phân bố tốc độ gió theo vùng miền",
            "example_prompt": "Vẽ biểu đồ hoa gió cho miền Trung Việt Nam",
            "difficulty": "Nâng cao",
            "chart_hint": "wind-rose"
        },
        {
            "id": "anomaly",
            "category": "Phân tích bất thường",
            "icon": "🚨",
            "title": "Phát hiện tỉnh có khí hậu bất thường",
            "description": "Tìm các tỉnh có chỉ số khí hậu khác biệt so với vùng xung quanh",
            "example_prompt": "Tính điểm bất thường khí hậu tổng hợp (nhiệt độ, mưa, gió) cho từng tỉnh và xếp hạng",
            "difficulty": "Nâng cao",
            "chart_hint": "bar"
        }
    ]
    return {"status": "success", "suggestions": suggestions}

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
    import time as _time
    exec_start = _time.time()
    error_log_str = ""
    row_count_val = 0
    table_data_str = ""
    chart_data = None
    chart_type = request.chart_type or "bar"
    additional_charts = []
    result_data = ""

    try:
        if not os.path.exists(CSV_PATH):
            raise FileNotFoundError(f"Không tìm thấy tệp dữ liệu: {CSV_PATH}")

        df = pd.read_csv(CSV_PATH)
        row_count_val = len(df)
        safe_code = normalize_generated_python(request.code)

        # Restricted builtins — block dangerous imports and file operations
        safe_builtins = {
            k: v for k, v in __builtins__.__dict__.items()
            if k in (
                'print', 'len', 'range', 'int', 'float', 'str', 'list', 'dict',
                'tuple', 'set', 'sorted', 'min', 'max', 'sum', 'abs', 'round',
                'enumerate', 'zip', 'map', 'filter', 'isinstance', 'type',
                'True', 'False', 'None', 'bool', 'any', 'all', 'reversed',
                'hasattr', 'getattr', 'ValueError', 'TypeError', 'KeyError',
                'IndexError', 'Exception', 'StopIteration',
            )
        } if hasattr(__builtins__, '__dict__') else {
            k: __builtins__[k] for k in (
                'print', 'len', 'range', 'int', 'float', 'str', 'list', 'dict',
                'tuple', 'set', 'sorted', 'min', 'max', 'sum', 'abs', 'round',
                'enumerate', 'zip', 'map', 'filter', 'isinstance', 'type',
                'bool', 'any', 'all', 'reversed',
            ) if k in __builtins__
        }
        execution_env = {"__builtins__": safe_builtins, "pd": pd, "df": df, "json": json}
        exec(safe_code, execution_env, execution_env)
        chart_data = execution_env.get("chart_data")
        chart_type = execution_env.get("chart_type", request.chart_type or "bar")
        additional_charts = execution_env.get("additional_charts", [])

        # Capture table_data: first 10 rows of result as JSON
        table_data_raw = execution_env.get("table_data") or execution_env.get("df_result")
        if table_data_raw is not None and hasattr(table_data_raw, 'head'):
            try:
                table_data_str = table_data_raw.head(10).to_json(orient='records', force_ascii=False)
            except Exception:
                table_data_str = ""
        elif chart_data and isinstance(chart_data, list):
            try:
                table_data_str = json.dumps(chart_data[:10], ensure_ascii=False)
            except Exception:
                table_data_str = ""

        if not chart_data:
            raise ValueError("Mã phân tích chưa tạo chart_data. Hãy sinh lại đề xuất.")
        result_data = json.dumps(chart_data, ensure_ascii=False, default=str)

    except Exception as e:
        error_log_str = str(e)
        exec_ms = int((_time.time() - exec_start) * 1000)
        # Update SQLite error log if log_id is numeric
        try:
            log_id_int = int(str(request.log_id).replace("local_log_", ""))
            conn = sqlite3.connect(SQLITE_PATH)
            conn.execute(
                "UPDATE ai_sessions SET error_log=?, execution_time_ms=?, status='rejected' WHERE id=?",
                (error_log_str, exec_ms, log_id_int)
            )
            conn.commit(); conn.close()
        except Exception:
            pass
        return {"status": "error", "error_message": error_log_str}

    exec_ms = int((_time.time() - exec_start) * 1000)

    # Update SQLite with execution results
    try:
        log_id_int = int(str(request.log_id).replace("local_log_", ""))
        conn = sqlite3.connect(SQLITE_PATH)
        conn.execute(
            """UPDATE ai_sessions
               SET status='approved', execution_time_ms=?, row_count=?, table_data=?, chart_data=?, chart_type=?
               WHERE id=?""",
            (exec_ms, row_count_val, table_data_str, result_data, chart_type, log_id_int)
        )
        conn.commit(); conn.close()
    except Exception as upd_err:
        print("SQLite update failed:", upd_err)

    # Save logs opportunistically to Supabase
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
        "additional_charts": additional_charts,
        "execution_time_ms": exec_ms,
        "row_count": row_count_val,
        "table_data": table_data_str,
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

# ---------- Local SQLite Log Endpoints ----------

class FullLogSaveRequest(BaseModel):
    user_email: str = ""
    question: str
    explanation: str = ""
    original_code: str = ""
    human_edited_code: str = ""
    status: str = "approved"
    chart_type: str = "bar"
    chart_data: str = ""
    insight_json: str = ""
    source: str = "template"

@app.post("/api/logs/save-full")
async def save_full_log(request: FullLogSaveRequest):
    try:
        _save_local_log(
            question=request.question,
            code=request.original_code,
            explanation=request.explanation,
            chart_type=request.chart_type,
            source=request.source,
            user_email=request.user_email,
            human_code=request.human_edited_code,
            status=request.status,
            chart_data=request.chart_data,
            insight_json=request.insight_json,
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs/local")
async def get_local_logs(user_email: str = ""):
    try:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        if user_email:
            rows = conn.execute(
                "SELECT * FROM ai_sessions WHERE user_email=? ORDER BY created_at DESC LIMIT 50",
                (user_email,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM ai_sessions ORDER BY created_at DESC LIMIT 50"
            ).fetchall()
        conn.close()
        data = []
        for row in rows:
            item = dict(row)
            # Parse chart_data back to list if possible
            if item.get("chart_data"):
                try:
                    item["chart_data"] = json.loads(item["chart_data"])
                except Exception:
                    pass
            if item.get("insight_json"):
                try:
                    item["insight_json"] = json.loads(item["insight_json"])
                except Exception:
                    pass
            data.append(item)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/logs/local/{log_id}/status")
async def update_log_status(log_id: int, status: str = "approved"):
    conn = sqlite3.connect(SQLITE_PATH)
    conn.execute("UPDATE ai_sessions SET status=? WHERE id=?", (status, log_id))
    conn.commit()
    conn.close()
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
