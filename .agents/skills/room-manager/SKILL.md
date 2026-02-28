---
name: Room Manager
description: Kiến thức và kỹ năng để phát triển ứng dụng Quản lý Phòng (Electron & MongoDB)
---

# Kỹ năng Quản lý Dự án Room Manager

Dành cho AI Agent tham gia phát triển dự án Quản lý Phòng.

## 1. Cấu trúc Dự án (Current Architecture)
Dự án sử dụng mô hình **3-layer (MvC Pattern)** trong Electron:
- **`src/main/main.js` & `src/main/db.js` (Backend):** Kết nối MongoDB Atlas (Mongoose), xử lý IPC handlers và logic Database.
- **`src/preload/preload.js` (Bridge):** Expose các kênh IPC an toàn cho Renderer (`db:get-data`, `db:save-room`, v.v.).
- **`src/renderer/scripts/renderer.js` (Frontend):** Xử lý UI, bind sự kiện, gọi IPC và render dữ liệu trả về.
- **`src/renderer/styles/index.css`:** Chứa Design System và toàn bộ giao diện App.

## 2. Quy tắc Phát triển (Core Rules)

### Database & State
- **MongoDB Atlas:** Toàn bộ dữ liệu được lưu trữ đám mây. Luôn dùng `.lean()` hoặc `.toObject()` khi trả dữ liệu từ Main về Renderer để tránh lỗi "An object could not be cloned".
- **Schema chính:**
    - `Room`: `name`, `pricePerHour`, `roomTypeId`, `records` (array của `{checkIn, checkOut}`).
    - `RoomType`: `name`, `defaultPrice`.
- **Environment:** URL MongoDB nằm trong file `.env` (key: `MONGODB_URI`).

### Quy trình Xử lý (Development Flow)
- **Adding/Editing:** Thực thi qua `ipcMain.handle`. Renderer gọi `await window.electronAPI.invoke('db:save-room', data)`.
- **Re-rendering:** Sau mỗi Action thành công (`addRoom`, `checkIn`, `checkOut`), Mapper (Renderer) gọi `await loadData()` để lấy trạng thái mới nhất từ MongoDB và vẽ lại UI.
- **Real-time:** `setInterval` 1 giây ở Renderer để cập nhật đồng hồ cho các phòng đang "occupied" (giá trị tính toán từ `checkIn`).

### Logic Nghiệp vụ (Business Rules)
- **Check-in:** Không cho phép nếu phòng đã có record chưa có `checkOut`.
- **Check-out:** Cập nhật `checkOut` hiện tại vào record đang mở. Tính tiền làm tròn lên theo đơn vị giờ.
- **Xóa:** Khi xóa một `RoomType`, phải cập nhật tất cả `Room` có loại đó về `roomTypeId = null` để tránh lỗi tham chiếu.

## 3. Các hàm Helper Quan trọng
- `formatMoney(amount)`: Trả về chuỗi `10.000₫`.
- `formatDuration(in, out)`: Trả về chuỗi `2h 15m 30s`.
- `calculateCost(in, out, price)`: Trả về số tiền dựa trên quy tắc tính giờ.
- `showToast(msg, type)`: Hiển thị thông báo (success, warning, danger, info).

## 4. Ghi chú Bảo trì
- Kiểm tra kết nối MongoDB Atlas trong `main.js` qua `connectDB()`.
- Lỗi gõ phím trên Windows Electron được xử lý qua CSS `-webkit-user-select: text` cho các input.
