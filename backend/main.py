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
import unicodedata

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


def normalized_text(value: str) -> str:
    return " ".join("".join(
        char for char in unicodedata.normalize("NFD", (value or "").lower())
        if unicodedata.category(char) != "Mn"
    ).replace("đ", "d").split())


def infer_general_analysis(prompt: str) -> tuple[str, str, str]:
    """Infer an analysis plan for natural questions outside the predefined set."""
    text = normalized_text(prompt)
    provinces = [name for name, aliases in PROVINCE_ALIASES.items() if any(alias in text for alias in aliases)]
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
        if any(alias in text for alias in aliases) and metric not in metrics:
            metrics.append(metric)
    if not metrics:
        metrics = ["temp_mean"]

    filters = ["df_work = df.copy()"]
    if provinces:
        filters.append(f"df_work = df_work[df_work['province'].isin({provinces!r})]")
    if month_match:
        filters.append(f"df_work = df_work[df_work['month'].eq({int(month_match.group(1))})]")
    if season:
        filters.append(f"df_work = df_work[df_work['season'].eq({season!r})]")
    filter_code = "\n".join(filters)

    wants_relationship = any(word in text for word in ("tuong quan", "moi quan he", "ty le nghich", "anh huong", "lien quan", "scatter", "phan tan"))
    wants_time = any(word in text for word in ("xu huong", "dien bien", "theo thoi gian", "qua 12 thang", "theo thang", "hang thang"))
    wants_composition = any(word in text for word in ("ty trong", "ti trong", "co cau", "phan tram"))

    if wants_relationship:
        if len(metrics) < 2:
            metrics.append("humidity_mean" if metrics[0] != "humidity_mean" else "temp_mean")
        x_metric, y_metric = metrics[:2]
        return (f"""{filter_code}
result_df = df_work[['province', '{x_metric}', '{y_metric}']].dropna().copy()
if len(result_df) > 800:
    result_df = result_df.sample(800, random_state=42)
result_df = result_df.rename(columns={{'province': 'name', '{x_metric}': 'x', '{y_metric}': 'y'}})
chart_data = result_df.to_dict(orient='records')
chart_type = 'scatter'""", "Biểu đồ phân tán được chọn để kiểm tra mối quan hệ giữa hai biến được hỏi.", "scatter")

    # A time question uses a line chart; each explicitly named province becomes one series.
    if wants_time and not month_match:
        metric = metrics[0]
        if len(provinces) >= 2:
            return (f"""{filter_code}
result_df = (df_work.groupby(['month', 'province'])[{metric!r}].mean().unstack('province').reset_index())
result_df = result_df.rename(columns={{'month': 'name'}}).sort_values('name')
result_df['name'] = result_df['name'].map(lambda month: f'Tháng {{month}}')
chart_data = result_df.to_dict(orient='records')
chart_type = 'line'""", "Biểu đồ đường được chọn để so sánh diễn biến theo tháng của các địa điểm được nêu.", "line")
        return (f"""{filter_code}
result_df = (df_work.groupby('month', as_index=False)[{metric!r}].mean()
    .rename(columns={{'month': 'name', {metric!r}: 'value'}}).sort_values('name'))
result_df['name'] = result_df['name'].map(lambda month: f'Tháng {{month}}')
chart_data = result_df.to_dict(orient='records')
chart_type = 'line'""", "Biểu đồ đường được chọn để thể hiện diễn biến theo tháng.", "line")

    group = "province" if provinces or "tinh" in text or "thanh pho" in text else ("season" if "mua" in text else "region")
    aggregations = ", ".join(f"{metric}=({metric!r}, 'mean')" for metric in metrics)
    chart_type = "pie" if wants_composition and len(metrics) == 1 else "bar"
    return (f"""{filter_code}
result_df = (df_work.groupby('{group}', as_index=False).agg({aggregations})
    .rename(columns={{'{group}': 'name'}}))
chart_data = result_df.to_dict(orient='records')
chart_type = '{chart_type}'""", "Biểu đồ được chọn theo loại câu hỏi, biến cần so sánh và các điều kiện lọc được nhận diện từ yêu cầu.", chart_type)


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
chart_data = result_df.to_dict(orient='records')
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
        # Use the verified KTTV intent templates first. This prevents an LLM
        # from silently changing the user's scope (for example, turning a
        # summer Hanoi-vs-HCMC comparison into a national Top-10 ranking).
        code, explanation, chart_type = local_analysis_code(request.prompt)
        return {
            "status": "success",
            "log_id": f"local_log_{int(time.time())}",
            "code": code,
            "explanation": explanation,
            "chart_type": chart_type,
        }

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
            code, explanation, _ = local_analysis_code(request.prompt)
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
        return local_four_axis_insight(request)

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
        additional_charts = execution_env.get("additional_charts", [])
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
        "additional_charts": additional_charts,
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
