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
- **`src/renderer/scripts/utils/` (Utilities):** Chứa các hàm tiện ích dùng chung:
  - `helpers.js`: Format (time, date, duration, money), tính toán (cost, duration), kiểm tra (isToday, isThisMonth), escapeHtml, generateId.
  - `toast.js`: Hiển thị thông báo toast (success, warning, danger, info).
- **`src/renderer/styles/index.css`:** Chứa Design System và toàn bộ giao diện App.

## 2. Quy tắc Phát triển (Core Rules)

### Database & State

- **MongoDB Atlas:** Toàn bộ dữ liệu được lưu trữ đám mây. Luôn dùng `.lean()` hoặc `.toObject()` khi trả dữ liệu từ Main về Renderer để tránh lỗi "An object could not be cloned".
- **Schema chính:**
  - `Room`: `name`, `pricePerHour`, `roomTypeId`, `records` (array của `{checkIn, checkOut, items}`).
  - `RoomType`: `name`, `defaultPrice`.
  - `Item`: `name`, `price` — Sản phẩm/dịch vụ có thể thêm vào mỗi lượt sử dụng.
  - `RecordItem` (sub-schema trong Record): `itemId`, `name`, `price`, `quantity` — Lưu denormalized để bảo toàn dữ liệu lịch sử.
- **Environment:** URL MongoDB nằm trong file `.env` (key: `MONGODB_URI`).

### Quy trình Xử lý (Development Flow)

- **Adding/Editing:** Thực thi qua `ipcMain.handle`. Renderer gọi `await window.electronAPI.invoke('db:save-room', data)`.
- **Re-rendering:** Sau mỗi Action thành công (`addRoom`, `checkIn`, `checkOut`), Mapper (Renderer) gọi `await loadData()` để lấy trạng thái mới nhất từ MongoDB và vẽ lại UI.
- **Real-time:** `setInterval` 1 giây ở Renderer chỉ cập nhật **targeted cells** (duration, cost) cho các phòng đang "occupied" — KHÔNG rebuild toàn bộ bảng để tránh nhấp nháy UI. Dữ liệu live được lưu qua `data-*` attributes trên DOM.
- **UI Standard:** Toàn bộ modal phải sử dụng class `.modal--wide` (800px) để đảm bảo không gian hiển thị và tính đồng bộ. Thêm `document.querySelector('.modal').classList.add('modal--wide')` trước khi gọi `openModal()`.

### Logic Nghiệp vụ (Business Rules)

- **Check-in:** Không cho phép nếu phòng đã có record chưa có `checkOut`.
- **Check-out:** Cập nhật `checkOut` hiện tại vào record đang mở. Tính tiền làm tròn lên theo đơn vị giờ.
- **Mở lại record (Reopen):** Khi nhấn nhầm nút Ra, có thể mở lại record (set `checkOut = null`) để tiếp tục tính giờ. Validation: không cho mở lại nếu phòng đã có record khác đang active.
- **Dừng tính tiền:** Từ modal chi tiết record, có thể check-out trực tiếp mà không cần quay về màn hình chính.
- **Xóa:** Khi xóa một `RoomType`, phải cập nhật tất cả `Room` có loại đó về `roomTypeId = null` để tránh lỗi tham chiếu.
- **Sản phẩm (Items):** Mỗi record có thể gắn nhiều sản phẩm (bia, đồ ăn...). Tiền sản phẩm được cộng vào tổng tiền của record. Nếu thêm cùng 1 sản phẩm, số lượng sẽ được cộng dồn. Số lượng có thể sửa trực tiếp trong modal sản phẩm (debounce 300ms).

## 3. Các hàm Helper Quan trọng

Các helper nằm trong `src/renderer/scripts/utils/`:

- **`helpers.js`:** `generateId()`, `formatTime()`, `formatDate()`, `getDurationMs()`, `formatDuration()`, `formatDurationShort()`, `calculateCost()`, `formatMoney()`, `isToday()`, `isThisMonth()`, `escapeHtml()`, `calculateItemsCost()`, `calculateRecordTotal()`.
- **`toast.js`:** `showToast(msg, type)` — Hiển thị thông báo (success, warning, danger, info).

## 4. Ghi chú Bảo trì

- Kiểm tra kết nối MongoDB Atlas trong `main.js` qua `connectDB()`.
- Lỗi gõ phím trên Windows Electron được xử lý qua CSS `-webkit-user-select: text` cho các input.
- **Hot-reload chỉ áp dụng cho Renderer** (HTML/CSS/JS frontend). Thay đổi ở `main.js` hoặc `db.js` bắt buộc phải **tắt app & khởi động lại** (`npm run dev`) để có hiệu lực — nếu không sẽ gặp lỗi `No handler registered`.
- **Build & Đóng gói:** Xem hướng dẫn chi tiết tại [BUILD_GUIDE.md](file:///Users/nghiemmanhcuong/Documents/code/quanlykaraoke/BUILD_GUIDE.md). Lệnh chính: `npm run build:mac` (cho Mac) và `npm run build` (cho Windows).
- Khi build bản phân phối (`.exe`), cần chạy `npm run build` lại để cập nhật code mới.

## 5. Lịch sử Thay đổi (Chat Log)

### Session 2026-02-28

- **Đọc & hiểu dự án:** Đọc `PROJECT_NOTES.md` + `.agents/skills/room-manager/SKILL.md` để nắm kiến trúc, schema, quy tắc.
- **Tách Helper functions ra folder `utils/`:**
  - Tạo `src/renderer/scripts/utils/helpers.js` — chứa 12 hàm tiện ích thuần (format, calculate, check, escape...).
  - Tạo `src/renderer/scripts/utils/toast.js` — chứa `showToast()`.
  - Giữ lại 3 state helpers (`getSelectedRoom`, `isRoomOccupied`, `getRoomTypeName`) trong `renderer.js` vì phụ thuộc biến state.
  - Cập nhật `index.html` load `utils/*.js` trước `renderer.js`.
- **Thêm tính năng Quản lý Sản phẩm (Items):**
  - **Schema:** Tạo `Item` model (`name`, `price`, `category`) + `RecordItem` sub-schema (`itemId`, `name`, `price`, `quantity`) — lưu denormalized để giữ giá lịch sử.
  - **Backend:** 5 IPC handlers mới (`db:save-item`, `db:delete-item`, `db:add-record-item`, `db:remove-record-item`, `db:update-record-item`). Cập nhật `db:get-data` trả thêm danh sách `items` + map ID records.
  - **Preload:** Thêm 5 channel mới vào whitelist.
  - **Admin UI:** Thêm menu "Sản phẩm" trong sidebar quản lý + bảng CRUD sản phẩm (tên, giá).
  - **Records table:** Thêm cột "Sản phẩm" — mỗi record có nút "+ Thêm" → mở modal chọn sản phẩm, số lượng, xóa.
  - **Tính tiền:** Thành tiền = tiền giờ + tiền sản phẩm. Thống kê doanh thu cũng bao gồm sản phẩm.
  - **Logic:** Thêm cùng 1 sản phẩm → cộng dồn quantity. Modal record-items tự refresh sau mỗi action.
  - **Helpers mới:** `calculateItemsCost()`, `calculateRecordTotal()`.
  - **CSS:** Thêm styles cho `.btn-record-items`, `.record-item-row`, `.record-items-panel`, v.v.
- **Fix lỗi `No handler registered for 'db:save-item'`:** Nguyên nhân là app chạy bản cũ (main process chưa restart). Giải pháp: tắt Electron hoàn toàn rồi chạy lại `npm run dev`.

### Session 2026-02-28 (tiếp)

- **Thêm tính năng xem Chi tiết Record:**
  - **Backend:** Thêm IPC handler `db:update-record-times` cho phép chỉnh sửa `checkIn` và `checkOut` của một record.
  - **Preload:** Thêm `db:update-record-times` vào whitelist.
  - **Renderer:** Thêm modal `record-detail` khi nhấn vào dòng record trong bảng lịch sử:
    - Cho phép chỉnh sửa giờ vào/giờ ra bằng input `date` + `time` riêng biệt.
    - Hiển thị riêng biệt: tiền giờ, tiền sản phẩm, và tổng cộng.
    - Hiển thị danh sách sản phẩm đã dùng (read-only view).
    - Nút xóa lượt vào/ra.
  - **Bảng records:** Dòng record có thể nhấn (cursor:pointer, hover highlight) để mở detail. Cột "Thành tiền" hiển thị thêm dòng nhỏ phân tách tiền giờ + tiền sản phẩm.
  - **CSS:** Thêm styles cho `.record-row-clickable`, `.record-detail-panel`, `.record-detail-times`, `.record-detail-costs`, `.record-detail-cost-row`, `.record-detail-cost-total`, `.btn-danger-outline`, `.record-cost-breakdown`.
- **Fix UI modal chi tiết record:**
  - Modal rộng hơn (`modal--wide` 560px) + `max-height:85vh` + `overflow-y:auto` cho body để không tràn.
  - Tách `datetime-local` thành 2 input riêng: `type="date"` (calendar picker) + `type="time"` — dễ chọn lịch hơn.
  - Layout 1 hàng ngang: `[Label] [Date] [Time]` cho mỗi dòng giờ vào/giờ ra.
  - Style `::-webkit-calendar-picker-indicator` icon 20×20px, vùng nhấn lớn, dễ click.
  - `closeModal()` tự remove `.modal--wide` để không ảnh hưởng modal khác.
- **Thêm nút Mở lại (Reopen record):**
  - Record đã check-out: nút "Mở lại (tiếp tục tính giờ)" — xóa `checkOut`, record trở lại active.
  - Validation: nếu phòng đã có lượt khác đang active → cảnh báo.
  - CSS: `.btn-reopen` (màu xanh lá), `.record-detail-active-note` (nhấp nháy).
- **Fix bảng records bị nhấp nháy (co giãn) mỗi giây:**
  - Thay `setInterval → renderRoomDetail()` bằng targeted update chỉ thay text content các ô live (duration, cost) qua `data-*` attributes.
  - `table-layout:fixed` + cố định width từng cột `<th>` để bảng không co ra co vào.
  - `font-variant-numeric:tabular-nums` cho duration value.
- **Thêm nút Dừng tính tiền:**
  - Record đang active: nút "Dừng tính tiền" (`.btn-stop-charge`, màu vàng cam) — check-out trực tiếp từ modal detail.
- **Sửa số lượng sản phẩm tại modal:**
  - Cột số lượng trong modal sản phẩm đổi thành `<input type="number">` có thể sửa trực tiếp.
  - Thành tiền cập nhật ngay khi nhập (client-side), lưu DB khi change (debounce 300ms).
  - CSS: `.record-item-qty-wrap`, `.record-item-qty-input` (ẩn spinner, style dark theme).
- **Nâng cấp Thống kê (Stats Enhancement):**
  - **Chart.js:** Cài `chart.js` (npm), copy UMD build ra `src/renderer/scripts/lib/chart.min.js` để tuân thủ CSP `script-src 'self'`.
  - **HTML:** Viết lại toàn bộ section thống kê trong admin — thêm filter bar (preset buttons: Hôm nay/7 ngày/Tháng này/Tất cả/Tùy chọn), custom date range inputs, 4 summary cards (doanh thu kỳ, tiền giờ, tiền SP, lượt sử dụng), 2 biểu đồ Canvas (bar chart doanh thu theo ngày, doughnut chart doanh thu theo phòng), bảng chi tiết 8 cột.
  - **Renderer:** State vars `statsPreset`, `chartDailyInstance`, `chartRoomInstance`. Thêm các hàm: `getStatsDateRange()`, `collectFilteredRecords(start, end)`, `buildDailyData(records, start, end)`, `renderChart_Daily(dailyData)`, `renderChart_Room(roomStats)`. Viết lại `renderAdminStats()` hoàn toàn.
  - **Event bindings:** `.stats-preset` buttons toggle active class, set `statsPreset`, show/hide custom date inputs, gọi `renderAdminStats()`. `#stats-btn-apply` gọi `renderAdminStats()`.
  - **CSS:** Thêm styles cho `.stats-filter-bar`, `.stats-filter-presets`, `.stats-preset`, `.stats-filter-dates`, `.form-input--sm`, `.stats-charts`, `.stats-chart-card`, `.stats-chart-title`, `.stats-chart-wrap`, `.stats-chart-wrap--sm`.

### Session 2026-03-01

- **Fix lỗi Stats Tab Lag & Chi tiết phòng:**
  - Vô hiệu hóa animation Chart.js, giới hạn khoảng ngày thống kê (cap 365 ngày), dùng `chart.update()` thay vì rebuild.
  - Thêm nút **Chi tiết** vào bảng thống kê phòng -> mở modal danh sách lượt sử dụng cụ thể của phòng đó.
- **Hệ thống Quản lý Tồn kho (Inventory Management):**
  - **Schema:** Cập nhật `Item` (thêm `stock`) và tạo mới `ImportRecord` (itemId, quantity, importPrice, note).
  - **Backend:** Thêm IPC handler `db:import-items`. Cập nhật `db:add-record-item`, `db:remove-record-item`, `db:update-record-item` để tự động trừ/hoàn kho khi bán hàng hoặc sửa số lượng.
  - **Preload:** Whitelist channel `db:import-items`.
  - **UI Admin:** Thêm cột "Tồn kho" vào bảng sản phẩm + Tab "Lịch sử nhập" + Nút "Nhập" nhanh mở modal nhập hàng.
  - **UI Check-in:** Hiển thị tồn kho khi chọn món, cảnh báo nếu hết hàng hoặc không đủ hàng.
  - **CSS:** Thêm `.count-badge` và `.count-badge--danger` (stock warning).
  - **Fix lỗi registration:** Nếu gặp lỗi `No handler registered`, kiểm tra việc restart main process (Electron).
- **Bỏ phần Danh mục sản phẩm:**
  - Xóa `category` khỏi `Item` schema, backend handlers và UI (table, modals, actions).
- **Đồng bộ Giao diện Modal:**
  - Tăng chiều rộng (wide layout - 800px) cho **tất cả** các modal (Phòng, Loại phòng, Sản phẩm, Nhập hàng, Chọn món) bằng class `modal--wide`.
