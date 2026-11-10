# TRI THỨC — Nền tảng game học tập

Website nền tảng trò chơi học tập tương tác dành cho giáo viên và học sinh.

## Chạy website
- Mở `index.html` bằng trình duyệt để xem giao diện.
- Có thể triển khai bằng GitHub Pages: **Settings → Pages → Deploy from a branch → main → /(root) → Save**.
- Sau khi GitHub Pages hoàn tất triển khai, website sẽ có địa chỉ dạng `https://lephamhaiyen2-spec.github.io/GAME-T-NG-H-P-/`.

## Những phần đã có trong bản khởi tạo
- Trang chủ responsive, giao diện desktop và mobile.
- Thư viện trò chơi: Đua thuyền tri thức, Chinh phục đỉnh núi, Ai là triệu phú, Giải mã bí ẩn.
- Luồng giao diện tạo phòng và tham gia phòng.
- Chế độ chơi thử câu hỏi trắc nghiệm, tính điểm mẫu.
- Ngân hàng câu hỏi demo, thêm câu hỏi và nhập CSV.
- Tải tệp mẫu câu hỏi CSV.

## Lưu ý quan trọng
Đây là **bản MVP giao diện và tương tác chạy cục bộ trên trình duyệt**, chưa phải hệ thống thi đấu trực tuyến nhiều thiết bị. Mã phòng hiện tại chỉ là mã demo được lưu trên thiết bị tạo phòng. Để giáo viên và học sinh ở nhiều điện thoại/máy tính cùng vào một phòng thật, cần triển khai backend, cơ sở dữ liệu, xác thực và kết nối thời gian thực.

## Kiến trúc dự kiến cho giai đoạn tiếp theo
- Frontend: HTML/CSS/JavaScript hiện tại; có thể chuyển dần sang cấu trúc module khi mở rộng.
- Backend: Cloudflare Workers.
- Database: Cloudflare D1.
- Lưu trữ tệp: Cloudflare R2.
- Realtime: WebSocket / Durable Objects hoặc dịch vụ realtime phù hợp.
- Bộ máy trò chơi dùng chung; mỗi trò chơi là một module riêng.
- Bộ câu hỏi chuẩn hóa, hỗ trợ Excel/CSV và quản lý theo môn/lớp/chủ đề.

## Cấu trúc
```
.
├── index.html
├── README.md
└── assets
    ├── css
    │   └── style.css
    └── js
        └── app.js
```
