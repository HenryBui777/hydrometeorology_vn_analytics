# Nhật ký huấn luyện Trợ lý AI & hướng dẫn chạy đồ án

## 1. Mục đích của Trợ lý AI

Trợ lý AI phân tích dữ liệu khí tượng thủy văn Việt Nam bằng dữ liệu CSV đã làm sạch tại:

```text
data/processed/cleaned_data.csv
```

AI nhận câu hỏi tiếng Việt tự nhiên, xác định địa điểm, thời gian, biến khí tượng và mục tiêu phân tích. Sau đó AI sinh mã Pandas, người dùng phê duyệt mã và hệ thống thực thi để trả về biểu đồ cùng phần diễn giải.

Nguyên tắc cốt lõi: AI **không được tự thêm tỉnh, vùng hoặc chỉ số mà câu hỏi không đề cập**.

---

## 2. Các biến dữ liệu AI có thể sử dụng

| Nhóm | Trường dữ liệu | Tên hiển thị |
|---|---|---|
| Nhiệt độ | `temp_mean`, `temp_max`, `temp_min` | Nhiệt độ trung bình/cao nhất/thấp nhất (°C) |
| Nhiệt độ cảm nhận | `app_temp_mean`, `app_temp_max`, `app_temp_min` | Nhiệt độ cảm nhận (°C) |
| Mưa | `precipitation_sum`, `rain_sum`, `showers_sum`, `precipitation_hours` | Lượng mưa, mưa rào, số giờ mưa |
| Độ ẩm và nắng | `humidity_mean`, `sunshine_hours`, `daylight_hours` | Độ ẩm (%), giờ nắng, giờ ban ngày |
| Gió | `wind_speed_max`, `wind_gusts_max`, `wind_direction_10m_dominant` | Tốc độ gió, gió giật, hướng gió |
| Khí quyển | `pressure`, `cloud_cover`, `dew_point`, `shortwave_radiation_sum` | Áp suất, mây che phủ, điểm sương, bức xạ |
| Thủy văn | `et0` | Lượng bốc hơi tham chiếu (mm) |
| Không gian/thời gian | `province`, `region`, `date`, `month`, `week`, `season` | Tỉnh/thành, vùng, ngày, tháng, tuần, mùa |

Mọi nhãn trên biểu đồ, tooltip và trục tọa độ được Việt hóa; số hiển thị được làm tròn tối đa 2 chữ số thập phân.

---

## 3. Quy trình AI xử lý câu hỏi

AI thực hiện âm thầm các bước sau:

1. Xác định mục tiêu: xu hướng, so sánh, cơ cấu, tương quan, phân bố, cảnh báo hoặc địa lý.
2. Nhận diện biến khí tượng được hỏi, địa điểm, vùng, tháng/mùa và số lượng đối tượng.
3. Lọc dữ liệu đúng phạm vi. Nếu câu hỏi nêu vùng khí hậu, AI chỉ lấy các tỉnh nằm trong vùng đó và có trong CSV.
4. Chọn một dạng biểu đồ tối ưu, không dùng biểu đồ 3D.
5. Sinh mã Pandas, thực thi sau khi phê duyệt, rồi hiển thị biểu đồ, bảng dữ liệu và insight.

Nếu sau khi lọc chỉ còn một giá trị, hoặc câu hỏi không có dữ liệu phù hợp, AI không vẽ biểu đồ để tránh trực quan hóa sai.

---

## 4. Ma trận chọn biểu đồ đã huấn luyện

| Mục tiêu/câu hỏi | Biểu đồ ưu tiên |
|---|---|
| Nhiệt độ, độ ẩm, áp suất theo thời gian | Biểu đồ đường |
| So sánh xu hướng 2–5 tỉnh/vùng theo thời gian | Biểu đồ nhiều đường |
| Nhiệt độ và lượng mưa cùng chuỗi thời gian | Biểu đồ kết hợp 2 trục Y: cột mưa + đường nhiệt độ |
| Lượng mưa tích lũy hoặc quy mô thay đổi theo thời gian | Biểu đồ miền |
| Thành phần theo thời gian | Biểu đồ miền chồng |
| Top/bottom hoặc hơn 7 tỉnh có tên dài | Biểu đồ thanh ngang, sắp xếp theo giá trị |
| Ít hơn 7 hạng mục | Biểu đồ cột đứng |
| So sánh 2–3 chỉ số trên cùng nhóm | Biểu đồ cột nhóm |
| So sánh 1–2 địa điểm theo 4–8 chỉ số | Radar |
| Tương quan 2 biến định lượng | Phân tán |
| Tương quan 3 biến | Bong bóng; kích thước biểu diễn biến thứ ba |
| Phân bố/tần suất một biến | Histogram |
| Hướng gió hoặc tốc độ gió | Hoa gió (dạng cực/Radar) |
| Tỷ lệ thành phần thật sự, 2–5 nhóm và tổng 100% | Donut |

### Quy tắc loại trừ

- Không dùng Pie/Donut cho số liệu không phải tỷ lệ thành phần hoặc có trên 5 nhóm; tự chuyển sang biểu đồ thanh ngang.
- Nếu một nhóm trong Donut nhỏ hơn 3%, AI gom vào **Khác**.
- Không tạo biểu đồ nến, phễu, Sankey hoặc waterfall khi CSV không có dữ liệu tài chính, quy trình hoặc luồng nguồn–đích.
- Không nhầm `giờ nắng` với `gió`: câu hỏi chỉ có giờ nắng chỉ hiển thị chỉ số giờ nắng.

---

## 5. Quy tắc địa lý và khí hậu

AI nhận diện 7 vùng trong CSV:

- Trung du miền núi Bắc Bộ
- Đồng bằng sông Hồng
- Bắc Trung Bộ
- Duyên hải Nam Trung Bộ
- Tây Nguyên
- Đông Nam Bộ
- Đồng bằng sông Cửu Long

AI cũng nhận diện các miền Bắc, Trung, Nam; Tây Bắc Bộ và Đông Bắc Bộ qua danh sách tỉnh. Khi người dùng hỏi một vùng, kết quả chỉ chứa các tỉnh thực sự có trong `cleaned_data.csv`.

Ví dụ: dữ liệu hiện tại có 3 tỉnh thuộc **Duyên hải Nam Trung Bộ** là Đà Nẵng, Quảng Ngãi và Khánh Hòa. AI không tự tạo dữ liệu cho các tỉnh khác nếu chúng chưa có trong CSV.

### Ví dụ câu hỏi

```text
So sánh số giờ nắng của các tỉnh Duyên hải Nam Trung Bộ.
Vẽ diễn biến nhiệt độ Hà Nội và TP.HCM theo tháng.
Nhiệt độ và độ ẩm miền Bắc có tương quan không?
Tìm nơi có thời tiết thất thường nhất Việt Nam.
Vẽ hoa gió của Tây Nguyên.
```

---

## 6. Quy tắc trình bày biểu đồ

- Mỗi biểu đồ có tiêu đề lấy từ câu hỏi hoặc tiêu đề phân tích.
- Trục danh mục hiển thị rõ: `Tỉnh/thành phố`, `Vùng khí hậu`, `Tháng`, `Tuần`, `Năm`, `Mùa` hoặc `Ngày quan trắc`.
- Trục số và tooltip làm tròn tối đa 2 số sau dấu phẩy.
- Đơn vị được thể hiện trong nhãn chỉ số khi có: °C, mm, %, hPa, km/h, giờ.
- Màu sắc ưu tiên theo ngữ nghĩa: nhiệt độ theo sắc ấm/lạnh, mưa theo xanh lam, gió theo sắc riêng; có chế độ hỗ trợ mù màu.
- Với biểu đồ phân tán, hover từng điểm hiển thị tên tỉnh/thành và các chỉ số liên quan.
- Với câu hỏi “nơi nào”, AI có thể bổ sung biểu đồ xếp hạng để chỉ rõ địa phương nổi bật.

---

## 7. Cách chạy đồ án trên Windows PowerShell

Mở **hai cửa sổ PowerShell**.

### Terminal 1: Backend

```powershell
cd D:\download\hydrometeorology_vn_analytics
python -m pip install -r requirements.txt
cd backend
python main.py
```

Khi xuất hiện dòng sau, Backend đã chạy:

```text
Uvicorn running on http://127.0.0.1:8000
```

Kiểm tra API tại:

```text
http://127.0.0.1:8000/docs
```

### Terminal 2: Frontend

```powershell
cd D:\download\hydrometeorology_vn_analytics\frontend
npm install
npm run dev
```

Mở địa chỉ Vite in ra trong terminal, thường là:

```text
http://localhost:5173
```

Sau lần cài đầu tiên, chỉ cần chạy:

```powershell
# Terminal Backend
cd D:\download\hydrometeorology_vn_analytics\backend
python main.py

# Terminal Frontend
cd D:\download\hydrometeorology_vn_analytics\frontend
npm run dev
```

### Cấu hình `.env`

Tạo `.env` ở thư mục gốc dự án và không đưa file này lên GitHub:

```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
```

### Khắc phục nhanh

| Hiện tượng | Cách xử lý |
|---|---|
| Trang trắng/chưa nhận thay đổi | Nhấn `Ctrl + F5` trên trình duyệt |
| AI báo `Failed to fetch` | Kiểm tra Backend đang chạy tại cổng `8000` |
| Cổng 5173 bận | Quay lại terminal Vite cũ, nhấn `Ctrl + C`, chạy lại `npm run dev` |
| AI vẫn trả kết quả cũ | Khởi động lại Backend, tải lại trang và tạo câu hỏi mới |
| Dừng server | Nhấn `Ctrl + C` tại terminal tương ứng |

---

## 8. Ghi chú bảo mật

- Không ghi trực tiếp Gemini API key hoặc Supabase key vào mã nguồn.
- Không commit `.env`, khóa API, tệp log nhạy cảm hoặc dữ liệu cá nhân lên GitHub.
- Nếu khóa đã từng bị chia sẻ công khai, hãy thu hồi/đổi khóa trên dịch vụ tương ứng.
