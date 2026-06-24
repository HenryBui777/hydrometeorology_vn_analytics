# 🎨 Thiết kế giao diện — Hydrometeorology VN Dashboard

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
