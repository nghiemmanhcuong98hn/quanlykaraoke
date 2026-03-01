## 1. Tổng quan dự án

Ứng dụng được xây dựng bằng **Electron**, sử dụng **Vanilla chuyên sâu (HTML/CSS/JS)** ở Frontend và **MongoDB Atlas (Mongoose)** ở Backend.

## 2. Tính năng chính

- **Màn hình Vào/Ra (Check-in/Out):**
  - Xem danh sách phòng và trạng thái thời gian thực.
  - Check-in: Bắt đầu phiên sử dụng mới (lưu vào database).
  - Check-out: Kết thúc phiên, tính tổng thời gian và tiền.
  - Chỉnh sửa giá trực tiếp cho từng phòng với cơ chế debounce.
  - Thêm sản phẩm/dịch vụ (bia, đồ ăn...) vào từng lượt sử dụng, tự động tính vào tổng tiền.
  - **Chi tiết Record:** Nhấn vào dòng record để mở modal chi tiết:
    - Chỉnh sửa giờ vào/giờ ra (date + time picker riêng biệt).
    - Hiển thị riêng biệt: tiền giờ, tiền sản phẩm, tổng cộng.
    - Danh sách sản phẩm đã dùng.
    - Mở lại record (khi nhấn nhầm nút Ra) — tiếp tục tính giờ.
    - Dừng tính tiền (check-out) trực tiếp từ modal.
    - Xóa lượt.
  - **Sửa số lượng sản phẩm:** Tại modal sản phẩm, số lượng có thể sửa trực tiếp inline.
- **Màn hình Quản lý (Admin Panel):**
  - **Quản lý Phòng:** CRUD (Thêm/Sửa/Xóa) phòng, gán loại phòng.
  - **Quản lý Loại phòng:** CRUD loại phòng và giá mặc định.
  - **Quản lý Sản phẩm:** CRUD sản phẩm/dịch vụ (tên, giá, tồn kho). Hỗ trợ nhập hàng và xem lịch sử nhập.
  - **Quản lý Giá:** Chức năng áp dụng giá theo loại phòng hoặc giá chung toàn hệ thống.
  - **Thống kê:** Doanh thu Today/Month/Total, bảng xếp hạng doanh thu và **chi tiết lượt sử dụng theo phòng**.
- **Chủ đề (Dark/Light Mode):** Chuyển đổi linh hoạt giữa giao diện tối và sáng, tự động lưu lại lựa chọn của người dùng.
