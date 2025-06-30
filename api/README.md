# Work Focus API Server

API server riêng biệt cho ứng dụng Work Focus, được thiết kế để deploy lên Vercel.

## 🚀 Cài đặt

1. **Clone repository và chuyển vào thư mục API:**
```bash
cd api
npm install
```

2. **Cấu hình biến môi trường:**
Tạo file `.env` với các biến sau:
```bash
# Database
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/work-focus?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
USE_MOCK_GEMINI=false

# Server
PORT=3000
NODE_ENV=production

# Frontend (for CORS)
FRONTEND_URL=http://localhost:3001
```

## 🌐 Deploy lên Vercel

1. **Cài đặt Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Cấu hình biến môi trường trên Vercel:**
- Truy cập Vercel Dashboard
- Chọn project → Settings → Environment Variables
- Thêm tất cả biến môi trường từ file `.env`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/validate` - Xác thực token
- `PUT /api/auth/profile` - Cập nhật thông tin cá nhân

### Tasks
- `GET /api/tasks` - Lấy danh sách tasks
- `POST /api/tasks` - Tạo task mới
- `GET /api/tasks/:id` - Lấy task theo ID
- `PUT /api/tasks/:id` - Cập nhật task
- `DELETE /api/tasks/:id` - Xóa task
- `GET /api/tasks/daily/:date?` - Lấy tasks hàng ngày

### Projects
- `GET /api/projects` - Lấy danh sách dự án
- `POST /api/projects` - Tạo dự án mới
- `GET /api/projects/:id` - Lấy dự án theo ID
- `PUT /api/projects/:id` - Cập nhật dự án
- `DELETE /api/projects/:id` - Xóa dự án
- `GET /api/projects/:id/progress` - Phân tích tiến độ dự án

### Conversations
- `GET /api/conversations` - Lấy danh sách cuộc trò chuyện
- `POST /api/conversations` - Tạo cuộc trò chuyện mới
- `GET /api/conversations/:id` - Lấy cuộc trò chuyện theo ID
- `PUT /api/conversations/:id/activate` - Kích hoạt cuộc trò chuyện
- `DELETE /api/conversations/:id` - Xóa cuộc trò chuyện

### Sessions
- `GET /api/sessions` - Lấy danh sách phiên làm việc
- `POST /api/sessions` - Tạo phiên làm việc mới
- `PUT /api/sessions/:id` - Cập nhật phiên làm việc
- `DELETE /api/sessions/:id` - Xóa phiên làm việc

### Config
- `GET /api/config` - Lấy cấu hình
- `POST /api/config` - Lưu cấu hình

### AI Chat
- `POST /api/ai/chat` - Chat với AI assistant

### Health Check
- `GET /api/health` - Kiểm tra trạng thái server

## 🔧 Development

```bash
# Chạy server local
npm start

# Dev mode (nếu có nodemon)
npm run dev
```

Server sẽ chạy tại: http://localhost:3000

## 🔐 Authentication

API sử dụng JWT authentication. Tất cả endpoints (trừ auth và health check) yêu cầu header:

```
Authorization: Bearer <token>
```