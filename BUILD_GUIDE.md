# Hướng dẫn Build Ứng dụng Room Manager

Tài liệu này hướng dẫn cách đóng gói ứng dụng Electron thành file cài đặt (`.dmg` cho macOS hoặc `.exe` cho Windows).

## 1. Chuẩn bị

Trước khi build, hãy đảm bảo bạn đã cài đặt đầy đủ các thư viện:

```bash
npm install
```

## 2. Các lệnh Build

Các lệnh này được cấu hình trong `package.json` sử dụng thư viện `electron-builder`.

### Build cho macOS (DMG)

Nếu bạn đang sử dụng máy Mac:

```bash
npm run build:mac
```

_Lệnh này sẽ tạo ra file `.dmg` trong thư mục `dist/`._

### Build cho Windows (Installer & Portable)

Nếu bạn muốn đóng gói cho Windows:

```bash
npm run build
```

_Lệnh này sẽ tạo ra file cài đặt (`.exe`) và bản chạy ngay (`portable`) trong thư mục `dist/`._

## 3. Thư mục đầu ra (Output)

Sau khi chạy lệnh build thành công, toàn bộ sản phẩm sẽ nằm trong thư mục:
**`dist/`**

- **macOS:** Tìm file `.dmg`.
- **Windows:** Tìm file `Room Manager Setup ... .exe`.

## 4. Lưu ý quan trọng

1.  **File .env:** Khi build, file `.env` sẽ được đóng gói kèm theo ứng dụng để đảm bảo kết nối Database. Hãy kiểm tra biến `MONGODB_URI` trong file `.env` trước khi build.
2.  **Icon:** Hiện tại ứng dụng đang dùng icon mặc định của Electron. Để thay đổi icon, bạn cần chuẩn bị file `icon.icns` (cho Mac) hoặc `icon.ico` (cho Windows) và cấu hình lại đường dẫn trong `package.json`.
3.  **Quyền chạy ứng dụng (macOS):** Sau khi cài đặt từ file DMG, nếu macOS báo "App is damaged" hoặc "unidentified developer", bạn có thể cần vào _System Settings > Privacy & Security_ để cho phép chạy (Open Anyway).

---

_Lưu ý: Bạn nên tắt ứng dụng đang chạy (`npm run dev`) trước khi thực hiện lệnh build để tránh xung đột file._
