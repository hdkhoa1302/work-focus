# Hướng dẫn thiết lập Gemini API

## Bước 1: Lấy API Key
1. Truy cập https://ai.google.dev/
2. Đăng nhập với tài khoản Google
3. Tạo API key mới
4. Copy API key

## Bước 2: Thiết lập môi trường
Tạo file `.env` trong thư mục gốc của dự án với nội dung:

```bash
# Gemini API Configuration  
GEMINI_API_KEY=your_actual_api_key_here

# Development settings
NODE_ENV=development
```

## Bước 3: Test Agents
1. Khởi động ứng dụng: `npm run start:dev`
2. Mở chat widget
3. Toggle sang "Agents" mode
4. Test với các câu hỏi:
   - "Tôi cần lên kế hoạch làm việc"
   - "Làm sao để tăng năng suất?"
   - "Tôi bị xao nhãng khi làm việc"

## Lưu ý
- Không commit file `.env` lên git
- API key cần được bảo mật
- Có thể cần restart ứng dụng sau khi thêm API key 