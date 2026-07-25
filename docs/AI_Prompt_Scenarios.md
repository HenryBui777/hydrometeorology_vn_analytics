# Bộ 15 Câu Hỏi Phân Tích Dành Cho Trợ Lý AI

Bộ 15 câu hỏi này được thiết kế riêng cho **Trợ lý AI phân tích Khí tượng Thủy văn**, đi từ cấp độ cơ bản (dùng 1 biến, câu hỏi rõ ràng) đến cấp độ nâng cao (ẩn ý bằng ngôn ngữ đời thường, cần 2-3 biểu đồ kết hợp để tìm insight). 

Tất cả các câu hỏi này AI (với Pandas và Recharts) hoàn toàn có thể hiểu, lọc dữ liệu và vẽ ra được.

## 🟢 Mức độ 1: Dễ (Đơn biến, 1 biểu đồ, câu hỏi tường minh)
*Đặc điểm: Chỉ hỏi về 1-2 biến số, chỉ rõ đối tượng, AI chỉ cần gom nhóm (groupby) hoặc lọc (filter) đơn giản và vẽ 1 biểu đồ (Cột/Đường).*

1. **"Hãy vẽ biểu đồ cột thể hiện Top 5 tỉnh thành có nhiệt độ trung bình cao nhất."** 
   *(Biểu đồ: Bar Chart - Lọc top 5)*
2. **"Vẽ biểu đồ đường xem diễn biến nhiệt độ của Thủ đô Hà Nội qua 12 tháng như thế nào."**
   *(Biểu đồ: Line Chart - Lọc theo tỉnh = Hà Nội, trục x = tháng)*
3. **"Cho tôi xem tổng lượng mưa trung bình chia theo 4 mùa trong năm."**
   *(Biểu đồ: Bar / Pie Chart - Groupby theo cột Season)*
4. **"So sánh số giờ nắng trung bình giữa 3 vùng: Miền Bắc, Miền Trung và Miền Nam."**
   *(Biểu đồ: Bar Chart - Groupby theo cột Region)*
5. **"Liệt kê 10 tỉnh có lượng mưa thấp nhất, vẽ biểu đồ để tôi xem nơi nào khô hạn nhất."**
   *(Biểu đồ: Bar Chart nằm ngang - Lọc bottom 10 lượng mưa)*

---

## 🟡 Mức độ 2: Trung bình (Đa biến, 1-2 biểu đồ, kết hợp điều kiện)
*Đặc điểm: Cần đối chiếu 2-3 biến số cùng lúc, cần tạo biểu đồ kết hợp (Composed) hoặc Radar, Scatter, có kết hợp bộ lọc (filter).*

6. **"Vẽ biểu đồ kép (đường và cột) thể hiện đồng thời nhiệt độ và lượng mưa của TP.HCM theo từng tháng."**
   *(Biểu đồ: Composed Chart - Cột = Lượng mưa, Đường = Nhiệt độ, 2 trục Y)*
7. **"So sánh mức độ chênh lệch giữa nhiệt độ cao nhất (Max) và thấp nhất (Min) của các tỉnh vùng Tây Nguyên."**
   *(Biểu đồ: Area Chart / Error Bar / 2 Line - Lọc region = Tây Nguyên, tính biên độ nhiệt)*
8. **"Nhiệt độ và độ ẩm ở khu vực miền Bắc có tỷ lệ nghịch với nhau không? Hãy vẽ biểu đồ phân tán (scatter plot) để kiểm chứng."**
   *(Biểu đồ: Scatter Plot - Trục X: Nhiệt độ, Trục Y: Độ ẩm, Lọc miền Bắc)*
9. **"3 tỉnh ven biển (Đà Nẵng, Nha Trang, Vũng Tàu) có đặc điểm gió và lượng bốc hơi thế nào? Dùng đồ thị Radar để so sánh 3 nơi này."**
   *(Biểu đồ: Radar Chart - Trục: Gió, Bốc hơi, Nhiệt, Mưa; Polygon: 3 tỉnh)*
10. **"Mùa hè ở đâu khắc nghiệt hơn? So sánh nhiệt độ và số giờ nắng của Hà Nội và TP.HCM riêng trong mùa Hè."**
   *(Biểu đồ: Grouped Bar Chart - So sánh 2 biến số của 2 tỉnh bị giới hạn bởi Season = Hè)*

---

## 🔴 Mức độ 3: Nâng cao (Nhiều biểu đồ, ngôn ngữ đời thường, phân tích Insight)
*Đặc điểm: Người dùng nói theo ngôn ngữ tự nhiên, không chỉ đích danh hàm hay biểu đồ. AI phải tự hiểu logic nghiệp vụ (domain knowledge), tự suy ra cần dùng biến nào, tính toán tỷ lệ, và vẽ nhiều biểu đồ ghép lại để có câu trả lời trọn vẹn.*

11. **"Cuối năm nay (tháng 12) đi du lịch Sapa (Lào Cai) hay Đà Lạt (Lâm Đồng) thì dễ chịu hơn?"**
    * *Yêu cầu ngầm:* AI phải tự biết lấy dữ liệu tháng 12 của 2 tỉnh này, so sánh đa chiều.
    * *Biểu đồ:* 1 Radar Chart (tổng quan Mưa, Nắng, Nhiệt độ, Độ ẩm) + 1 Bar Chart (so sánh chi tiết chênh lệch nhiệt độ Max/Min để xem nơi nào lạnh buốt hơn).
12. **"Tui tính mở trang trại kết hợp điện gió và điện mặt trời ở Nam Trung Bộ. Hãy tìm ra 3 tỉnh có tiềm năng lớn nhất và vẽ biểu đồ chứng minh."**
    * *Yêu cầu ngầm:* AI phải tính điểm tổng hợp hoặc tìm nơi có (Gió cao + Giờ nắng cao) ở vùng Nam Trung Bộ.
    * *Biểu đồ:* 1 Scatter Plot (Trục X = Gió, Trục Y = Nắng) để tìm cụm các tỉnh góc trên bên phải + 1 Bar chart xuất ra Top 3.
13. **"Nắng nhiều thì nước có bốc hơi nhanh hơn không? Quy luật này đúng nhất ở vùng nào và sai ở vùng nào?"**
    * *Yêu cầu ngầm:* Tìm hệ số tương quan giữa (sunshine) và (et0) theo từng vùng.
    * *Biểu đồ:* Scatter Plot chung (Nắng vs Bốc hơi) và 1 Bar Chart thể hiện tỷ lệ Bốc hơi/Giờ nắng giữa các Vùng.
14. **"Nơi nào ở Việt Nam có thời tiết 'ẩm ương' và thất thường nhất? (Gợi ý: Tìm nơi có biên độ nhiệt ngày/đêm lớn nhất và lượng mưa biến động mạnh nhất qua các tháng)."**
    * *Yêu cầu ngầm:* AI phải tính Phương sai/Độ lệch chuẩn (Standard Deviation) của lượng mưa và `TempMax - TempMin` trung bình.
    * *Biểu đồ:* Scatter Plot (Trục X = Biên độ nhiệt, Trục Y = Độ lệch chuẩn lượng mưa) để tìm điểm "outlier" thất thường nhất.
15. **"Nhìn tổng thể cả nước vào Mùa Thu, lượng mây che phủ ảnh hưởng mạnh nhất tới nhiệt độ hay tới số giờ nắng? Trực quan hóa giúp tôi."**
    * *Yêu cầu ngầm:* Đánh giá tác động của `Cloud` tới `Temp` và `Sunshine` trong Mùa Thu.
    * *Biểu đồ:* 2 Scatter Plot đặt cạnh nhau: Mây vs Nhiệt độ, và Mây vs Giờ nắng (hoặc 1 Composed Chart so sánh 2 đường trendline).
