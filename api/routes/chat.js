const { ConversationModel } = require('../models/conversation');
const { TaskModel } = require('../models/task');
const { ProjectModel } = require('../models/project');
const { SessionModel } = require('../models/session');
const { ConfigModel } = require('../models/config');
const { chat } = require('../services/geminiService');

function setupChatRoutes(app, authenticateToken) {
  // AI Chat endpoint
  app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const { message, conversationId, whiteboardContext } = req.body;

      // Get or create active conversation
      let conversation;
      if (conversationId) {
        conversation = await ConversationModel.findOne({ _id: conversationId, userId });
      } else {
        conversation = await ConversationModel.findOne({ userId, isActive: true });
      }

      if (!conversation) {
        // Create new conversation
        conversation = new ConversationModel({
          userId,
          title: `Cuộc trò chuyện ${new Date().toLocaleDateString()}`,
          messages: [],
          isActive: true
        });
      }

      // Add user message
      conversation.messages.push({
        from: 'user',
        text: message,
        timestamp: new Date(),
        type: 'text'
      });

      // Get context from conversation history
      const conversationHistory = conversation.messages.slice(-10).map(m => 
        `${m.from === 'user' ? 'User' : 'AI'}: ${m.text}`
      ).join('\n');

      // Get comprehensive user data for analysis
      const [projects, tasks, sessions, config] = await Promise.all([
        ProjectModel.find({ userId }),
        TaskModel.find({ userId }),
        SessionModel.find({ userId }),
        ConfigModel.findOne({ userId })
      ]);

      // Default work schedule if not configured
      const workSchedule = config?.workSchedule || {
        hoursPerDay: 8,
        daysPerWeek: 5,
        startTime: '09:00',
        endTime: '17:00',
        breakHours: 1,
        overtimeRate: 1.5
      };

      // Calculate productivity metrics
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      const focusSessions = sessions.filter(s => s.type === 'focus');
      const totalFocusTime = focusSessions.reduce((total, s) => total + (s.duration || 0), 0);
      
      // Today's productivity metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const todayTasks = tasks.filter(t => 
        t.updatedAt && new Date(t.updatedAt) >= today && new Date(t.updatedAt) <= todayEnd
      );
      const todayCompletedTasks = todayTasks.filter(t => t.status === 'done').length;
      
      // Prepare context for AI
      const whiteboardSummary = whiteboardContext && whiteboardContext.length > 0 
        ? `\n\nWhiteboard hiện tại:\n${whiteboardContext.map((item) => 
            `- ${item.type}: "${item.title}" (${item.status}) - ${item.description}`
          ).join('\n')}`
        : '';

      const productivityContext = `
📊 PHÂN TÍCH NĂNG SUẤT TOÀN DIỆN:
• Tỷ lệ hoàn thành: ${completionRate.toFixed(1)}% (${completedTasks}/${totalTasks} tasks)
• Kinh nghiệm Pomodoro: ${focusSessions.length} phiên (${Math.round(totalFocusTime/60)} phút)
• Hôm nay: ${todayCompletedTasks} tasks hoàn thành

🗓️ LỊCH LÀM VIỆC:
• Giờ làm việc: ${workSchedule.startTime} - ${workSchedule.endTime}
• Nghỉ: ${workSchedule.breakHours}h/ngày

📋 DỰ ÁN HIỆN TẠI:
${projects.map(p => `• ${p.name} (${p.status || 'active'}) - ${tasks.filter(t => t.projectId.toString() === p._id.toString()).length} tasks`).join('\n')}
`;

      let botResponse = '';
      let responseType = 'text';
      let responseData = null;

      // Simple project creation detection
      if (message.length > 50 && (
        message.toLowerCase().includes('dự án') ||
        message.toLowerCase().includes('project') ||
        message.toLowerCase().includes('cần làm') ||
        message.toLowerCase().includes('nhiệm vụ')
      )) {
        responseType = 'project';
        
        const projectAnalysisPrompt = `
Bạn là chuyên gia phân tích dự án. Phân tích mô tả sau và tạo kế hoạch dự án:

Mô tả: "${message}"

${productivityContext}

Lịch sử cuộc trò chuyện:
${conversationHistory}

${whiteboardSummary}

Hãy tạo phân tích dự án với:
1. Tên dự án ngắn gọn
2. Mô tả chi tiết
3. Chia thành 3-7 tasks cụ thể
4. Ước tính thời gian Pomodoro cho mỗi task
5. Xếp thứ tự ưu tiên

Trả về JSON:
{
  "projectName": "Tên dự án",
  "description": "Mô tả chi tiết",
  "timeline": "X ngày/tuần",
  "tasks": [
    {
      "title": "Tên task",
      "description": "Mô tả task",
      "estimatedPomodoros": 1-5,
      "priority": 1-3,
      "order": 1
    }
  ],
  "keyPoints": ["Điểm quan trọng 1", "Điểm quan trọng 2"]
}

Chỉ trả về JSON, không thêm text khác.
`;

        try {
          const aiResponse = await chat({
            model: 'gemini-2.0-flash',
            contents: projectAnalysisPrompt
          });

          const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            responseData = analysis;
            
            botResponse = `🎯 **Phân tích dự án hoàn tất!**

**📋 Dự án:** ${analysis.projectName}
**📝 Mô tả:** ${analysis.description}
**⏱️ Timeline:** ${analysis.timeline}

**🎯 Các task được đề xuất:**
${analysis.tasks
  .sort((a, b) => (a.order || 0) - (b.order || 0))
  .map((task, index) => 
    `${index + 1}. **${task.title}** (${task.priority === 3 ? 'Cao' : task.priority === 2 ? 'Trung bình' : 'Thấp'}) - ${task.estimatedPomodoros} Pomodoro\n   📝 ${task.description}`
  ).join('\n\n')}

**💡 Điểm quan trọng:**
${analysis.keyPoints.map(point => `• ${point}`).join('\n')}

✅ **Bạn có muốn tôi tạo dự án này không?** Hãy trả lời "Có, tạo dự án" để xác nhận.`;
          }
        } catch (error) {
          console.error('Project analysis failed:', error);
          botResponse = '❌ Có lỗi xảy ra khi phân tích dự án. Vui lòng mô tả rõ hơn về dự án bạn muốn thực hiện.';
        }
      }
      // Handle project creation confirmation
      else if ((message.toLowerCase().includes('có') && message.toLowerCase().includes('tạo')) ||
               message.toLowerCase().includes('xác nhận') ||
               message.toLowerCase().includes('đồng ý')) {
        
        // Find the last project analysis in conversation
        let lastProjectMessage = null;
        for (let i = conversation.messages.length - 1; i >= 0; i--) {
          if (conversation.messages[i].type === 'project' && conversation.messages[i].data) {
            lastProjectMessage = conversation.messages[i];
            break;
          }
        }
        
        if (lastProjectMessage?.data) {
          try {
            const analysis = lastProjectMessage.data;
            
            // Create project
            const project = await ProjectModel.create({
              name: analysis.projectName,
              description: analysis.description,
              userId
            });
            
            // Create tasks
            const createdTasks = [];
            const sortedTasks = analysis.tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            for (const taskData of sortedTasks) {
              const task = await TaskModel.create({
                projectId: project._id,
                title: taskData.title,
                description: taskData.description,
                priority: taskData.priority,
                estimatedPomodoros: taskData.estimatedPomodoros,
                userId
              });
              createdTasks.push(task);
            }

            responseType = 'task';
            botResponse = `✅ **Dự án đã được tạo thành công!**

📋 **${project.name}** với ${createdTasks.length} tasks đã được tạo
🎯 Bạn có thể bắt đầu làm việc ngay bây giờ!

**🚀 Gợi ý để bắt đầu hiệu quả:**
• Bắt đầu với task có độ ưu tiên cao nhất
• Sử dụng kỹ thuật Pomodoro để duy trì tập trung
• Cập nhật tiến độ thường xuyên

Chuyển đến trang dự án để xem chi tiết và bắt đầu làm việc nhé! 🎉`;
          } catch (error) {
            console.error('Failed to create project:', error);
            botResponse = '❌ Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại!';
          }
        } else {
          botResponse = '❌ Không tìm thấy thông tin dự án để tạo. Vui lòng mô tả lại dự án bạn muốn thực hiện.';
        }
      }
      // General AI chat
      else {
        const generalPrompt = `
Bạn là AI assistant chuyên về quản lý công việc và năng suất. Trả lời câu hỏi sau một cách hữu ích:

Câu hỏi: "${message}"

${productivityContext}

Lịch sử cuộc trò chuyện:
${conversationHistory}

${whiteboardSummary}

Hãy trả lời một cách hữu ích, cụ thể và phù hợp với bối cảnh của người dùng.
`;

        try {
          const aiResponse = await chat({
            model: 'gemini-2.0-flash',
            contents: generalPrompt
          });
          botResponse = aiResponse.text;
        } catch (error) {
          console.error('AI chat failed:', error);
          botResponse = 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại!';
        }
      }

      // Add bot response
      conversation.messages.push({
        from: 'bot',
        text: botResponse,
        timestamp: new Date(),
        type: responseType,
        data: responseData
      });

      conversation.updatedAt = new Date();
      await conversation.save();

      res.json({
        message: botResponse,
        type: responseType,
        data: responseData,
        conversationId: conversation._id
      });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ message: 'Failed to process AI chat' });
    }
  });
}

module.exports = { setupChatRoutes }; 