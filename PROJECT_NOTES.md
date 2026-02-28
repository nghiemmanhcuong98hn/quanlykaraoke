# Dự án: Hệ thống Quản lý Phòng (Room Management System)

Ghi chú tổng hợp về tính năng, logic cốt lõi và cấu trúc dự án.

## 1. Tổng quan dự án
Ứng dụng được xây dựng bằng **Electron**, sử dụng **Vanilla chuyên sâu (HTML/CSS/JS)** ở Frontend và **MongoDB Atlas (Mongoose)** ở Backend.

## 2. Tính năng chính
- **Màn hình Vào/Ra (Check-in/Out):**
    - Xem danh sách phòng và trạng thái thời gian thực.
    - Check-in: Bắt đầu phiên sử dụng mới (lưu vào database).
    - Check-out: Kết thúc phiên, tính tổng thời gian và tiền.
    - Chỉnh sửa giá trực tiếp cho từng phòng với cơ chế debounce.
- **Màn hình Quản lý (Admin Panel):**
    - **Quản lý Phòng:** CRUD (Thêm/Sửa/Xóa) phòng, gán loại phòng.
    - **Quản lý Loại phòng:** CRUD loại phòng và giá mặc định.
    - **Quản lý Giá:** Chức năng áp dụng giá theo loại phòng hoặc giá chung toàn hệ thống.
    - **Thống kê:** Doanh thu Today/Month/Total và bảng xếp hạng doanh thu.

## 3. Kiến trúc Dữ liệu & Database

### Môi trường
- Sử dụng file `.env` để quản lý `MONGODB_URI`.
- Thư viện: `mongoose`, `dotenv`.

### Schemas (MongoDB)
- **RoomType:**
    - `name`: Tên loại (VIP, Thường...).
    - `defaultPrice`: Giá mặc định/giờ.
- **Room:**
    - `name`: Tên phòng.
    - `pricePerHour`: Giá thực tế đang áp dụng.
    - `roomTypeId`: Tham chiếu tới `RoomType`.
    - `records`: Mảng các lượt sử dụng (`checkIn`, `checkOut`).

## 4. Logic & Luồng dữ liệu
- **Giao diện (Renderer):** Gọi các hàm `ipcRenderer.invoke` (thông qua `window.electronAPI`) để đọc/ghi dữ liệu.
- **Xử lý (Main):** Nhận yêu cầu qua IPC, thực hiện truy vấn MongoDB bằng Mongoose, sau đó chuyển đổi kết quả thành **Plain JavaScript Object** (`.toObject()`) trước khi gửi lại Renderer.
- **Thời gian thực:** Renderer giữ một mảng `rooms` nội bộ để render nhanh, định kỳ cập nhật hoặc render lại sau mỗi Action thành công.

## 5. Lưu ý Kỹ thuật
- **IPC Cloning:** Luôn phải biến Mongoose Document thành Plain Object vì Electron IPC không thể clone Document gốc có chứa hàm.
- **Đầu vào gõ phím:** Đã fix lỗi không gõ được trong Electron Windows bằng `-webkit-user-select: text`.
- **Đồng bộ hóa:** Dữ liệu được lưu trữ đám mây nên có thể truy cập từ nhiều máy nếu cấu hình chung Database.
