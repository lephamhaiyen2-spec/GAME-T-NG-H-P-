# TRI THỨC — Nền tảng game học tập

Website nền tảng trò chơi học tập tương tác dành cho giáo viên và học sinh.

## Website

Sau khi GitHub Actions triển khai thành công, website dự kiến tại:
`https://lephamhaiyen2-spec.github.io/GAME-T-NG-H-P-/`

Trong GitHub, vào **Settings → Pages** và chọn **Source: GitHub Actions**. Quy trình deploy đã được cấu hình tại `.github/workflows/pages.yml`.

## Frontend hiện có

- Trang chủ responsive cho máy tính, máy tính bảng và điện thoại.
- Thư viện trò chơi: Đua thuyền tri thức, Chinh phục đỉnh núi, Ai là triệu phú, Giải mã bí ẩn.
- Luồng giao diện tạo phòng và tham gia phòng.
- Chế độ chơi thử, tính điểm mẫu.
- Ngân hàng câu hỏi demo, thêm câu hỏi, nhập CSV và tải mẫu CSV.

**Lưu ý:** giao diện hiện tại vẫn đang chạy ở chế độ demo cục bộ. Chưa kết nối frontend với API trực tuyến.

## Backend trực tuyến — mã nguồn đã được chuẩn bị

Thư mục `backend/` chứa nền tảng backend Cloudflare:

- **Cloudflare Workers:** API tạo phòng, tham gia, bắt đầu, trả lời, chuyển câu và xem bảng xếp hạng.
- **Cloudflare D1:** lưu phòng, người chơi, câu trả lời và điểm.
- **Durable Objects + WebSocket:** phát sự kiện phòng chơi đến các thiết bị đang kết nối.
- Token điều khiển giáo viên được trả về khi tạo phòng; máy chủ chỉ lưu mã băm token.

Xem hướng dẫn triển khai và danh sách API tại [backend/README.md](backend/README.md).

### Các bước cần thực hiện để đưa backend hoạt động

1. Tạo tài khoản Cloudflare và đăng nhập Wrangler trên máy tính.
2. Tạo D1 database, cập nhật `database_id` trong `backend/wrangler.toml`.
3. Chạy migration và deploy Worker theo hướng dẫn trong `backend/README.md`.
4. Kiểm tra endpoint `/api/health`.
5. Cấu hình URL Worker cho frontend và hoàn thiện tích hợp luồng giáo viên / học sinh.
6. Kiểm thử bằng nhiều điện thoại hoặc máy tính trước khi dùng trong lớp.

## Trạng thái thực tế

| Hạng mục | Trạng thái |
|---|---|
| Giao diện website | Đã có |
| Các trò chơi mẫu và luồng chơi demo | Đã có |
| Nhập câu hỏi CSV | Đã có |
| Mã nguồn API backend | Đã tạo |
| Schema và migration D1 | Đã tạo |
| Cấu hình Durable Objects / WebSocket | Đã tạo |
| Backend đã deploy lên Cloudflare | Chưa |
| Frontend đã kết nối backend | Chưa |
| QR tham gia phòng trực tuyến | Chưa tích hợp |
| Đồng bộ nhiều thiết bị đã kiểm thử | Chưa |

## Cấu trúc chính

```
.
├── index.html
├── assets/
│   ├── css/style.css
│   └── js/app.js
├── backend/
│   ├── src/index.js
│   ├── migrations/0001_initial.sql
│   ├── schema.sql
│   ├── wrangler.toml
│   └── README.md
└── .github/workflows/pages.yml
```
