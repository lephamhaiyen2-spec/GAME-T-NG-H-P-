# TRI THỨC — Backend phòng chơi trực tuyến

Backend dùng Cloudflare Workers + D1 + Durable Objects. Frontend GitHub Pages sẽ gọi API qua biến cấu hình `API_BASE_URL` (sẽ được nối ở bước tích hợp giao diện).

## Chức năng API đã chuẩn bị

- `GET /api/health`: kiểm tra máy chủ.
- `POST /api/rooms`: tạo phòng, nhận `room.code` và `hostToken`.
- `GET /api/rooms/:code`: xem thông tin phòng và danh sách người chơi.
- `POST /api/rooms/:code/join`: học sinh tham gia phòng.
- `POST /api/rooms/:code/start`: giáo viên bắt đầu phòng (header `x-host-token`).
- `POST /api/rooms/:code/answer`: ghi nhận câu trả lời và điểm.
- `POST /api/rooms/:code/next`: chuyển câu / kết thúc phòng (cần `x-host-token`).
- `GET /api/rooms/:code/current-question`: lấy câu hỏi hiện tại nhưng không tiết lộ đáp án đúng.
- `GET /api/rooms/:code/leaderboard`: bảng xếp hạng.
- WebSocket: Durable Object `RoomHub` phát sự kiện người chơi tham gia, bắt đầu game, cập nhật điểm và chuyển câu.

### Định dạng tạo phòng

```json
{
  "gameId": "boat",
  "title": "KHTN 7 - Ôn tập",
  "settings": { "secondsPerQuestion": 20, "teamCount": 4 },
  "questions": [
    {
      "question": "Câu hỏi mẫu?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 1,
      "explanation": "Giải thích đáp án."
    }
  ]
}
```

## Triển khai lần đầu

1. Tạo tài khoản Cloudflare và mở Workers & Pages.
2. Cài Wrangler trên máy tính: `npm install -g wrangler`.
3. Đăng nhập: `wrangler login`.
4. D1 database `tri-thuc-db` đã được tạo; `database_id` đã được ghi vào `wrangler.toml`.
5. Từ thư mục `backend`, cài dependencies bằng `npm install`.
6. Áp dụng schema từ thư mục `backend`: `npm run db:remote`.
7. Triển khai Worker: `npm run deploy`.
8. Kiểm tra `https://tri-thuc-game-api.<account>.workers.dev/api/health`.
9. Giữ `ALLOWED_ORIGIN` đúng URL GitHub Pages của website.

## Bảo mật và giới hạn bản đầu

- Token giáo viên chỉ trả về một lần khi tạo phòng; frontend cần lưu token trong phiên giáo viên, không đưa vào URL công khai.
- API chỉ nhận tối đa 200 câu hỏi mỗi phòng; giới hạn tên và nội dung đầu vào.
- Bản đầu chưa có tài khoản giáo viên, đăng nhập, chống spam nâng cao, giới hạn tốc độ theo IP hoặc công cụ quản trị dữ liệu.
- WebSocket hiện phát sự kiện đến các kết nối trong cùng Durable Object; phần xác thực vai trò và khôi phục kết nối cần được hoàn thiện khi tích hợp UI.
- Không coi backend đã hoạt động cho đến khi triển khai và kiểm thử trên Cloudflare thật.

## Cấu trúc

- `src/index.js`: API Worker và lớp Durable Object.
- `migrations/0001_initial.sql`: schema D1.
- `wrangler.toml`: cấu hình binding.
- `schema.sql`: bản schema tham khảo.
