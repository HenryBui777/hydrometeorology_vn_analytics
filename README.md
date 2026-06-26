# 🌏 Hydrometeorology VN Analytics — Nền tảng Phân tích KTTV Việt Nam

Nền tảng tích hợp dữ liệu khí tượng thủy văn 34 tỉnh thành Việt Nam (2026) với giao diện React + Tailwind CSS hiện đại và trợ lý AI Human-in-the-Loop.

---

## 📁 Cấu Trúc Thư Mục

```
hydrometeorology_vn_analytics/
├── frontend/               # Giao diện Web React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/     # Các component giao diện
│   │   ├── App.jsx         # Component gốc + router tab
│   │   ├── mockData.js     # Dữ liệu mẫu cho demo
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── vite.config.js
├── src/                    # Scripts Python xử lý dữ liệu
│   ├── 01_crawl.py         # Thu thập dữ liệu từ Open-Meteo API
│   ├── 02_preprocess.py    # Tiền xử lý và làm sạch dữ liệu
│   └── backend/routers/    # FastAPI backend (phát triển sau)
├── data/
│   └── raw/
│       ├── openmeteo_2026/ # Dữ liệu thô từng tỉnh (CSV)
│       └── vietnam_kttv_34tinh_*.csv  # Dữ liệu gộp toàn quốc
├── .gitignore
└── README.md
```

---

## 🚀 Khởi Chạy Frontend

```powershell
cd frontend
npm install      # Chỉ cần chạy lần đầu
npm run dev      # Khởi chạy dev server tại http://localhost:5173
```

---

## 🐍 Chạy Scripts Python

```powershell
# Thu thập dữ liệu (cần kết nối internet)
python src/01_crawl.py

# Tiền xử lý dữ liệu
python src/02_preprocess.py
```

---

## 🗺️ Thiết kế giao diện — Hydrometeorology VN Dashboard

---

### 🏠 Trang 1: Tổng quan (Overview)

```
┌─────────────────────────────────────────────────────────────┐
│  🌏 KTTV Việt Nam 2026              [Filter: Vùng | Mùa]   │
├──────┬──────┬──────┬──────┬──────┬──────┬──────────────────┤
│ KPI  │ KPI  │ KPI  │ KPI  │ KPI  │ KPI  │  (6 thẻ số liệu) │
│ Tmp  │ Mưa  │ Ẩm   │ Gió  │ Nắng │ ET₀  │                  │
├──────┴──────┴──────┴──────┴──────┴──────┤                  │
│                                         │                  │
│    🗺️  Bản đồ Việt Nam (Leaflet)        │  Top 5 tỉnh      │
│    Bubble map tô màu theo biến chọn     │  nóng nhất /     │
│    Hover → tooltip chi tiết tỉnh        │  mưa nhiều nhất  │
│                                         │                  │
└─────────────────────────────────────────┴──────────────────┘
```

- 6 KPI cards: Nhiệt độ TB | Lượng mưa TB | Độ ẩm | Gió max | Giờ nắng | Bốc hơi ET₀
- Bản đồ bubble: mỗi tỉnh = 1 vòng tròn, kích thước + màu theo biến đang chọn
- Hover → tooltip: tên tỉnh, vùng, giá trị
- Ranking panel: Top 5 nóng / lạnh / mưa nhiều / mưa ít / gió mạnh / nắng nhiều

---

### 📈 Trang 2: Xu hướng thời gian (Time Series)

```
┌─────────────────────────────────────────────────────────────┐
│  [Chọn tỉnh ×]  [Chọn biến ▼]  [Từ ngày — Đến ngày]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   📉 Multi-line chart: nhiều tỉnh trên cùng biến           │
│   (smooth curves, hover tooltip, legend click toggle)       │
│                                                             │
├──────────────────────────┬──────────────────────────────────┤
│  Area chart: lượng mưa   │  Bar chart: số giờ nắng / ngày  │
│  theo tuần               │  theo tuần                       │
└──────────────────────────┴──────────────────────────────────┘
```

- Bộ lọc: chọn nhiều tỉnh, 1 biến, khoảng ngày
- Multi-line: mỗi tỉnh 1 màu, bật/tắt từng đường qua legend
- Area chart: lượng mưa theo tuần
- Bar chart: số giờ nắng theo tuần

---

### 🗺️ Trang 3: So sánh (Comparison)

```
┌─────────────────────────────────────────────────────────────┐
│  Tab: [So sánh tỉnh] [So sánh vùng] [So sánh mùa]         │
├─────────────────────────────────────────────────────────────┤
│  [Chọn biến ▼]  [Sắp xếp: Cao → Thấp ▼]                   │
│                                                             │
│  Horizontal bar chart — tất cả 34 tỉnh                     │
│  Có màu theo vùng, click để xem chi tiết                   │
│                                                             │
├──────────────────────┬──────────────────────────────────────┤
│  Radar chart:        │  Grouped bar: so sánh 7 vùng        │
│  so sánh 2 tỉnh      │  trên 4 biến chính                  │
│  tùy chọn            │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

- Tab "So sánh tỉnh": horizontal bar 34 tỉnh, màu theo vùng, sortable
- Tab "So sánh vùng": grouped bar 7 vùng × 4 biến
- Tab "So sánh mùa": grouped bar theo Xuân/Hè/Thu/Đông
- Radar chart: chọn 2 tỉnh bất kỳ → so sánh song song 6 chiều

---

### 🔥 Trang 4: Tương quan & Phân phối (Analysis)

```
┌──────────────────────────────┬──────────────────────────────┐
│  Heatmap tương quan          │  Scatter plot                │
│  (ma trận Pearson)           │  [Trục X ▼] vs [Trục Y ▼]  │
│  Click ô → scatter plot      │  tô màu theo vùng            │
│  tương ứng hiện ra bên phải  │                              │
├──────────────────────────────┴──────────────────────────────┤
│  Box plot: phân phối biến theo mùa hoặc vùng                │
│  [Chọn biến ▼]  [Group by: Mùa | Vùng | Tỉnh ▼]           │
└─────────────────────────────────────────────────────────────┘
```

- Heatmap 12×12: màu xanh → đỏ theo Pearson (-1 đến +1)
- Click ô heatmap → scatter plot tự động cập nhật bên phải
- Scatter: chọn trục X/Y thủ công, tô màu theo vùng
- Box plot: Q1, median, Q3, whiskers, outliers — group theo mùa/vùng/tỉnh

---

### 📋 Trang 5: Bảng dữ liệu (Data Table)

```
┌─────────────────────────────────────────────────────────────┐
│  [Tỉnh ▼] [Vùng ▼] [Mùa ▼] [Từ — Đến] [🔍 Tìm] [⬇ CSV]  │
├─────────────────────────────────────────────────────────────┤
│  Bảng dữ liệu paginated, sortable, có highlight outlier     │
│  Cột: province | date | temp | rain | humidity | wind...    │
│  Click hàng → popup chi tiết 1 ngày của 1 tỉnh             │
└─────────────────────────────────────────────────────────────┘
```

- Filter đa điều kiện: tỉnh, vùng, mùa, khoảng ngày, tìm kiếm text
- Sortable theo bất kỳ cột nào (click header)
- Paginate: 50 dòng / trang
- Highlight ô outlier (ngoài 3σ) bằng màu cam nhạt
- Click hàng → modal popup hiển thị đầy đủ tất cả biến ngày đó
- Nút Export CSV: tải về dữ liệu đang filter
