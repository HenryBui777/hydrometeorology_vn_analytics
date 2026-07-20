"""Shared dataset loader and schema used by the analyst endpoints."""
from pathlib import Path
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_CANDIDATES = (
    ROOT_DIR / "data" / "processed" / "cleaned_data.csv",
    ROOT_DIR / "data" / "raw" / "vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv",
)

RENAME_MAP = {
    "temperature_2m_mean": "temp_mean", "temperature_2m_max": "temp_max",
    "temperature_2m_min": "temp_min", "apparent_temperature_mean": "app_temp_mean",
    "apparent_temperature_max": "app_temp_max", "apparent_temperature_min": "app_temp_min",
    "relative_humidity_2m_mean": "humidity_mean", "wind_speed_10m_max": "wind_speed_max",
    "wind_gusts_10m_max": "wind_gusts_max", "et0_fao_evapotranspiration": "et0",
    "pressure_msl_mean": "pressure", "cloud_cover_mean": "cloud_cover",
    "dew_point_2m_mean": "dew_point",
}

def get_dataset_path() -> Path:
    for path in DATA_CANDIDATES:
        if path.exists():
            return path
    raise FileNotFoundError("Không tìm thấy tệp dữ liệu CSV.")

def load_dataset() -> pd.DataFrame:
    df = pd.read_csv(get_dataset_path())
    df = df.rename(columns=RENAME_MAP)
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
    return df

def schema_summary() -> str:
    df = load_dataset()
    return ", ".join(df.columns)
