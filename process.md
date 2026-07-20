# Lộ Trình Phát Triển & Cải Tiến AI Analyst Portal

Tài liệu này mô tả luồng hoạt động (flow) hiện tại của hệ thống, đồng thời ghi nhận các hạn chế, lỗi (bugs) về UI/UX và vạch ra lộ trình các tính năng cần nâng cấp cho Frontend, Chatbot, và luồng phân tích dữ liệu.

---

## 1. Luồng Hệ Thống Hiện Tại (System Flow)

Hệ thống hoạt động theo mô hình Sandbox Execution kết hợp Generative AI:

1. **User Input:** Người dùng nhập yêu cầu phân tích bằng ngôn ngữ tự nhiên tại Frontend (React).
2. **AI Code Generation:** Prompt được gửi qua Backend (FastAPI) tới mô hình AI (Gemini). AI phân tích yêu cầu, đối chiếu với schema của bộ dữ liệu Khí hậu, và sinh ra mã nguồn **Python (Pandas)**.
3. **Draft & Approval:** Mã nguồn được trả về Frontend để người dùng duyệt (Code Review) hoặc chỉnh sửa thủ công nếu cần.
4. **Sandbox Execution:** Sau khi phê duyệt, code được gửi lại Backend để thực thi cục bộ qua hàm `exec()` trong một môi trường an toàn chứa sẵn `df` (DataFrame pandas).
5. **Data Extraction:** Kết quả tính toán được trích xuất thành định dạng JSON (`chart_data`) và loại biểu đồ (`chart_type`).
6. **Interactive Visualization:** Frontend nhận dữ liệu JSON và sử dụng **Recharts** để vẽ biểu đồ tương tác, đồng thời hiển thị bảng dữ liệu thô.

---

## 2. Các Hạn Chế Giao Diện & Trải Nghiệm (UI/UX Issues)

Dù đã có Portal cơ bản, giao diện hiện tại vẫn còn khá cứng và thiếu các tính năng của một sản phẩm "Premium":

> [!WARNING]
> Các tính năng trải nghiệm người dùng (UX) thiết yếu đang bị thiếu vắng, cần ưu tiên khắc phục trong các phiên bản tới.

*   **Chưa có Authentication:** Ứng dụng hiện đang mở hoàn toàn, thiếu hệ thống Đăng nhập/Đăng ký. Cần tích hợp **Google Login / OAuth2** để lưu trữ lịch sử cá nhân hóa cho từng user.
*   **Thiếu chế độ Dark/Light Mode:** Giao diện chưa có toggle chuyển đổi Sáng/Tối. Đặc biệt quan trọng với các ứng dụng Dashboard phân tích dữ liệu thường xuyên phải làm việc ban đêm.
*   **Chưa có chế độ Mù Màu (Color-blind mode):** Các bảng màu biểu đồ (Recharts) hiện tại có thể gây khó nhìn cho người mù màu. Cần thêm tùy chọn Color-blind friendly palettes.
*   **Font chữ chưa đồng bộ:** Cần quy hoạch lại Hệ thống Typography. Ưu tiên sử dụng các bộ font hiện đại, rõ ràng cho dữ liệu số như **Inter, Outfit, hoặc Roboto Mono** (cho phần code).
*   **Thiếu hiệu ứng thị giác (Visual & Micro-animations):** 
    *   Chưa có các icon thời tiết động (Animated Weather Icons).
    *   Thiếu hình nền động (Dynamic Backgrounds) thay đổi theo ngữ cảnh (ví dụ: nền mây/mưa nhẹ nếu truy vấn liên quan đến lượng mưa).

---

## 3. Cải Tiến Chatbot & Frontend

Để biến AI Analyst thành một công cụ mạnh mẽ hơn, hệ thống cần mở rộng năng lực xử lý ngoài Python:

> [!TIP]
> Việc mở rộng năng lực xử lý sẽ giúp hệ thống tiếp cận được nhiều đối tượng người dùng (từ Data Analyst đến Business User).

*   **Hỗ Trợ Truy Vấn SQL (SQL Querying):** 
    *   Cho phép người dùng chọn engine là `SQL` thay vì `Python`.
    *   Backend sẽ dùng DuckDB hoặc SQLite in-memory để parse DataFrame thành bảng và thực thi mã SQL do AI sinh ra.
*   **Memory & Context Aware:** Chatbot cần có khả năng nhớ ngữ cảnh của các câu hỏi trước đó để người dùng có thể "hỏi xoáy" hoặc yêu cầu "vẽ lại biểu đồ trên thành hình tròn".
*   **Xuất Báo Cáo PDF Toàn Diện (Comprehensive PDF Export):**
    *   Hỗ trợ xuất báo cáo định dạng PDF chất lượng cao.
    *   Áp dụng cho **tất cả các Tab** trên thanh điều hướng (Dashboard, Dataset, Settings...).
    *   Áp dụng cho **từng câu hỏi/truy vấn riêng lẻ** (bao gồm cả biểu đồ, bảng dữ liệu, và đoạn giải thích của AI).

---

## 4. Tính Năng Phân Tích Chuyên Sâu (The 4-Axis Insight)

**Đây là tính năng cốt lõi nhất cần phát triển:** Biểu đồ không tự nói lên tất cả. Sau khi Frontend vẽ xong biểu đồ bằng Recharts, hệ thống cần tự động kích hoạt một luồng phụ (Background Flow). Luồng này gửi dữ liệu `chart_data` (hoặc tóm tắt thống kê của nó) ngược lại cho AI để AI đóng vai trò một chuyên gia cố vấn và viết ra **Báo cáo phân tích 4 trục (4-Axis Analytics):**

> [!IMPORTANT]
> Báo cáo này sẽ được render ngay bên dưới biểu đồ, tạo ra một trải nghiệm "End-to-End" thực sự.

1.  **Phân tích Mô tả (Descriptive Analytics):** 
    *   *Chuyện gì đang xảy ra?*
    *   (VD: "Biểu đồ cho thấy lượng mưa tại Đà Nẵng cao gấp 3 lần TP.HCM vào tháng 10").
2.  **Phân tích Chẩn đoán (Diagnostic Analytics):** 
    *   *Tại sao nó lại xảy ra?*
    *   (VD: "Do ảnh hưởng của rãnh áp thấp và bão nhiệt đới thường đổ bộ miền Trung vào quý 4").
3.  **Phân tích Dự đoán (Predictive Analytics):** 
    *   *Chuyện gì sẽ xảy ra tiếp theo?*
    *   (VD: "Theo xu hướng này, lượng mưa sẽ giảm mạnh vào tháng 1 và bắt đầu mùa khô").
4.  **Phân tích Đề xuất (Prescriptive Analytics):** 
    *   *Chúng ta nên làm gì?*
    *   (VD: "Các đơn vị nông nghiệp cần chuẩn bị hệ thống trữ nước ngọt, trong khi các đội cứu hộ cần tăng cường trực ban vào tháng 10-11").

---
*Tài liệu này đóng vai trò là kim chỉ nam cho các bản cập nhật (Sprints) tiếp theo.*
