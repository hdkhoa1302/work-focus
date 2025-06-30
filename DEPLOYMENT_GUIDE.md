# 🚀 Hướng dẫn Deploy API riêng biệt

Tài liệu này hướng dẫn cách tách API ra thành server riêng và deploy lên Vercel.

## 📁 Cấu trúc sau khi tách

```
work-focus/
├── api/                  # 🆕 API Server riêng biệt
│   ├── index.js         # Entry point
│   ├── package.json     # Dependencies cho API
│   ├── vercel.json      # Vercel config
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── services/        # Gemini service
│   └── utils/           # Database connection
├── src/                 # Frontend (Electron app)
│   └── services/
│       └── api.ts       # 🔄 Đã cập nhật để connect API riêng
└── main/                # Electron main process
```

## 🏗️ Bước 1: Setup API Server

### 1.1 Cài đặt dependencies
```bash
cd api
npm install
```

### 1.2 Cấu hình môi trường
Tạo file `api/.env`:
```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/work-focus

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
USE_MOCK_GEMINI=false

# Server
PORT=3000
NODE_ENV=production

# Frontend (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
```

### 1.3 Test API local
```bash
cd api
npm start
```

API sẽ chạy tại: http://localhost:3000

Test health check: http://localhost:3000/api/health

## 🌐 Bước 2: Deploy API lên Vercel

### 2.1 Cài đặt Vercel CLI
```bash
npm i -g vercel
```

### 2.2 Login Vercel
```bash
vercel login
```

### 2.3 Deploy API
```bash
cd api
vercel --prod
```

### 2.4 Cấu hình Environment Variables trên Vercel
1. Truy cập [Vercel Dashboard](https://vercel.com/dashboard)
2. Chọn project API → Settings → Environment Variables
3. Thêm tất cả biến môi trường từ file `.env`:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `USE_MOCK_GEMINI`
   - `NODE_ENV`
   - `FRONTEND_URL`

### 2.5 Lấy API URL
Sau khi deploy thành công, copy API URL (ví dụ: `https://work-focus-api.vercel.app`)

## 🔄 Bước 3: Cập nhật Frontend

### 3.1 Cấu hình API URL cho Frontend
Tạo file `.env.local` trong root project:
```bash
# API URL cho production (khi build web app)
REACT_APP_API_URL=https://work-focus-api.vercel.app
```

### 3.2 Cập nhật CORS trên API
Cập nhật biến `FRONTEND_URL` trên Vercel với domain frontend của bạn.

## 🧪 Bước 4: Test Integration

### 4.1 Test với Electron app (local)
```bash
# Terminal 1: Start API server
cd api
npm start

# Terminal 2: Start Electron app
npm run start
```

### 4.2 Test với Remote API
```bash
# Cập nhật .env.local với remote API URL
REACT_APP_API_URL=https://work-focus-api.vercel.app

# Start Electron app
npm run start
```

### 4.3 Test API endpoints
```bash
# Health check
curl https://work-focus-api.vercel.app/api/health

# Register user
curl -X POST https://work-focus-api.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"123456"}'
```

## 🔧 Troubleshooting

### Lỗi CORS
**Triệu chứng:** Frontend không kết nối được API
**Giải pháp:**
1. Kiểm tra biến `FRONTEND_URL` trên Vercel
2. Đảm bảo URL frontend chính xác
3. Thêm `*` cho development nếu cần

### Lỗi Database Connection
**Triệu chứng:** API trả về database errors
**Giải pháp:**
1. Kiểm tra `MONGO_URI` trên Vercel
2. Đảm bảo MongoDB Atlas cho phép connections từ Vercel (IP whitelist)
3. Kiểm tra database permissions

### Lỗi Authentication
**Triệu chứng:** Token không valid
**Giải pháp:**
1. Kiểm tra `JWT_SECRET` trên Vercel
2. Đảm bảo frontend gửi đúng Authorization header
3. Check token expiration

### API Timeout
**Triệu chứng:** API responses chậm hoặc timeout
**Giải pháp:**
1. Kiểm tra Vercel function limits (max 30s)
2. Optimize database queries
3. Implement caching nếu cần

## 📊 Monitoring & Analytics

### Vercel Analytics
1. Truy cập Vercel Dashboard → Analytics
2. Monitor API performance, requests, errors
3. Set up alerts cho downtime

### MongoDB Atlas Monitoring
1. Monitor database performance
2. Check connection counts
3. Optimize slow queries

## 🔄 CI/CD Pipeline

### Auto-deploy từ Git
1. Connect Vercel với GitHub repository
2. Set auto-deploy từ branch `main`
3. Environment variables sẽ được giữ nguyên

### Deploy script
Tạo file `deploy.sh`:
```bash
#!/bin/bash
echo "🚀 Deploying API to Vercel..."
cd api
vercel --prod
echo "✅ API deployment completed!"
```

## 📈 Performance Optimization

### 1. Database Optimization
- Sử dụng indexes cho queries thường dùng
- Implement connection pooling
- Cache frequent queries

### 2. API Optimization
- Implement response compression
- Use appropriate HTTP status codes
- Implement rate limiting

### 3. Frontend Optimization
- Cache API responses khi phù hợp
- Implement loading states
- Handle offline scenarios

## 🔐 Security Checklist

- ✅ JWT secret được bảo mật
- ✅ Database credentials được encrypt
- ✅ CORS được cấu hình đúng
- ✅ Input validation cho tất cả endpoints
- ✅ Rate limiting cho authentication endpoints
- ✅ HTTPS được enforce

## 🎯 Lợi ích của việc tách API

1. **Scalability**: API có thể scale độc lập
2. **Flexibility**: Frontend có thể connect từ nhiều platform
3. **Maintainability**: Easier to maintain và debug
4. **Performance**: Dedicated resources cho API
5. **Security**: Isolated security model
6. **Cost**: Pay-per-use cho API calls 