const { ConversationModel } = require('../models/conversation');

function setupConversationRoutes(app, authenticateToken) {
  // Get conversations
  app.get('/api/conversations', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const conversations = await ConversationModel.find({ userId }).sort({ updatedAt: -1 });
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  // Create conversation
  app.post('/api/conversations', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const { title } = req.body;
      
      // Deactivate other conversations
      await ConversationModel.updateMany({ userId }, { isActive: false });
      
      const conversation = new ConversationModel({
        userId,
        title: title || `Cuộc trò chuyện ${new Date().toLocaleDateString()}`,
        messages: [{
          from: 'bot',
          text: `🎯 Chào mừng bạn đến với AI Agent - Trợ lý quản lý công việc thông minh!

Tôi có thể giúp bạn:
📋 **Quản lý dự án & công việc**
• Phân tích mô tả công việc và tạo dự án chi tiết
• Chia nhỏ dự án thành các task cụ thể với timeline rõ ràng
• Theo dõi tiến độ và đưa ra gợi ý tối ưu hóa

🎨 **Whiteboard thông minh**
• Ghi nhớ các quyết định quan trọng
• Lưu trữ ý tưởng và kế hoạch dài hạn
• Theo dõi các mục tiêu đã đặt ra

📊 **Phân tích & động viên dựa trên khoa học**
• Đánh giá hiệu suất làm việc theo phương pháp SMART
• Áp dụng nguyên lý Flow State và Pomodoro
• Động viên kịp thời với hệ thống thành tích

Hãy bắt đầu bằng cách mô tả chi tiết dự án hoặc công việc bạn muốn thực hiện!`,
          timestamp: new Date(),
          type: 'text'
        }],
        isActive: true
      });
      
      await conversation.save();
      res.json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ message: 'Failed to create conversation' });
    }
  });

  // Get conversation by ID
  app.get('/api/conversations/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const conversation = await ConversationModel.findOne({ _id: req.params.id, userId });
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      res.json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  });

  // Activate conversation
  app.put('/api/conversations/:id/activate', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      
      // Deactivate all conversations
      await ConversationModel.updateMany({ userId }, { isActive: false });
      
      // Activate selected conversation
      const conversation = await ConversationModel.findOneAndUpdate(
        { _id: req.params.id, userId },
        { isActive: true, updatedAt: new Date() },
        { new: true }
      );
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error('Error activating conversation:', error);
      res.status(500).json({ message: 'Failed to activate conversation' });
    }
  });

  // Delete conversation
  app.delete('/api/conversations/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const conversation = await ConversationModel.findOneAndDelete({ _id: req.params.id, userId });
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ message: 'Failed to delete conversation' });
    }
  });
}

module.exports = { setupConversationRoutes }; 