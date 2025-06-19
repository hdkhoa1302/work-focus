# Hướng dẫn xử lý xung đột Port

## Tổng quan

Ứng dụng Work Focus mặc định sử dụng port 3000 cho API server. Khi có xung đột port, ứng dụng sẽ tự động:

1. **Tìm port khả dụng**: Tự động quét từ port 3000 đến 3010 để tìm port trống
2. **Thông báo chi tiết**: Hiển thị thông tin process đang chiếm port
3. **Gợi ý giải pháp**: Đưa ra hướng dẫn cụ thể để giải quyết

## Các tình huống thường gặp

### 1. Port 3000 bị chiếm bởi ứng dụng khác

**Triệu chứng:**
```
⚠️  Port 3000 đã bị sử dụng, chuyển sang port 3001
📋 Thông tin các port đã bị sử dụng:
   Port 3000: node (PID: 12345) - npm start
   💡 Gợi ý: Có vẻ là một ứng dụng Node.js khác đang chạy
```

**Giải pháp:**
- Ứng dụng tự động chuyển sang port 3001
- Hoặc dừng process khác: `kill 12345` (macOS/Linux) hoặc `taskkill /PID 12345 /F` (Windows)

### 2. Nhiều port bị chiếm

**Triệu chứng:**
```
⚠️  Port 3000 đã bị sử dụng, chuyển sang port 3003
📋 Thông tin các port đã bị sử dụng:
   Port 3000: node (PID: 12345) - react-scripts start
   Port 3001: python (PID: 67890) - python -m http.server 3001
   Port 3002: nginx (PID: 11111) - nginx: worker process
```

**Giải pháp:**
- Ứng dụng tự động chuyển sang port đầu tiên khả dụng
- Kiểm tra và dừng các service không cần thiết

### 3. Không thể tìm port khả dụng

**Triệu chứng:**
```
❌ Lỗi khi tìm port khả dụng: Không thể tìm thấy port khả dụng trong khoảng 3000-3010
```

**Giải pháp:**
1. Dừng một số service đang chạy
2. Hoặc đặt biến môi trường `API_PORT` thành port khác:
   ```bash
   API_PORT=4000 npm start
   ```

## Cấu hình nâng cao

### Thay đổi port mặc định

Tạo file `.env` trong thư mục gốc:
```env
API_PORT=4000
```

### Thay đổi range port scanning

Sửa trong `main/api.ts`:
```typescript
const result = await findAvailablePortWithInfo(preferredPort, 20); // Quét 20 port
```

## Xử lý sự cố

### Kiểm tra port đang sử dụng

**Linux/macOS:**
```bash
lsof -i :3000  # Kiểm tra port 3000
netstat -tulpn | grep :3000  # Cách khác
```

**Windows:**
```cmd
netstat -ano | findstr :3000
```

### Dừng process theo PID

**Linux/macOS:**
```bash
kill <PID>           # Dừng nhẹ nhàng
kill -9 <PID>        # Dừng bằng lực
```

**Windows:**
```cmd
taskkill /PID <PID> /F
```

### Dừng tất cả process Node.js

**Linux/macOS:**
```bash
pkill -f node
```

**Windows:**
```cmd
taskkill /IM node.exe /F
```

## Logs và Debug

Khi khởi động, kiểm tra console logs:

```
🌐 API server listening on http://localhost:3001
✅ Server khởi động thành công tại port 3001
🚀 Ứng dụng đã khởi động hoàn toàn với API server tại port 3001
```

## Liên hệ hỗ trợ

Nếu vẫn gặp vấn đề, hãy:
1. Kiểm tra logs đầy đủ
2. Ghi lại thông tin về các process đang chạy
3. Báo cáo chi tiết tình huống gặp phải 