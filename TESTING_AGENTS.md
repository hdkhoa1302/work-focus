# 🧪 Hướng dẫn Test AI Agents

## ⚠️ Yêu cầu trước khi test

**Bắt buộc**: Cần thiết lập GEMINI_API_KEY trước khi test agents.

1. Xem hướng dẫn trong file `GEMINI_API_SETUP.md`
2. Tạo file `.env` với API key
3. Restart ứng dụng

## 🚀 Khởi động ứng dụng

```bash
npm run start:dev
```

## 🎯 Cách test AI Agents

### 1. **Mở ChatWidget**
- Tìm icon chat ở góc dưới phải màn hình
- Click để mở ChatWidget

### 2. **Kích hoạt Agent Mode**
- Trong header của ChatWidget, tìm nút **"Single"**
- Click để chuyển thành **"Agents"**
- Sẽ thấy Agent Status Panel xuất hiện

### 3. **Kiểm tra Agent Status Panel**
- Thấy 3 agents: Task Manager, Productivity Coach, Focus Guardian
- Mỗi agent có trạng thái (dot màu xám = chưa active)

## 📝 Câu hỏi test

### **Test Task Manager Agent**
```
"Tôi có 5 task cần hoàn thành hôm nay, làm sao sắp xếp hiệu quả?"
```

**Kết quả mong đợi:**
- Task Manager sẽ active (dot màu xanh)
- Phản hồi về ưu tiên deadline, chia nhỏ task, dành thời gian buffer

### **Test Productivity Coach Agent**
```
"Làm sao để tăng năng suất làm việc?"
```

**Kết quả mong đợi:**
- Productivity Coach sẽ active
- Gợi ý về Pomodoro, loại bỏ xao nhãng, đặt mục tiêu

### **Test Focus Guardian Agent**
```
"Tôi bị xao nhãng liên tục khi làm việc"
```

**Kết quả mong đợi:**
- Focus Guardian sẽ active
- Lời khuyên về tắt thông báo, Do Not Disturb, môi trường yên tĩnh

### **Test Multi-Agent Response**
```
"Tôi có nhiều task urgent nhưng cứ bị xao nhãng, làm sao tăng năng suất?"
```

**Kết quả mong đợi:**
- Cả 3 agents sẽ active cùng lúc
- Nhận được phản hồi từ nhiều agents
- Mỗi agent đưa ra lời khuyên từ góc độ chuyên môn

## ✅ Checklist kiểm tra

- [ ] ChatWidget mở được
- [ ] Toggle Single/Agents hoạt động
- [ ] Agent Status Panel hiển thị 3 agents
- [ ] Agents chuyển trạng thái khi active
- [ ] Nhận được phản hồi từ agents
- [ ] Confidence scores hiển thị
- [ ] Suggestions xuất hiện (nếu có)
- [ ] Multi-agent responses hoạt động

## 🐛 Troubleshooting

### **Lỗi "Cannot read properties of undefined"**
- Đảm bảo đã tạo file `.env` với GEMINI_API_KEY (xem GEMINI_API_SETUP.md)
- Restart ứng dụng: `pkill -f Electron` rồi `npm run start:dev`

### **Agents không active**
- Kiểm tra console để xem lỗi
- Thử câu hỏi có keywords rõ ràng: "task", "năng suất", "tập trung"

### **Không thấy Agent Status Panel**
- Đảm bảo đã bật Agent Mode (nút "Agents" màu xanh)
- Refresh trang nếu cần

## 🎉 Kết quả thành công

Khi test thành công, bạn sẽ thấy:
- **Agent Status Panel** với 3 agents
- **Dots màu xanh** cho agents đang active
- **Phản hồi chi tiết** từ từng agent
- **Format "Agent Name: Response"** trong chat
- **Confidence scores** hiển thị %

---

*Nếu gặp vấn đề, hãy check console logs và báo lỗi cụ thể!* 