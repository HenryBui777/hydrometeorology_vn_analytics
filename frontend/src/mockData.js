// Mock Data for Vietnamese Hydrometeorology AI Analytics Dashboard

export const mockDatasetInfo = {
  name: "vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv",
  size: "2.38 MB",
  rows: 6156,
  columnsCount: 36,
  description: "Dữ liệu khí tượng thủy văn của 34 tỉnh thành Việt Nam từ tháng 12/2025 đến tháng 6/2026, thu thập từ API Open-Meteo. Dữ liệu đã được gộp và tính trung bình theo ngày.",
  columns: [
    { name: "province", type: "String", nullCount: 0, description: "Tên tỉnh/thành phố tại Việt Nam (ví dụ: Hà Nội, TP. Hồ Chí Minh, Huế...)" },
    { name: "region", type: "String", nullCount: 0, description: "Vùng địa lý (Đồng bằng sông Hồng, Tây Nguyên, Đông Nam Bộ, Bắc Trung Bộ...)" },
    { name: "date", type: "Date (YYYY-MM-DD)", nullCount: 0, description: "Ngày ghi nhận dữ liệu thời tiết" },
    { name: "temperature_2m_mean", type: "Float (°C)", nullCount: 0, description: "Nhiệt độ trung bình đo ở độ cao 2 mét" },
    { name: "temperature_2m_max", type: "Float (°C)", nullCount: 0, description: "Nhiệt độ cực đại trong ngày ở độ cao 2 mét" },
    { name: "temperature_2m_min", type: "Float (°C)", nullCount: 0, description: "Nhiệt độ cực tiểu trong ngày ở độ cao 2 mét" },
    { name: "apparent_temperature_mean", type: "Float (°C)", nullCount: 0, description: "Nhiệt độ cảm nhận trung bình (nhiệt độ cảm giác)" },
    { name: "apparent_temperature_max", type: "Float (°C)", nullCount: 0, description: "Nhiệt độ cảm nhận cực đại" },
    { name: "apparent_temperature_min", type: "Float (°C)", nullCount: 0, description: "Nhiệt độ cảm nhận cực tiểu" },
    { name: "precipitation_sum", type: "Float (mm)", nullCount: 0, description: "Tổng lượng mưa tích lũy trong ngày (mưa + mưa rào)" },
    { name: "rain_sum", type: "Float (mm)", nullCount: 0, description: "Tổng lượng mưa lớn trong ngày" },
    { name: "showers_sum", type: "Float (mm)", nullCount: 0, description: "Tổng lượng mưa rào tích lũy" },
    { name: "precipitation_hours", type: "Float (h)", nullCount: 0, description: "Số giờ có mưa xuất hiện" },
    { name: "relative_humidity_2m_mean", type: "Float (%)", nullCount: 0, description: "Độ ẩm tương đối trung bình" },
    { name: "wind_speed_10m_max", type: "Float (km/h)", nullCount: 0, description: "Tốc độ gió lớn nhất đo ở độ cao 10 mét" },
    { name: "wind_gusts_10m_max", type: "Float (km/h)", nullCount: 0, description: "Tốc độ gió giật cực đại ở độ cao 10 mét" },
    { name: "shortwave_radiation_sum", type: "Float (MJ/m²)", nullCount: 0, description: "Tổng lượng bức xạ sóng ngắn mặt trời chiếu xuống" },
    { name: "pressure_msl_mean", type: "Float (hPa)", nullCount: 0, description: "Áp suất khí quyển trung bình ở mực nước biển trung bình" },
    { name: "cloud_cover_mean", type: "Float (%)", nullCount: 0, description: "Độ che phủ mây trung bình trong ngày" },
    { name: "dew_point_2m_mean", type: "Float (°C)", nullCount: 0, description: "Điểm sương trung bình đo ở độ cao 2 mét" },
    { name: "snowfall_sum", type: "Float (cm)", nullCount: 0, description: "Tổng lượng tuyết rơi tích lũy trong ngày" },
    { name: "et0_fao_evapotranspiration", type: "Float (mm)", nullCount: 0, description: "Lượng bay hơi tham chiếu FAO" },
    { name: "latitude", type: "Float (°)", nullCount: 0, description: "Vĩ độ địa lý của trạm quan trắc" },
    { name: "longitude", type: "Float (°)", nullCount: 0, description: "Kinh độ địa lý của trạm quan trắc" },
    { name: "sunshine_hours", type: "Float (h)", nullCount: 0, description: "Tổng số giờ có nắng trong ngày" },
    { name: "daylight_hours", type: "Float (h)", nullCount: 0, description: "Tổng số giờ ánh sáng ban ngày" },
    { name: "month", type: "Integer", nullCount: 0, description: "Tháng trong năm (1 - 12)" },
    { name: "week", type: "Integer", nullCount: 0, description: "Tuần trong năm (1 - 53)" },
    { name: "weather_code", type: "Integer", nullCount: 0, description: "Mã thời tiết tiêu chuẩn WMO (Weather code)" },
    { name: "wind_direction_10m_dominant", type: "String/Integer", nullCount: 0, description: "Hướng gió chính dominant trong ngày" },
    { name: "sunrise", type: "Date/Time", nullCount: 0, description: "Thời gian mặt trời mọc (UTC+7)" },
    { name: "sunset", type: "Date/Time", nullCount: 0, description: "Thời gian mặt trời lặn (UTC+7)" },
    { name: "season", type: "String", nullCount: 120, description: "Mùa thời tiết khí hậu Việt Nam (Xuân, Hạ, Thu, Đông)" },
    { name: "uv_index_max", type: "Float", nullCount: 154, description: "Chỉ số bức xạ tia cực tím (UV) cực đại trong ngày" },
    { name: "uv_index_clear_sky_max", type: "Float", nullCount: 154, description: "Chỉ số UV cực đại khi trời quang đãng" },
    { name: "precipitation_probability_max", type: "Float (%)", nullCount: 180, description: "Xác suất khả năng xảy ra mưa lớn nhất" }
  ],
  sampleRows: [
    { province: "Hà Nội", region: "Đồng bằng sông Hồng", date: "2026-05-15", temperature_2m_mean: 28.5, temperature_2m_max: 33.2, temperature_2m_min: 24.1, apparent_temperature_mean: 31.8, precipitation_sum: 0.0, relative_humidity_2m_mean: 78.2, wind_speed_10m_max: 12.5, shortwave_radiation_sum: 22.4, cloud_cover_mean: 45.0, uv_index_max: 8.5, wind_direction_10m_dominant: "Đông Nam", season: "Hạ" },
    { province: "Hồ Chí Minh", region: "Đông Nam Bộ", date: "2026-05-15", temperature_2m_mean: 31.2, temperature_2m_max: 35.8, temperature_2m_min: 27.5, apparent_temperature_mean: 36.4, precipitation_sum: 12.4, relative_humidity_2m_mean: 82.5, wind_speed_10m_max: 15.2, shortwave_radiation_sum: 18.9, cloud_cover_mean: 72.0, uv_index_max: 9.0, wind_direction_10m_dominant: "Tây Nam", season: "Hạ" },
    { province: "Huế", region: "Bắc Trung Bộ", date: "2026-05-15", temperature_2m_mean: 29.8, temperature_2m_max: 34.6, temperature_2m_min: 25.8, apparent_temperature_mean: 33.5, precipitation_sum: 2.5, relative_humidity_2m_mean: 80.1, wind_speed_10m_max: 10.8, shortwave_radiation_sum: 21.0, cloud_cover_mean: 58.0, uv_index_max: 8.8, wind_direction_10m_dominant: "Đông", season: "Hạ" },
    { province: "Gia Lai", region: "Tây Nguyên", date: "2026-05-15", temperature_2m_mean: 24.6, temperature_2m_max: 29.2, temperature_2m_min: 21.0, apparent_temperature_mean: 26.2, precipitation_sum: 8.2, relative_humidity_2m_mean: 85.4, wind_speed_10m_max: 18.5, shortwave_radiation_sum: 16.5, cloud_cover_mean: 64.0, uv_index_max: 7.5, wind_direction_10m_dominant: "Đông", season: "Hạ" },
    { province: "Cao Bằng", region: "Trung du miền núi Bắc Bộ", date: "2026-05-15", temperature_2m_mean: 23.4, temperature_2m_max: 27.5, temperature_2m_min: 19.8, apparent_temperature_mean: 24.8, precipitation_sum: 0.0, relative_humidity_2m_mean: 74.0, wind_speed_10m_max: 8.4, shortwave_radiation_sum: 23.1, cloud_cover_mean: 38.0, uv_index_max: 8.2, wind_direction_10m_dominant: "Bắc", season: "Hạ" },
    { province: "An Giang", region: "Đồng bằng sông Cửu Long", date: "2026-05-15", temperature_2m_mean: 30.5, temperature_2m_max: 34.9, temperature_2m_min: 26.2, apparent_temperature_mean: 35.1, precipitation_sum: 5.6, relative_humidity_2m_mean: 81.3, wind_speed_10m_max: 14.1, shortwave_radiation_sum: 19.5, cloud_cover_mean: 68.0, uv_index_max: 9.2, wind_direction_10m_dominant: "Tây Nam", season: "Hạ" },
    { province: "Đà Nẵng", region: "Duyên hải Nam Trung Bộ", date: "2026-05-15", temperature_2m_mean: 29.2, temperature_2m_max: 33.8, temperature_2m_min: 25.5, apparent_temperature_mean: 32.7, precipitation_sum: 0.0, relative_humidity_2m_mean: 79.0, wind_speed_10m_max: 11.2, shortwave_radiation_sum: 21.8, cloud_cover_mean: 50.0, uv_index_max: 8.7, wind_direction_10m_dominant: "Đông Nam", season: "Hạ" }
  ]
};

export const predefinedQueries = [
  {
    id: 1,
    title: "So sánh lượng mưa các vùng",
    question: "So sánh lượng mưa trung bình giữa các vùng miền ở Việt Nam trong quý 1/2026.",
    explanation: "Tính toán lượng mưa trung bình theo từng vùng (region) từ tháng 12/2025 đến tháng 03/2026, sau đó vẽ biểu đồ cột để so sánh lượng mưa tích lũy giữa các vùng địa lý.",
    code: `import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# 1. Đọc dữ liệu từ file CSV cục bộ
df = pd.read_csv("data/raw/vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv")

# 2. Chuyển đổi cột date sang định dạng datetime
df['date'] = pd.to_datetime(df['date'])

# 3. Lọc dữ liệu trong thời gian quý 1/2026 (Tháng 12/2025 - Tháng 3/2026)
df_q1 = df[(df['date'] >= '2025-12-01') & (df['date'] <= '2026-03-31')]

# 4. Tính toán lượng mưa trung bình theo vùng
region_rain = df_q1.groupby('region')['precipitation_sum'].mean().reset_index()
region_rain = region_rain.sort_values(by='precipitation_sum', ascending=False)

# Đoạn code này sẽ tính trung bình lượng mưa của từng vùng địa lý
# sử dụng hàm groupby() của thư viện Pandas.

# 5. Vẽ biểu đồ cột bằng seaborn
plt.figure(figsize=(10, 6))
sns.set_theme(style="darkgrid")
sns.barplot(
    data=region_rain, 
    x='precipitation_sum', 
    y='region', 
    palette='viridis'
)

plt.title('Lượng mưa trung bình theo vùng miền (Quý 1/2026)', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('Lượng mưa trung bình (mm)', fontsize=12)
plt.ylabel('Vùng miền', fontsize=12)
plt.tight_layout()

# 6. Lưu biểu đồ đầu ra thành file ảnh để frontend hiển thị
plt.savefig("static/results/precipitation_by_region.png", dpi=300)
print("=== KẾT QUẢ THỰC THI ===")
print(region_rain.to_string(index=False))
`,
    logs: [
      "[2026-06-24 12:49:05] Khởi động môi trường Python (Python v3.14.0)...",
      "[2026-06-24 12:49:06] Import các thư viện pandas, matplotlib, seaborn thành công.",
      "[2026-06-24 12:49:06] Loading dataset 'data/raw/vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv' (6,156 rows)...",
      "[2026-06-24 12:49:07] Xử lý lọc dữ liệu theo khoảng thời gian: 2025-12-01 -> 2026-03-31.",
      "[2026-06-24 12:49:07] Nhóm dữ liệu theo cột 'region' và tính trung bình 'precipitation_sum'...",
      "[2026-06-24 12:49:07] Vẽ biểu đồ Barplot và lưu ảnh vào 'static/results/precipitation_by_region.png'...",
      "[2026-06-24 12:49:08] === KẾT QUẢ THỰC THI ===",
      "Vùng miền                                Lượng mưa trung bình (mm)",
      "Bắc Trung Bộ                                              4.562",
      "Duyên hải Nam Trung Bộ                                    3.818",
      "Tây Nguyên                                                2.115",
      "Đồng bằng sông Cửu Long                                   1.248",
      "Trung du miền núi Bắc Bộ                                  0.984",
      "Đông Nam Bộ                                               0.842",
      "Đồng bằng sông Hồng                                       0.536",
      "[2026-06-24 12:49:08] Tiến trình hoàn tất thành công với mã thoát (exit code) 0."
    ],
    kpis: [
      { label: "Lượng Mưa Lớn Nhất", value: "4.56 mm", desc: "Khu vực Bắc Trung Bộ", trend: "up" },
      { label: "Lượng Mưa Nhỏ Nhất", value: "0.54 mm", desc: "Khu vực ĐBS Hồng", trend: "down" },
      { label: "Lượng Mưa Toàn Quốc TB", value: "2.01 mm", desc: "Trung bình 34 tỉnh thành", trend: "neutral" }
    ],
    chartType: "bar",
    chartData: [
      { name: "Bắc Trung Bộ", value: 4.56, color: "#2563EB" },
      { name: "Nam Trung Bộ", value: 3.82, color: "#06B6D4" },
      { name: "Tây Nguyên", value: 2.12, color: "#10b981" },
      { name: "ĐBS Cửu Long", value: 1.25, color: "#e11d48" },
      { name: "Miền núi phía Bắc", value: 0.98, color: "#f59e0b" },
      { name: "Đông Nam Bộ", value: 0.84, color: "#ec4899" },
      { name: "Đồng bằng sông Hồng", value: 0.54, color: "#8b5cf6" }
    ]
  },
  {
    id: 2,
    title: "Xu hướng nhiệt độ 3 miền",
    question: "Vẽ xu hướng thay đổi nhiệt độ trung bình tại Hà Nội, Huế và TP. Hồ Chí Minh theo thời gian.",
    explanation: "Nhóm dữ liệu theo ngày và lọc riêng cho 3 thành phố đại diện 3 miền, sau đó vẽ đồ thị đường biểu diễn sự thay đổi của cột nhiệt độ trung bình (temperature_2m_mean).",
    code: `import pandas as pd
import matplotlib.pyplot as plt

# 1. Đọc dữ liệu
df = pd.read_csv("data/raw/vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv")
df['date'] = pd.to_datetime(df['date'])

# 2. Lọc 3 tỉnh thành đại diện
cities = ['Hà Nội', 'Huế', 'Hồ Chí Minh']
df_cities = df[df['province'].isin(cities)]

# 3. Tạo bảng xoay trục (pivot) để lấy nhiệt độ theo ngày
temp_pivot = df_cities.pivot_table(
    index='date', 
    columns='province', 
    values='temperature_2m_mean'
)

# Đoạn code này thực hiện gom dữ liệu theo cột ngày làm trục X
# và phân rã nhiệt độ của 3 thành phố thành 3 cột riêng biệt.

# 4. Vẽ biểu đồ đường
plt.figure(figsize=(12, 6))
plt.plot(temp_pivot.index, temp_pivot['Hà Nội'], label='Hà Nội (Bắc)', color='#06b6d4', linewidth=2)
plt.plot(temp_pivot.index, temp_pivot['Huế'], label='Huế (Trung)', color='#f59e0b', linewidth=2)
plt.plot(temp_pivot.index, temp_pivot['Hồ Chí Minh'], label='Hồ Chí Minh (Nam)', color='#f43f5e', linewidth=2)

plt.title('Xu hướng nhiệt độ trung bình 2m năm 2026', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('Thời gian', fontsize=12)
plt.ylabel('Nhiệt độ trung bình (°C)', fontsize=12)
plt.legend(frameon=True)
plt.grid(True, linestyle='--', alpha=0.3)
plt.tight_layout()

# 5. Lưu ảnh biểu đồ
plt.savefig("static/results/temperature_trend.png", dpi=300)
print("=== KẾT QUẢ THỰC THI ===")
print("Dữ liệu 5 ngày cuối cùng:")
print(temp_pivot.tail(5).to_string())
`,
    logs: [
      "[2026-06-24 12:51:10] Khởi động môi trường Python (Python v3.14.0)...",
      "[2026-06-24 12:51:11] Import pandas, matplotlib thành công.",
      "[2026-06-24 12:51:11] Đọc tệp dữ liệu 'vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv'...",
      "[2026-06-24 12:51:12] Tạo bảng xoay pivot với index='date' và columns='province'...",
      "[2026-06-24 12:51:12] Đang kết xuất đồ thị đa đường (Multi-line plot) biểu diễn xu hướng nhiệt độ...",
      "[2026-06-24 12:51:13] Lưu biểu đồ vào file 'static/results/temperature_trend.png'...",
      "[2026-06-24 12:51:13] === KẾT QUẢ THỰC THI ===",
      "Dữ liệu 5 ngày cuối cùng:",
      "province    Hà Nội    Huế   Hồ Chí Minh",
      "date                                   ",
      "2026-05-31   29.21  31.54        30.22",
      "2026-06-01   30.50  32.10        29.80",
      "2026-06-02   31.25  31.85        29.40",
      "2026-06-03   30.80  30.90        29.65",
      "2026-06-04   28.75  30.12        28.50",
      "[2026-06-24 12:51:13] Tiến trình kết thúc thành công (exit code 0)."
    ],
    kpis: [
      { label: "Nhiệt Độ TB Cao Nhất", value: "32.1 °C", desc: "Huế (Ngày 2026-06-01)", trend: "up" },
      { label: "Nhiệt Độ TB Thấp Nhất", value: "11.2 °C", desc: "Hà Nội (Tháng 12/2025)", trend: "down" },
      { label: "Chênh Lệch Bắc - Nam Max", value: "14.5 °C", desc: "Ghi nhận vào mùa đông", trend: "up" }
    ],
    chartType: "line",
    chartData: [
      { date: "12-06", "Hà Nội": 20.1, "Huế": 21.8, "Hồ Chí Minh": 25.8 },
      { date: "01-15", "Hà Nội": 16.5, "Huế": 19.2, "Hồ Chí Minh": 27.2 },
      { date: "02-15", "Hà Nội": 18.2, "Huế": 22.0, "Hồ Chí Minh": 28.5 },
      { date: "03-15", "Hà Nội": 22.4, "Huế": 24.8, "Hồ Chí Minh": 30.1 },
      { date: "04-15", "Hà Nội": 26.8, "Huế": 28.2, "Hồ Chí Minh": 31.4 },
      { date: "05-15", "Hà Nội": 28.5, "Huế": 29.8, "Hồ Chí Minh": 31.2 },
      { date: "06-04", "Hà Nội": 28.75, "Huế": 30.12, "Hồ Chí Minh": 28.50 }
    ]
  },
  {
    id: 3,
    title: "10 tỉnh nóng nhất",
    question: "Tìm các tỉnh có nhiệt độ trung bình cao nhất trong tháng 5/2026 và lượng mưa trung bình tương ứng.",
    explanation: "Trích xuất dữ liệu của tháng 5/2026, tính toán giá trị trung bình của nhiệt độ (temperature_2m_mean) và lượng mưa (precipitation_sum) cho từng tỉnh thành, sắp xếp giảm dần theo nhiệt độ và lấy ra top 10 tỉnh đứng đầu.",
    code: `import pandas as pd

# 1. Đọc dữ liệu
df = pd.read_csv("data/raw/vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv")
df['date'] = pd.to_datetime(df['date'])

# 2. Trích xuất tháng và năm
df['month'] = df['date'].dt.month
df['year'] = df['date'].dt.year

# 3. Lọc dữ liệu tháng 5 năm 2026
df_may = df[(df['month'] == 5) & (df['year'] == 2026)]

# 4. Tính toán trung bình nhiệt độ và lượng mưa theo tỉnh thành
prov_stats = df_may.groupby('province').agg({
    'temperature_2m_mean': 'mean',
    'precipitation_sum': 'mean'
}).reset_index()

# Đoạn code này gom nhóm theo tỉnh (province) và sử dụng hàm agg()
# để tính toán đồng thời trung bình nhiệt độ và lượng mưa.

# 5. Sắp xếp nhiệt độ giảm dần và lấy Top 10
top_10_hot = prov_stats.sort_values(by='temperature_2m_mean', ascending=False).head(10)

print("=== TOP 10 TỈNH NÓNG NHẤT THÁNG 5/2026 ===")
print(top_10_hot.to_string(index=False))
`,
    logs: [
      "[2026-06-24 12:54:20] Khởi động môi trường Python...",
      "[2026-06-24 12:54:21] Load dữ liệu và chuyển đổi cột 'date'...",
      "[2026-06-24 12:54:21] Lọc thành công 1,054 bản ghi thuộc tháng 05/2026.",
      "[2026-06-24 12:54:22] Tính toán GroupBy cho 34 tỉnh thành Việt Nam...",
      "[2026-06-24 12:54:22] === TOP 10 TỈNH NÓNG NHẤT THÁNG 5/2026 ===",
      "Tỉnh thành    Nhiệt độ TB (°C)    Lượng mưa TB (mm)",
      "Tây Ninh                 32.48                 0.04",
      "An Giang                 31.85                 2.12",
      "Đồng Tháp                31.72                 1.85",
      "Hồ Chí Minh              31.24                 3.50",
      "Cần Thơ                  31.10                 4.15",
      "Vĩnh Long                30.98                 3.88",
      "Cà Mau                   30.82                 5.24",
      "Bình Dương               30.65                 1.50",
      "Khánh Hòa                30.42                 0.95",
      "Huế                      29.80                 2.80",
      "[2026-06-24 12:54:22] Thực thi mã lệnh thành công (exit code 0)."
    ],
    kpis: [
      { label: "Nhiệt Độ TB Cao Nhất", value: "32.48 °C", desc: "Tây Ninh", trend: "up" },
      { label: "Lượng Mưa Tương Ứng", value: "0.04 mm", desc: "Lượng mưa cực thấp tại Tây Ninh", trend: "down" },
      { label: "Độ Ẩm TB Khu Vực Hot", value: "68.5 %", desc: "Không khí oi bức khô nóng", trend: "neutral" }
    ],
    chartType: "scatter",
    chartData: [
      { name: "Tây Ninh", temp: 32.48, rain: 0.04 },
      { name: "An Giang", temp: 31.85, rain: 2.12 },
      { name: "Đồng Tháp", temp: 31.72, rain: 1.85 },
      { name: "Hồ Chí Minh", temp: 31.24, rain: 3.50 },
      { name: "Cần Thơ", temp: 31.10, rain: 4.15 },
      { name: "Vĩnh Long", temp: 30.98, rain: 3.88 },
      { name: "Cà Mau", temp: 30.82, rain: 5.24 },
      { name: "Bình Dương", temp: 30.65, rain: 1.50 },
      { name: "Khánh Hòa", temp: 30.42, rain: 0.95 },
      { name: "Huế", temp: 29.80, rain: 2.80 }
    ]
  }
];

export const mockDashboardKPIs = [
  { label: "Tập dữ liệu đã nạp", value: "1 tập tin", desc: "vietnam_kttv_34tinh.csv", icon: "Database", change: "2.38 MB", trend: "success" },
  { label: "Tổng số bản ghi", value: "6,156 dòng", desc: "36 biến thời tiết địa lý", icon: "Rows", change: "100% Việt Nam", trend: "success" },
  { label: "Đã phê duyệt & chạy", value: "48 lượt", desc: "Thực thi python cục bộ", icon: "CheckCircle", change: "+12 tuần này", trend: "success" },
  { label: "AI gợi ý phân tích", value: "112 câu hỏi", desc: "Độ chính xác cao", icon: "Cpu", change: "Gemini 1.5 Flash", trend: "info" }
];

export const mockRecentActivities = [
  { id: 1, type: "upload", user: "Phạm Minh", target: "vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv", time: "10 phút trước", status: "success" },
  { id: 2, type: "execute", user: "Lê Hà", target: "Truy vấn: Xu hướng nhiệt độ 3 miền", time: "2 giờ trước", status: "success" },
  { id: 3, type: "approve", user: "Phạm Minh", target: "Script #12 - So sánh lượng mưa các vùng", time: "3 giờ trước", status: "success" },
  { id: 4, type: "reject", user: "Nguyễn Nam", target: "Script #11 - Phân tích bức xạ mặt trời", time: "Hôm qua", status: "error" },
  { id: 5, type: "edit", user: "Trần Hùng", target: "Script #10 - Sửa điều kiện lọc outlier", time: "2 ngày trước", status: "info" }
];
