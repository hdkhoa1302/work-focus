import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { TaskModel } from './models/task';
import { SessionModel } from './models/session';
import { ConfigModel } from './models/config';
import { ConversationModel } from './models/conversation';
import { setupAuthRoutes, authenticateToken } from './auth';
import { ProjectModel } from './models/project';
import { chat } from './services/geminiService';
import { logger } from './utils/logger';
import { handleError, AppError } from './utils/errorHandler';
import { generalLimiter, aiLimiter } from './middleware/rateLimiter';
import { validateRequest, commonValidations } from './middleware/validation';
import { notificationService } from './services/notificationService';

// Import route modules
import healthRoutes from './routes/healthRoutes';
import backupRoutes from './routes/backupRoutes';

export function setupAPI() {
  const app = express();
  const port = process.env.API_PORT || 3000;

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for Electron app
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(compression());
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
  }));
  
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  app.use(generalLimiter.middleware());

  // Health check routes (no auth required)
  app.use('/api', healthRoutes);

  // Setup authentication routes
  setupAuthRoutes(app);

  // Backup routes
  app.use('/api/backup', backupRoutes);

  // Protected routes middleware
  app.use('/api/tasks', authenticateToken);
  app.use('/api/sessions', authenticateToken);
  app.use('/api/config', authenticateToken);
  app.use('/api/projects', authenticateToken);
  app.use('/api/conversations', authenticateToken);
  app.use('/api/ai', authenticateToken);

  // Conversation APIs
  app.get('/api/conversations', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const conversations = await ConversationModel.find({ userId }).sort({ updatedAt: -1 });
      res.json(conversations);
    } catch (error) {
      handleError(error as Error, 'Get Conversations');
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', 
    validateRequest([
      {
        field: 'title',
        required: false,
        type: 'string',
        maxLength: 100
      }
    ]),
    async (req, res) => {
      try {
        const userId = (req as any).userId;
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
        handleError(error as Error, 'Create Conversation');
        res.status(500).json({ message: 'Failed to create conversation' });
      }
    }
  );

  // Enhanced AI chat endpoint with better error handling and validation
  app.post('/api/ai/chat', 
    aiLimiter.middleware(),
    validateRequest([
      {
        field: 'message',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 2000
      },
      {
        field: 'conversationId',
        required: false,
        type: 'string'
      }
    ]),
    async (req, res) => {
      try {
        const userId = (req as any).userId;
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

        // Get user data for context
        const [projects, tasks, sessions] = await Promise.all([
          ProjectModel.find({ userId }),
          TaskModel.find({ userId }),
          SessionModel.find({ userId })
        ]);

        // Prepare whiteboard context for AI
        const whiteboardSummary = whiteboardContext && whiteboardContext.length > 0 
          ? `\n\nWhiteboard hiện tại:\n${whiteboardContext.map((item: any) => 
              `- ${item.type}: "${item.title}" (${item.status}) - ${item.description}`
            ).join('\n')}`
          : '';

        let botResponse = '';
        let responseType = 'text';
        let responseData = null;

        // Enhanced project creation intent detection
        if (message.toLowerCase().includes('tạo dự án') || 
            message.toLowerCase().includes('phân tích') && message.toLowerCase().includes('dự án') ||
            message.toLowerCase().includes('lập kế hoạch') ||
            message.toLowerCase().includes('project') ||
            message.toLowerCase().includes('nhiệm vụ') && message.length > 50) {
          
          const analysisPrompt = `
Bạn là chuyên gia quản lý dự án AI. Phân tích mô tả công việc sau và tạo cấu trúc dự án chi tiết theo phương pháp SMART:

Mô tả từ người dùng: "${message}"

Lịch sử cuộc trò chuyện để hiểu ngữ cảnh:
${conversationHistory}

${whiteboardSummary}

Dữ liệu hiện tại của người dùng:
- Số dự án đang có: ${projects.length}
- Số task đã hoàn thành: ${tasks.filter(t => t.status === 'done').length}/${tasks.length}
- Kinh nghiệm Pomodoro: ${sessions.filter(s => s.type === 'focus').length} phiên

Hãy phân tích sâu và tạo dự án với:
1. Tên dự án cụ thể, hấp dẫn
2. Mô tả chi tiết mục tiêu và kết quả mong đợi
3. Chia nhỏ thành 3-8 tasks với:
   - Tiêu đề rõ ràng, hành động cụ thể
   - Mô tả chi tiết cách thực hiện
   - Độ ưu tiên dựa trên phụ thuộc và tầm quan trọng
   - Ước tính Pomodoro thực tế (1-8 cho mỗi task)
   - Thứ tự thực hiện logic
4. Timeline tổng thể
5. Các điểm quan trọng cần lưu ý
6. Gợi ý kỹ năng hoặc tài nguyên cần thiết

Nếu mô tả chưa đủ chi tiết, hãy đặt 2-3 câu hỏi làm rõ.

Trả về JSON với format chính xác:
{
  "projectName": "Tên dự án cụ thể",
  "description": "Mô tả chi tiết dự án và mục tiêu",
  "tasks": [
    {
      "title": "Tên task cụ thể với động từ hành động",
      "description": "Mô tả chi tiết cách thực hiện, bao gồm các bước cụ thể",
      "priority": 1-3,
      "estimatedPomodoros": 1-8,
      "order": 1
    }
  ],
  "timeline": "Thời gian dự kiến hoàn thành",
  "keyPoints": ["Điểm quan trọng 1", "Điểm quan trọng 2"],
  "requiredSkills": ["Kỹ năng 1", "Kỹ năng 2"],
  "clarificationQuestions": ["Câu hỏi 1?", "Câu hỏi 2?"]
}

Chỉ trả về JSON, không thêm text khác.
`;

          try {
            const aiResponse = await chat({
              model: 'gemini-2.0-flash',
              contents: analysisPrompt
            });

            // Extract JSON from response
            const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysis = JSON.parse(jsonMatch[0]);
              responseData = analysis;
              responseType = 'project';
              
              let clarificationText = '';
              if (analysis.clarificationQuestions && analysis.clarificationQuestions.length > 0) {
                clarificationText = `\n\n❓ **Để tối ưu hóa dự án, tôi cần làm rõ thêm:**\n${analysis.clarificationQuestions.map((q: string) => `• ${q}`).join('\n')}`;
              }

              let skillsText = '';
              if (analysis.requiredSkills && analysis.requiredSkills.length > 0) {
                skillsText = `\n\n🎯 **Kỹ năng cần thiết:**\n${analysis.requiredSkills.map((skill: string) => `• ${skill}`).join('\n')}`;
              }

              botResponse = `🎯 **Phân tích dự án hoàn tất!**

**📋 Dự án:** ${analysis.projectName}
**📝 Mô tả:** ${analysis.description}
**⏱️ Timeline:** ${analysis.timeline}

**🎯 Các task được đề xuất (theo thứ tự ưu tiên):**
${analysis.tasks
  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  .map((task: any, index: number) => 
    `${index + 1}. **${task.title}** (${task.priority === 3 ? 'Cao' : task.priority === 2 ? 'Trung bình' : 'Thấp'}) - ${task.estimatedPomodoros} Pomodoro\n   📝 ${task.description}`
  ).join('\n\n')}

**💡 Điểm quan trọng:**
${analysis.keyPoints.map((point: string) => `• ${point}`).join('\n')}${skillsText}${clarificationText}

✅ **Bạn có muốn tôi tạo dự án này không?** Hãy trả lời "Có, tạo dự án" để xác nhận hoặc yêu cầu chỉnh sửa nếu cần.`;
            }
          } catch (error) {
            logger.error('AI analysis failed:', error);
            botResponse = '❌ Có lỗi xảy ra khi phân tích. Vui lòng mô tả rõ hơn về dự án bạn muốn thực hiện, bao gồm mục tiêu, phạm vi và thời gian dự kiến.';
          }
        }
        // Enhanced project creation confirmation with better pattern matching
        else if ((message.toLowerCase().includes('có') && (message.toLowerCase().includes('tạo') || message.toLowerCase().includes('dự án'))) ||
                 message.toLowerCase().includes('xác nhận') ||
                 message.toLowerCase().includes('đồng ý') ||
                 message.toLowerCase().includes('ok') ||
                 message.toLowerCase().includes('được') ||
                 message.toLowerCase().trim() === 'có' ||
                 message.toLowerCase().includes('yes')) {
          
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
                userId
              });
              
              // Create tasks with proper ordering
              const createdTasks = [];
              const sortedTasks = analysis.tasks.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
              
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
• Cập nhật tiến độ thường xuyên để tôi có thể hỗ trợ tốt hơn

**📊 Thống kê dự án:**
• Tổng thời gian ước tính: ${createdTasks.reduce((total, task) => total + (task.estimatedPomodoros || 0), 0)} Pomodoro
• Độ phức tạp: ${createdTasks.length > 5 ? 'Cao' : createdTasks.length > 3 ? 'Trung bình' : 'Đơn giản'}

Chuyển đến trang dự án để xem chi tiết và bắt đầu làm việc nhé! 🎉`;

              // Send notification
              await notificationService.show({
                title: 'Dự án mới đã được tạo!',
                body: `"${project.name}" với ${createdTasks.length} tasks đã sẵn sàng`,
                sound: true
              });

            } catch (error) {
              logger.error('Failed to create project:', error);
              botResponse = '❌ Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại!';
            }
          } else {
            botResponse = '❌ Không tìm thấy thông tin dự án để tạo. Vui lòng mô tả lại dự án bạn muốn thực hiện.';
          }
        }
        // General AI chat with enhanced context including whiteboard
        else {
          const contextPrompt = `
Bạn là AI Agent trợ lý quản lý công việc thông minh, áp dụng các phương pháp khoa học về năng suất.

Lịch sử cuộc trò chuyện:
${conversationHistory}

${whiteboardSummary}

Dữ liệu người dùng hiện tại:
- Số dự án: ${projects.length} (${projects.filter(p => !p.completed).length} đang thực hiện)
- Số task: ${tasks.length} (${tasks.filter(t => t.status === 'done').length} hoàn thành)
- Số phiên Pomodoro: ${sessions.filter(s => s.type === 'focus').length}
- Tỷ lệ hoàn thành: ${tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0}%

Tin nhắn mới: ${message}

Hãy trả lời dựa trên các nguyên tắc khoa học:
1. **Mục tiêu SMART**: Gợi ý cách đặt mục tiêu cụ thể, đo lường được
2. **Flow State**: Nhận diện và gợi ý cách duy trì trạng thái tập trung
3. **Pomodoro Technique**: Khuyến khích sử dụng kỹ thuật này
4. **Gamification**: Tạo động lực qua thành tích và milestone
5. **Positive Reinforcement**: Khen ngợi thành tích và động viên

Nếu người dùng hỏi về whiteboard hoặc các ghi chú/quyết định đã lưu, hãy tham khảo thông tin từ whiteboard context.

Trả lời một cách thân thiện, hữu ích và dựa trên dữ liệu thực tế của người dùng.
`;

          try {
            const aiResponse = await chat({
              model: 'gemini-2.0-flash',
              contents: contextPrompt
            });
            botResponse = aiResponse.text;
          } catch (error) {
            logger.error('AI chat failed:', error);
            botResponse = '❌ Xin lỗi, có lỗi xảy ra. Vui lòng thử lại!';
          }
        }

        // Add bot response to conversation
        conversation.messages.push({
          from: 'bot',
          text: botResponse,
          timestamp: new Date(),
          type: responseType as any,
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
        handleError(error as Error, 'AI Chat');
        res.status(500).json({ message: 'Failed to process chat' });
      }
    }
  );

  // Tasks CRUD with enhanced validation
  app.get('/api/tasks', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const projectId = req.query.projectId as string | undefined;
      const filter: any = { userId };
      if (projectId) filter.projectId = projectId;
      const tasks = await TaskModel.find(filter).sort({ createdAt: -1 });
      res.json(tasks);
    } catch (error) {
      handleError(error as Error, 'Get Tasks');
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });

  app.post('/api/tasks',
    validateRequest([
      commonValidations.taskTitle,
      commonValidations.projectId,
      {
        field: 'description',
        required: false,
        type: 'string',
        maxLength: 1000
      },
      {
        field: 'priority',
        required: false,
        type: 'number',
        min: 0,
        max: 3
      },
      {
        field: 'estimatedPomodoros',
        required: false,
        type: 'number',
        min: 1,
        max: 20
      }
    ]),
    async (req, res) => {
      try {
        const userId = (req as any).userId;
        const taskData = { ...req.body, userId };
        const task = new TaskModel(taskData);
        await task.save();
        
        logger.info('Task created', { userId, taskId: task._id, title: task.title });
        res.json(task);
      } catch (error) {
        handleError(error as Error, 'Create Task');
        res.status(500).json({ message: 'Failed to create task' });
      }
    }
  );

  // Global error handler
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
        status: 'error'
      });
    }

    handleError(error, 'Express Error Handler');
    res.status(500).json({
      message: 'Internal server error',
      status: 'error'
    });
  });

  app.listen(port, () => {
    logger.info(`🌐 API server listening on http://localhost:${port}`);
  });

  return app;
}