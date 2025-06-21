import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { TaskModel } from './models/task';
import { SessionModel } from './models/session';
import { ConfigModel } from './models/config';
import { ConversationModel } from './models/conversation';
import { setupAuthRoutes, authenticateToken } from './auth';
import { ProjectModel } from './models/project';
import { chat } from './services/geminiService';
import { findAvailablePortWithInfo, suggestSolution, findOrReuseWorkFocusPort, PortConflictInfo } from './utils/port-checker';
import { setAPIConfig } from './config/api-config';

// Calculate daily workload utility function
const calculateDailyWorkload = (
  tasks: any[],
  workSchedule: {
    startTime: string;
    endTime: string;
    breakHours: number;
  }
): {
  isOverloaded: boolean;
  availableMinutes: number;
  requiredMinutes: number;
  overloadedMinutes: number;
} => {
  // Tính toán thời gian làm việc có sẵn trong ngày
  const [startHour, startMinute] = workSchedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = workSchedule.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  // Tính tổng thời gian làm việc trong ngày (trừ giờ nghỉ)
  const totalWorkMinutes = endMinutes - startMinutes - (workSchedule.breakHours * 60);
  
  // Tính tổng thời gian cần thiết cho các task
  let requiredMinutes = 0;
  
  tasks.forEach(task => {
    // Mỗi pomodoro là 25 phút
    requiredMinutes += (task.estimatedPomodoros || 1) * 25;
  });
  
  // Kiểm tra xem có đủ thời gian không
  const isOverloaded = requiredMinutes > totalWorkMinutes;
  const overloadedMinutes = Math.max(0, requiredMinutes - totalWorkMinutes);
  
  return {
    isOverloaded,
    availableMinutes: totalWorkMinutes,
    requiredMinutes,
    overloadedMinutes
  };
};

export async function setupAPI() {
  const app = express();
  const preferredPort = parseInt(process.env.API_PORT || '3000', 10);

  app.use(cors());
  app.use(bodyParser.json());

  // Health check endpoint (không cần auth)
  app.get('/api/health', (req, res) => {
    res.json({ 
      service: 'work-focus',
      app: 'work-focus',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Setup authentication routes
  setupAuthRoutes(app);

  // Middleware to protect routes (apply to all routes except auth)
  app.use('/api/tasks', authenticateToken);
  app.use('/api/sessions', authenticateToken);
  app.use('/api/config', authenticateToken);
  app.use('/api/projects', authenticateToken);
  app.use('/api/conversations', authenticateToken);

  // Conversation APIs
  app.get('/api/conversations', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const conversations = await ConversationModel.find({ userId }).sort({ updatedAt: -1 });
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', async (req, res) => {
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
      console.error('Error creating conversation:', error);
      res.status(500).json({ message: 'Failed to create conversation' });
    }
  });

  app.get('/api/conversations/:id', async (req, res) => {
    try {
      const userId = (req as any).userId;
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

  app.put('/api/conversations/:id/activate', async (req, res) => {
    try {
      const userId = (req as any).userId;
      
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

  app.delete('/api/conversations/:id', async (req, res) => {
    try {
      const userId = (req as any).userId;
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

  // Enhanced AI chat endpoint with comprehensive data integration
  app.post('/api/ai/chat', authenticateToken, async (req, res) => {
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

      // Get comprehensive user data for deep analysis
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

      // Calculate comprehensive productivity metrics
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      const focusSessions = sessions.filter(s => s.type === 'focus');
      const totalFocusTime = focusSessions.reduce((total, s) => total + (s.duration || 0), 0);
      const averageSessionLength = focusSessions.length > 0 ? totalFocusTime / focusSessions.length : 0;
      
      // Today's productivity metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const todayTasks = tasks.filter(t => 
        t.updatedAt && new Date(t.updatedAt) >= today && new Date(t.updatedAt) <= todayEnd
      );
      const todayCompletedTasks = todayTasks.filter(t => t.status === 'done').length;
      const todayFocusSessions = focusSessions.filter(s => 
        new Date(s.startTime) >= today && new Date(s.startTime) <= todayEnd
      );
      
      // Overdue and urgent tasks analysis
      const overdueTasks = tasks.filter(t => 
        t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done'
      );
      const urgentTasks = tasks.filter(t => {
        if (!t.deadline || t.status === 'done') return false;
        const daysUntilDeadline = Math.ceil((new Date(t.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDeadline <= 3 && daysUntilDeadline >= 0;
      });

      // Calculate daily workload
      const { isOverloaded, availableMinutes, requiredMinutes, overloadedMinutes } = calculateDailyWorkload(tasks.filter(t => t.status !== 'done'), workSchedule);

      // Prepare comprehensive context for AI
      const whiteboardSummary = whiteboardContext && whiteboardContext.length > 0 
        ? `\n\nWhiteboard hiện tại:\n${whiteboardContext.map((item: any) => 
            `- ${item.type}: "${item.title}" (${item.status}) - ${item.description}`
          ).join('\n')}`
        : '';

      const productivityContext = `
📊 PHÂN TÍCH NĂNG SUẤT TOÀN DIỆN:
• Tỷ lệ hoàn thành: ${completionRate.toFixed(1)}% (${completedTasks}/${totalTasks} tasks)
• Kinh nghiệm Pomodoro: ${focusSessions.length} phiên (${Math.round(totalFocusTime/60)} phút)
• Thời gian tập trung trung bình: ${Math.round(averageSessionLength/60)} phút/phiên
• Hôm nay: ${todayCompletedTasks} tasks hoàn thành, ${todayFocusSessions.length} phiên tập trung

⚠️ PHÂN TÍCH RỦI RO:
• Task quá hạn: ${overdueTasks.length} tasks
• Task khẩn cấp (<=3 ngày): ${urgentTasks.length} tasks
• Workload hôm nay: ${isOverloaded ? 'QUÁ TẢI' : 'BÌNH THƯỜNG'} (${Math.round(requiredMinutes/60)}h cần/${Math.round(availableMinutes/60)}h có)
${isOverloaded ? `• Vượt quá: ${Math.round(overloadedMinutes/60)} giờ` : ''}

🗓️ LỊCH LÀM VIỆC:
• Giờ làm việc: ${workSchedule.startTime} - ${workSchedule.endTime} (${workSchedule.hoursPerDay - workSchedule.breakHours}h thực)
• Nghỉ: ${workSchedule.breakHours}h/ngày
• Làm việc: ${workSchedule.daysPerWeek} ngày/tuần

📋 DỰ ÁN HIỆN TẠI:
${projects.map(p => `• ${p.name} (${p.status || 'active'}) - ${tasks.filter(t => t.projectId === p._id).length} tasks`).join('\n')}
`;

      let botResponse = '';
      let responseType = 'text';
      let responseData = null;

      // ENHANCED DETECTION: Smart Work Breakdown Mode
      const isWorkBreakdownRequest = (
        message.length > 100 && // Long message indicating complex work
        (
          // Explicit requests
          message.toLowerCase().includes('không biết bắt đầu') ||
          message.toLowerCase().includes('công việc lớn') ||
          message.toLowerCase().includes('không rõ ràng') ||
          message.toLowerCase().includes('phức tạp') ||
          message.toLowerCase().includes('hoang mang') ||
          message.toLowerCase().includes('bối rối') ||
          
          // Implicit indicators
          (message.toLowerCase().includes('cần làm') && message.length > 80) ||
          (message.toLowerCase().includes('dự án') && !message.toLowerCase().includes('tạo dự án')) ||
          (message.toLowerCase().includes('nhiệm vụ') && !message.toLowerCase().includes('task')) ||
          
          // Vague descriptions
          message.toLowerCase().includes('nhiều việc') ||
          message.toLowerCase().includes('phải làm gì') ||
          message.toLowerCase().includes('bắt đầu như thế nào')
        )
      );

      if (isWorkBreakdownRequest) {
        responseType = 'work_breakdown';
        
        const workBreakdownPrompt = `
🎯 BẠN LÀ CHUYÊN GIA PHÂN TÍCH CÔNG VIỆC & NĂNG SUẤT

NHIỆM VỤ: Phân tích công việc phức tạp/mơ hồ và tạo kế hoạch hành động cụ thể

MÔ TẢ TỪ NGƯỜI DÙNG: "${message}"

${productivityContext}

LỊCH SỬ CUỘC TRÒ CHUYỆN:
${conversationHistory}

${whiteboardSummary}

🧠 PHƯƠNG PHÁP PHÂN TÍCH KHOA HỌC:
1. **Eisenhower Matrix**: Phân loại theo độ quan trọng/khẩn cấp
2. **SMART Goals**: Mục tiêu cụ thể, đo lường được, khả thi
3. **Getting Things Done (GTD)**: Chia nhỏ thành next actions
4. **Flow State**: Xem xét năng lực và thách thức
5. **Pomodoro Integration**: Ước tính thời gian thực tế

🎯 YÊU CẦU PHÂN TÍCH:

**BƯỚC 1: PHÂN TÍCH & LÀNG RÕ**
- Xác định mục tiêu chính và kết quả mong đợi
- Phân tích các thành phần và phụ thuộc
- Đánh giá độ phức tạp và rủi ro dựa trên dữ liệu user

**BƯỚC 2: WORK BREAKDOWN STRUCTURE**
- Chia thành 3-7 phases rõ ràng
- Mỗi phase có 2-5 tasks cụ thể
- Ước tính Pomodoro dựa trên kinh nghiệm user (${Math.round(averageSessionLength/60)} phút/phiên)
- Sắp xếp thứ tự ưu tiên logic

**BƯỚC 3: TIMELINE & RISK ASSESSMENT**
- Dựa trên workload hiện tại (${isOverloaded ? 'OVERLOADED' : 'MANAGEABLE'})
- Xem xét deadline conflicts với ${urgentTasks.length} urgent tasks
- Đề xuất timeline realistic với work schedule

**BƯỚC 4: NEXT ACTIONS**
- 3 hành động cụ thể đầu tiên
- Estimation time cho mỗi action
- Prerequisites và resources cần thiết

**BƯỚC 5: CLARIFICATION QUESTIONS**
- Nếu thông tin chưa đủ, đặt 2-3 câu hỏi cụ thể
- Focus vào yếu tố quan trọng nhất chưa rõ

Trả về JSON với format:
{
  "analysisType": "work_breakdown",
  "workDescription": "Tóm tắt ngắn gọn công việc",
  "complexity": "low|medium|high",
  "riskLevel": "low|medium|high|critical",
  "phases": [
    {
      "name": "Tên phase",
      "description": "Mô tả chi tiết",
      "tasks": [
        {
          "title": "Task cụ thể với động từ",
          "description": "Mô tả chi tiết cách thực hiện",
          "estimatedPomodoros": 1-6,
          "priority": 1-3,
          "prerequisites": ["Điều kiện cần"],
          "deliverable": "Kết quả cụ thể"
        }
      ],
      "duration": "X ngày/tuần"
    }
  ],
  "nextActions": [
    {
      "action": "Hành động cụ thể đầu tiên",
      "timeEstimate": "X phút/giờ",
      "resources": ["Tài nguyên cần"]
    }
  ],
  "timeline": {
    "total": "Tổng thời gian",
    "startDate": "Ngày bắt đầu đề xuất",
    "milestones": ["Milestone 1", "Milestone 2"]
  },
  "riskFactors": ["Rủi ro 1", "Rủi ro 2"],
  "recommendations": ["Gợi ý 1", "Gợi ý 2"],
  "clarificationQuestions": ["Câu hỏi 1?", "Câu hỏi 2?"]
}

Chỉ trả về JSON, không thêm text khác.
`;

        try {
          const aiResponse = await chat({
            model: 'gemini-2.0-flash',
            contents: workBreakdownPrompt
          });

          const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            responseData = analysis;
            
            // Create comprehensive response
            const totalPomodoros = analysis.phases.reduce((total: number, phase: any) => 
              total + phase.tasks.reduce((phaseTotal: number, task: any) => phaseTotal + (task.estimatedPomodoros || 0), 0), 0
            );
            
            const totalHours = Math.round(totalPomodoros * 25 / 60 * 10) / 10;
            
            let clarificationText = '';
            if (analysis.clarificationQuestions && analysis.clarificationQuestions.length > 0) {
              clarificationText = `\n\n❓ **Để tối ưu hóa phân tích, tôi cần làm rõ:**\n${analysis.clarificationQuestions.map((q: string) => `• ${q}`).join('\n')}`;
            }

            botResponse = `🎯 **PHÂN TÍCH CÔNG VIỆC HOÀN TẤT!**

📋 **Công việc:** ${analysis.workDescription}
🎚️ **Độ phức tạp:** ${analysis.complexity === 'high' ? '🔴 Cao' : analysis.complexity === 'medium' ? '🟡 Trung bình' : '🟢 Thấp'}
⚠️ **Mức độ rủi ro:** ${analysis.riskLevel === 'critical' ? '🚨 Nghiêm trọng' : analysis.riskLevel === 'high' ? '🔴 Cao' : analysis.riskLevel === 'medium' ? '🟡 Trung bình' : '🟢 Thấp'}

⏱️ **Ước tính tổng thể:**
• ${totalPomodoros} Pomodoro sessions (≈ ${totalHours} giờ)
• Timeline: ${analysis.timeline.total}
• Bắt đầu: ${analysis.timeline.startDate}

🗂️ **KẾ HOẠCH THỰC HIỆN:**

${analysis.phases.map((phase: any, index: number) => `
**Phase ${index + 1}: ${phase.name}** ⏳ ${phase.duration}
${phase.description}

${phase.tasks.map((task: any, taskIndex: number) => `
   ${taskIndex + 1}. **${task.title}** 
      📝 ${task.description}
      ⏱️ ${task.estimatedPomodoros} Pomodoro | 🎯 Ưu tiên: ${task.priority === 3 ? 'Cao' : task.priority === 2 ? 'Trung bình' : 'Thấp'}
      📋 Kết quả: ${task.deliverable}
      ${task.prerequisites.length > 0 ? `🔧 Cần có: ${task.prerequisites.join(', ')}` : ''}
`).join('')}`).join('\n')}

🚀 **HÀNH ĐỘNG TIẾP THEO (Bắt đầu ngay!):**
${analysis.nextActions.map((action: any, index: number) => `
${index + 1}. **${action.action}**
   ⏱️ Thời gian: ${action.timeEstimate}
   🛠️ Cần có: ${action.resources.join(', ')}`).join('')}

📈 **Milestones quan trọng:**
${analysis.timeline.milestones.map((milestone: string) => `• ${milestone}`).join('\n')}

⚠️ **Các rủi ro cần lưu ý:**
${analysis.riskFactors.map((risk: string) => `• ${risk}`).join('\n')}

💡 **Gợi ý để thành công:**
${analysis.recommendations.map((rec: string) => `• ${rec}`).join('\n')}${clarificationText}

✅ **Sẵn sàng bắt đầu?** Hãy nói "Tạo kế hoạch này" để tôi tự động tạo dự án và tasks, hoặc yêu cầu điều chỉnh nếu cần!`;
          }
        } catch (error) {
          console.error('Work breakdown analysis failed:', error);
          botResponse = `❌ Có lỗi xảy ra khi phân tích. Tuy nhiên, dựa trên kinh nghiệm ${focusSessions.length} phiên Pomodoro của bạn, tôi đề xuất:

🎯 **Cách tiếp cận từng bước:**
1. **Xác định mục tiêu chính** - Bạn muốn đạt được gì cụ thể?
2. **Liệt kê tất cả thành phần** - Những việc nào cần làm?
3. **Chia nhỏ thành tasks 25-50 phút** - Dựa trên kinh nghiệm Pomodoro của bạn
4. **Sắp xếp thứ tự ưu tiên** - Việc nào quan trọng/khẩn cấp nhất?

Hãy mô tả chi tiết hơn để tôi có thể hỗ trợ tốt hơn!`;
        }
      }
      // Enhanced project creation with full data integration
      else if (message.toLowerCase().includes('tạo dự án') || 
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
          console.error('Analysis failed:', error);
          botResponse = '❌ Có lỗi xảy ra khi phân tích. Vui lòng mô tả rõ hơn về dự án bạn muốn thực hiện, bao gồm mục tiêu, phạm vi và thời gian dự kiến.';
        }
      }
      // Detect note creation intent
      else if (message.toLowerCase().includes('ghi nhớ') || 
               message.toLowerCase().includes('lưu ý') ||
               message.toLowerCase().includes('note') ||
               message.toLowerCase().includes('ghi chú') ||
               (message.toLowerCase().includes('quan trọng') && message.length > 20)) {
        
        const notePrompt = `
Phân tích tin nhắn sau và tạo ghi chú thông minh:

Tin nhắn: "${message}"

Lịch sử cuộc trò chuyện:
${conversationHistory}

${whiteboardSummary}

Hãy tạo một ghi chú có cấu trúc với:
1. Tiêu đề ngắn gọn, súc tích
2. Mô tả chi tiết nội dung cần ghi nhớ
3. Mức độ ưu tiên (1-3)
4. Các tag liên quan

Trả về JSON:
{
  "type": "note",
  "title": "Tiêu đề ghi chú",
  "description": "Mô tả chi tiết",
  "priority": 1-3,
  "tags": ["tag1", "tag2"],
  "status": "pending"
}

Chỉ trả về JSON, không thêm text khác.
`;

        try {
          const aiResponse = await chat({
            model: 'gemini-2.0-flash',
            contents: notePrompt
          });

          const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const noteData = JSON.parse(jsonMatch[0]);
            responseData = noteData;
            responseType = 'note';
            botResponse = `📝 **Đã tạo ghi chú mới!**

**${noteData.title}**

${noteData.description}

Ghi chú đã được thêm vào whiteboard của bạn. Bạn có thể xem và quản lý trong tab Whiteboard.`;
          }
        } catch (error) {
          console.error('Note creation failed:', error);
          botResponse = '❌ Có lỗi xảy ra khi tạo ghi chú. Vui lòng thử lại!';
        }
      }
      // Detect decision creation intent
      else if (message.toLowerCase().includes('quyết định') ||
               message.toLowerCase().includes('decision') ||
               message.toLowerCase().includes('chọn') ||
               message.toLowerCase().includes('lựa chọn') ||
               (message.includes('?') && message.length > 30)) {
        
        const decisionPrompt = `
Phân tích tin nhắn sau và tạo quyết định cần theo dõi:

Tin nhắn: "${message}"

Lịch sử cuộc trò chuyện:
${conversationHistory}

${whiteboardSummary}

Hãy tạo một mục quyết định với:
1. Tiêu đề mô tả quyết định cần đưa ra
2. Mô tả chi tiết các lựa chọn và yếu tố cần xem xét
3. Mức độ ưu tiên
4. Các tag liên quan

Trả về JSON:
{
  "type": "decision",
  "title": "Quyết định cần đưa ra",
  "description": "Mô tả chi tiết các lựa chọn và yếu tố",
  "priority": 1-3,
  "tags": ["tag1", "tag2"],
  "status": "pending"
}

Chỉ trả về JSON, không thêm text khác.
`;

        try {
          const aiResponse = await chat({
            model: 'gemini-2.0-flash',
            contents: decisionPrompt
          });

          const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const decisionData = JSON.parse(jsonMatch[0]);
            responseData = decisionData;
            responseType = 'decision';
            botResponse = `🤔 **Đã tạo mục quyết định mới!**

**${decisionData.title}**

${decisionData.description}

Quyết định đã được thêm vào whiteboard để bạn theo dõi. Hãy cập nhật trạng thái khi đã có quyết định cuối cùng.`;
          }
        } catch (error) {
          console.error('Decision creation failed:', error);
          botResponse = '❌ Có lỗi xảy ra khi tạo mục quyết định. Vui lòng thử lại!';
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
          } catch (error) {
            console.error('Failed to create project:', error);
            botResponse = '❌ Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại!';
          }
        } else {
          botResponse = '❌ Không tìm thấy thông tin dự án để tạo. Vui lòng mô tả lại dự án bạn muốn thực hiện.';
        }
      }
      // Handle "Tạo kế hoạch này" for work breakdown
      else if ((message.toLowerCase().includes('tạo kế hoạch') || 
                message.toLowerCase().includes('tạo kế hoạch này') || 
                message.toLowerCase().includes('bắt đầu thực hiện')) &&
               conversation.messages.length >= 2) {
        
        const lastMessage = conversation.messages[conversation.messages.length - 2];
        if (lastMessage?.from === 'bot' && lastMessage?.data?.analysisType === 'work_breakdown') {
          try {
            const analysis = lastMessage.data;
            
            // Create project from work breakdown
            const project = await ProjectModel.create({
              name: analysis.workDescription,
              description: `Dự án được tạo từ phân tích công việc phức tạp.\n\nTimeline: ${analysis.timeline.total}\nĐộ phức tạp: ${analysis.complexity}\nRủi ro: ${analysis.riskLevel}`,
              userId,
              estimatedHours: analysis.phases.reduce((total: number, phase: any) => 
                total + phase.tasks.reduce((phaseTotal: number, task: any) => phaseTotal + ((task.estimatedPomodoros || 0) * 25 / 60), 0), 0
              )
            });
            
            // Create tasks from all phases
            const createdTasks = [];
            let taskOrder = 1;
            
            for (const phase of analysis.phases) {
              // Create a phase comment/note task
              const phaseTask = await TaskModel.create({
                projectId: project._id,
                title: `📋 PHASE: ${phase.name}`,
                description: `${phase.description}\n\nDuration: ${phase.duration}\n\n--- Phase Tasks Below ---`,
                priority: 3,
                estimatedPomodoros: 1,
                userId,
                status: 'todo'
              });
              createdTasks.push(phaseTask);
              
              // Create actual tasks for this phase
              for (const task of phase.tasks) {
                const createdTask = await TaskModel.create({
                  projectId: project._id,
                  title: task.title,
                  description: `${task.description}\n\n📋 Deliverable: ${task.deliverable}\n${task.prerequisites.length > 0 ? `🔧 Prerequisites: ${task.prerequisites.join(', ')}` : ''}`,
                  priority: task.priority,
                  estimatedPomodoros: task.estimatedPomodoros,
                  userId,
                  status: 'todo'
                });
                createdTasks.push(createdTask);
                taskOrder++;
              }
            }

            responseType = 'work_breakdown_created';
            const totalPomodoros = createdTasks.reduce((total, task) => total + (task.estimatedPomodoros || 0), 0);
            const totalHours = Math.round(totalPomodoros * 25 / 60 * 10) / 10;
            
            botResponse = `🎉 **KẾ HOẠCH ĐÃ ĐƯỢC TẠO THÀNH CÔNG!**

📋 **Dự án:** ${project.name}
🗂️ **${createdTasks.length} tasks** đã được tạo theo ${analysis.phases.length} phases
⏱️ **Tổng thời gian:** ${totalPomodoros} Pomodoros (≈ ${totalHours} giờ)

**📊 Thống kê dự án:**
• Độ phức tạp: ${analysis.complexity === 'high' ? '🔴 Cao' : analysis.complexity === 'medium' ? '🟡 Trung bình' : '🟢 Thấp'}
• Mức độ rủi ro: ${analysis.riskLevel === 'critical' ? '🚨 Nghiêm trọng' : analysis.riskLevel === 'high' ? '🔴 Cao' : analysis.riskLevel === 'medium' ? '🟡 Trung bình' : '🟢 Thấp'}
• Timeline: ${analysis.timeline.total}

**🚀 BƯỚC TIẾP THEO:**

**Hành động ngay:**
${analysis.nextActions.map((action: any, index: number) => `${index + 1}. ${action.action} (${action.timeEstimate})`).join('\n')}

**💡 Lưu ý quan trọng:**
${analysis.riskFactors.map((risk: string) => `⚠️ ${risk}`).join('\n')}

**🎯 Gợi ý để thành công:**
${analysis.recommendations.map((rec: string) => `• ${rec}`).join('\n')}

✅ **Sẵn sàng bắt đầu!** Chuyển đến trang Tasks hoặc Projects để xem chi tiết và bắt đầu làm việc.

🔥 **Tip:** Bắt đầu với task đầu tiên trong Phase 1 để tạo momentum!`;
          } catch (error) {
            console.error('Failed to create work breakdown project:', error);
            botResponse = '❌ Có lỗi xảy ra khi tạo kế hoạch. Vui lòng thử lại!';
          }
        } else {
          botResponse = '❌ Không tìm thấy phân tích work breakdown để tạo kế hoạch. Vui lòng mô tả lại công việc bạn muốn thực hiện.';
        }
      }
      // General AI chat with comprehensive data integration
      else {
        const contextPrompt = `
🤖 BẠN LÀ AI AGENT QUẢN LÝ CÔNG VIỆC THÔNG MINH

NHIỆM VỤ: Trả lời câu hỏi dựa trên TOÀN BỘ dữ liệu thực tế của người dùng và áp dụng khoa học tâm lý.

TIN NHẮN: "${message}"

${productivityContext}

LỊCH SỬ CUỘC TRÒ CHUYỆN:
${conversationHistory}

${whiteboardSummary}

🧠 FRAMEWORK KHOA HỌC:

**1. SMART Goals Framework:**
- Specific: Mục tiêu cụ thể, rõ ràng
- Measurable: Đo lường được bằng Pomodoro/tasks
- Achievable: Khả thi dựa trên lịch sử ${completionRate.toFixed(1)}% hoàn thành
- Relevant: Liên quan đến dự án hiện tại
- Time-bound: Có deadline rõ ràng

**2. Flow State Theory (Csikszentmihalyi):**
- Cân bằng thách thức vs kỹ năng
- Tận dụng ${Math.round(averageSessionLength/60)} phút/phiên focus trung bình
- Loại bỏ distraction và interruption

**3. Pomodoro Technique Integration:**
- Dựa trên ${focusSessions.length} phiên kinh nghiệm
- Ước tính thời gian dựa trên pattern thực tế
- Break và focus cycle optimization

**4. Gamification & Achievement System:**
- Milestone tracking và celebration
- Progress visualization
- Streak và habit building

**5. Workload Management Science:**
- Capacity planning dựa trên work schedule
- Stress reduction qua priority matrix
- Energy management và optimal timing

🎯 YÊU CẦU TRẢ LỜI:

**Luôn bao gồm:**
1. **Phân tích dựa trên dữ liệu thực tế** của user
2. **Actionable advice** - hành động cụ thể có thể làm ngay
3. **Time estimation** dựa trên kinh nghiệm Pomodoro
4. **Risk assessment** nếu có workload issues
5. **Motivation & encouragement** dựa trên thành tích đã đạt

**Đặc biệt chú ý:**
- Nếu overloaded (${isOverloaded ? 'HIỆN TẠI' : 'không'}): Đề xuất giảm tải
- Nếu có urgent tasks (${urgentTasks.length}): Ưu tiên chúng
- Nếu hỏi về productivity: Sử dụng metrics cụ thể
- Nếu cần motivation: Cite thành tích đã đạt được

**Phong cách:**
- Thân thiện nhưng chuyên nghiệp
- Data-driven nhưng không khô khan
- Tích cực và solution-focused
- Cá nhân hóa dựa trên pattern của user

Trả lời bằng tiếng Việt, súc tích nhưng đầy đủ thông tin.
`;

        try {
          const aiResponse = await chat({
            model: 'gemini-2.0-flash',
            contents: contextPrompt
          });
          botResponse = aiResponse.text;
        } catch (error) {
          console.error('AI chat failed:', error);
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
      console.error('Error in AI chat:', error);
      res.status(500).json({ message: 'Failed to process chat' });
    }
  });

  // New proactive feedback endpoint
  app.post('/api/ai/proactive-feedback', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [tasks, sessions, projects] = await Promise.all([
        TaskModel.find({ userId }),
        SessionModel.find({ userId }),
        ProjectModel.find({ userId })
      ]);

      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      const focusSessions = sessions.filter(s => s.type === 'focus');
      const totalFocusTime = focusSessions.reduce((total, s) => total + (s.duration || 0), 0);
      
      const activeProjects = projects.filter(p => !p.completed).length;
      const today = new Date().toDateString();
      const todayPomodoros = focusSessions.filter(s => 
        new Date(s.startTime).toDateString() === today
      ).length;

      // Analyze patterns and generate proactive feedback
      const feedbackPrompt = `
Phân tích dữ liệu người dùng và đưa ra phản hồi chủ động dựa trên các nguyên tắc khoa học:

Dữ liệu hiện tại:
- Tổng task: ${totalTasks}, hoàn thành: ${completedTasks} (${completionRate.toFixed(1)}%)
- Dự án đang thực hiện: ${activeProjects}
- Tổng phiên Pomodoro: ${focusSessions.length}
- Pomodoro hôm nay: ${todayPomodoros}
- Thời gian tập trung: ${Math.round(totalFocusTime / 60)} phút

Áp dụng các phương pháp khoa học:
1. **Flow State Theory**: Đánh giá mức độ tập trung
2. **Goal Setting Theory**: Kiểm tra mục tiêu SMART
3. **Pomodoro Technique**: Hiệu quả quản lý thời gian
4. **Gamification**: Động lực và thành tích

Đưa ra:
1. Đánh giá tình trạng hiện tại (tích cực)
2. Phát hiện vấn đề tiềm ẩn (nếu có)
3. Gợi ý cải thiện cụ thể
4. Động viên và khuyến khích
5. Mục tiêu ngắn hạn

Trả lời ngắn gọn, tích cực và hành động được.
`;

      const aiResponse = await chat({
        model: 'gemini-2.0-flash',
        contents: feedbackPrompt
      });

      res.json({
        feedback: aiResponse.text,
        stats: {
          completionRate,
          todayPomodoros,
          activeProjects,
          totalFocusTime: Math.round(totalFocusTime / 60)
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error generating proactive feedback:', error);
      res.status(500).json({ message: 'Failed to generate feedback' });
    }
  });

  // Enhanced encouragement endpoint with achievement system
  app.post('/api/ai/encourage', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { taskId } = req.body;
      
      const task = await TaskModel.findOne({ _id: taskId, userId });
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const [project, userTasks, sessions] = await Promise.all([
        ProjectModel.findById(task.projectId),
        TaskModel.find({ userId }),
        SessionModel.find({ userId, type: 'focus' })
      ]);

      const completedTasks = userTasks.filter(t => t.status === 'done').length;
      const taskSessions = sessions.filter(s => s.taskId === taskId);
      const totalSessions = sessions.length;

      // Detect achievements
      const achievements = [];
      
      if (completedTasks === 1) achievements.push("🎉 First Task Completed!");
      if (completedTasks === 10) achievements.push("🏆 Task Master - 10 Tasks!");
      if (completedTasks === 50) achievements.push("🌟 Productivity Champion - 50 Tasks!");
      if (completedTasks % 25 === 0 && completedTasks > 0) achievements.push(`🎯 Milestone: ${completedTasks} Tasks Completed!`);
      
      if (totalSessions === 10) achievements.push("🔥 Pomodoro Beginner!");
      if (totalSessions === 50) achievements.push("⚡ Focus Master!");
      if (totalSessions === 100) achievements.push("🚀 Concentration Expert!");
      
      const today = new Date().toDateString();
      const todayTasks = userTasks.filter(t => 
        t.status === 'done' && 
        new Date(t.updatedAt || '').toDateString() === today
      ).length;
      
      if (todayTasks >= 3) achievements.push("📅 Daily Achiever!");
      if (todayTasks >= 5) achievements.push("🌟 Super Productive Day!");

      const encouragementPrompt = `
Tạo lời động viên cá nhân hóa cho người dùng vừa hoàn thành task:

Task vừa hoàn thành: "${task.title}"
Dự án: "${project?.name || 'Unknown'}"
Mô tả: "${task.description || 'Không có mô tả'}"

Thống kê thành tích:
- Tổng task hoàn thành: ${completedTasks}
- Tổng phiên Pomodoro: ${totalSessions}
- Phiên Pomodoro cho task này: ${taskSessions.length}
- Task hoàn thành hôm nay: ${todayTasks}

Thành tích mới đạt được: ${achievements.length > 0 ? achievements.join(', ') : 'Không có'}

Tạo lời động viên bao gồm:
1. Chúc mừng cụ thể và nhiệt tình
2. Nhận xét về nỗ lực và kỹ năng thể hiện
3. Liên hệ với mục tiêu lớn hơn
4. Động lực cho bước tiếp theo
5. Sử dụng emoji phù hợp

Phong cách: Tích cực, cá nhân hóa, khuyến khích, dựa trên khoa học tâm lý.
Độ dài: 3-5 câu, ngắn gọn nhưng ý nghĩa.
`;

      const aiResponse = await chat({
        model: 'gemini-2.0-flash',
        contents: encouragementPrompt
      });

      res.json({
        message: aiResponse.text,
        achievements: achievements,
        stats: {
          completedTasks,
          totalSessions,
          todayTasks,
          taskSessions: taskSessions.length
        }
      });
    } catch (error) {
      console.error('Error generating encouragement:', error);
      res.status(500).json({ 
        message: '🎉 Chúc mừng bạn đã hoàn thành task! Tiếp tục phát huy nhé!',
        achievements: [],
        stats: {}
      });
    }
  });

  // AI suggest endpoint - Đề xuất ưu tiên công việc
  app.post('/api/ai/suggest', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const userTasks = await TaskModel.find({ userId }).sort({ deadline: 1 });
      
      // Tính điểm ưu tiên cho mỗi task
      const prioritizedTasks = userTasks.map(task => {
        let priorityScore = 0;
        
        // Ưu tiên theo deadline
        if (task.deadline) {
          const deadline = new Date(task.deadline);
          const today = new Date();
          const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
          
          if (daysLeft <= 0) priorityScore += 10; // Quá hạn
          else if (daysLeft <= 1) priorityScore += 8; // Còn 1 ngày
          else if (daysLeft <= 3) priorityScore += 6; // Còn 3 ngày
          else if (daysLeft <= 7) priorityScore += 4; // Còn 1 tuần
          else priorityScore += 2; // Còn nhiều thời gian
        }
        
        // Ưu tiên theo priority field nếu có
        if (task.priority) {
          priorityScore += task.priority;
        }
        
        // Status (todo > in-progress > done)
        if (task.status === 'todo') priorityScore += 3;
        else if (task.status === 'in-progress') priorityScore += 2;
        else if (task.status === 'done') priorityScore -= 5; // Giảm điểm cho task đã hoàn thành
        
        return {
          ...task.toObject(),
          priorityScore
        };
      });
      
      // Sắp xếp theo điểm ưu tiên
      prioritizedTasks.sort((a, b) => b.priorityScore - a.priorityScore);
      
      res.json({ tasks: prioritizedTasks });
    } catch (error) {
      console.error('Error suggesting tasks:', error);
      res.status(500).json({ message: 'Failed to suggest tasks' });
    }
  });

  // AI analysis endpoint - Phân tích hiệu suất người dùng
  app.post('/api/ai/analyze', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const [tasks, sessions, projects] = await Promise.all([
        TaskModel.find({ userId }),
        SessionModel.find({ userId }),
        ProjectModel.find({ userId })
      ]);

      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      const focusSessions = sessions.filter(s => s.type === 'focus');
      const totalFocusTime = focusSessions.reduce((total, s) => total + (s.duration || 0), 0);
      
      const activeProjects = projects.filter(p => !p.completed).length;
      const completedProjects = projects.filter(p => p.completed).length;

      // Tạo phân tích bằng AI
      const analysisPrompt = `
Phân tích hiệu suất làm việc của người dùng dựa trên các phương pháp khoa học:

Thống kê:
- Tổng số task: ${totalTasks}
- Task hoàn thành: ${completedTasks}
- Tỷ lệ hoàn thành: ${completionRate.toFixed(1)}%
- Dự án đang thực hiện: ${activeProjects}
- Dự án hoàn thành: ${completedProjects}
- Tổng thời gian tập trung: ${Math.round(totalFocusTime / 60)} phút
- Số phiên Pomodoro: ${focusSessions.length}

Áp dụng các lý thuyết:
1. **Flow State Theory**: Đánh giá khả năng tập trung
2. **Goal Achievement Theory**: Hiệu quả đạt mục tiêu
3. **Time Management**: Quản lý thời gian
4. **Productivity Psychology**: Tâm lý năng suất

Hãy đưa ra:
1. Đánh giá tổng quan về hiệu suất (dựa trên dữ liệu)
2. Điểm mạnh đã thể hiện (cụ thể)
3. Những điểm cần cải thiện (xây dựng)
4. Gợi ý cụ thể để nâng cao hiệu quả (khoa học)
5. Lời động viên tích cực và mục tiêu tiếp theo

Trả lời bằng tiếng Việt, thân thiện và có cấu trúc rõ ràng.
`;

      const aiResponse = await chat({
        model: 'gemini-2.0-flash',
        contents: analysisPrompt
      });

      res.json({
        stats: {
          totalTasks,
          completedTasks,
          completionRate,
          activeProjects,
          completedProjects,
          totalFocusTime: Math.round(totalFocusTime / 60),
          totalSessions: focusSessions.length
        },
        analysis: aiResponse.text,
        recommendations: [
          completionRate < 50 ? 'Tập trung hoàn thành các task đã tạo' : null,
          activeProjects > 5 ?  'Giảm số dự án đang thực hiện' : null,
          focusSessions.length < 10 ? 'Tăng cường sử dụng Pomodoro' : null
        ].filter(Boolean)
      });
    } catch (error) {
      console.error('Error analyzing performance:', error);
      res.status(500).json({ message: 'Failed to analyze performance' });
    }
  });

  // Project Progress Analysis
  app.get('/api/projects/:id/progress', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const projectId = req.params.id;
      
      // Get project, tasks, and sessions
      const [project, tasks, sessions, config] = await Promise.all([
        ProjectModel.findOne({ _id: projectId, userId }),
        TaskModel.find({ projectId, userId }),
        SessionModel.find({ userId }),
        ConfigModel.findOne({ userId })
      ]);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Default work schedule if not set
      const workSchedule = config?.workSchedule || {
        hoursPerDay: 8,
        daysPerWeek: 5,
        startTime: '09:00',
        endTime: '17:00',
        breakHours: 1,
        overtimeRate: 1.5
      };
      
      // Calculate project stats
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      // Calculate time stats
      const projectSessions = sessions.filter(s => 
        s.type === 'focus' && 
        s.taskId &&
        tasks.some(t => t._id.toString() === s.taskId?.toString())
      );
      
      const totalActualHours = projectSessions.reduce((total, s) => total + (s.duration || 0), 0) / 3600;
      
      // Calculate estimated hours from tasks if project doesn't have it
      const totalEstimatedHours = project.estimatedHours || 
        tasks.reduce((total, t) => total + ((t.estimatedPomodoros || 1) * 25 / 60), 0);
      
      // Calculate remaining work
      const remainingHours = Math.max(0, totalEstimatedHours - totalActualHours);
      
      // Calculate deadline info
      let daysRemaining = 0;
      let requiredDailyHours = 0;
      let overtimeRequired = 0;
      let isOnTrack = true;
      let riskLevel = 'low';
      
      if (project.deadline) {
        const now = new Date();
        const deadline = new Date(project.deadline);
        const diffTime = deadline.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        // Calculate working days remaining
        const workingDaysRemaining = Math.max(1, Math.round(daysRemaining * (workSchedule.daysPerWeek / 7)));
        
        // Calculate required hours per day
        requiredDailyHours = remainingHours / workingDaysRemaining;
        
        // Calculate if overtime is required
        const availableWorkingHours = workingDaysRemaining * workSchedule.hoursPerDay;
        overtimeRequired = Math.max(0, remainingHours - availableWorkingHours);
        
        // Determine if project is on track
        isOnTrack = requiredDailyHours <= workSchedule.hoursPerDay;
        
        // Determine risk level
        if (daysRemaining === 0 && remainingHours > 0) {
          riskLevel = 'critical';
        } else if (requiredDailyHours > workSchedule.hoursPerDay * 1.5) {
          riskLevel = 'high';
        } else if (requiredDailyHours > workSchedule.hoursPerDay) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'low';
        }
      }
      
      // Generate recommendations
      const recommendations = [];
      
      if (riskLevel === 'critical') {
        recommendations.push('Cân nhắc đàm phán lại deadline hoặc giảm phạm vi dự án');
        recommendations.push('Tập trung vào các task quan trọng nhất để đảm bảo giá trị cốt lõi');
      }
      
      if (riskLevel === 'high' || riskLevel === 'medium') {
        recommendations.push('Cần làm thêm giờ để kịp tiến độ');
        recommendations.push('Ưu tiên các task có giá trị cao nhất trước');
      }
      
      if (completionPercentage < 30 && daysRemaining < totalTasks) {
        recommendations.push('Tốc độ hoàn thành task hiện tại quá chậm so với deadline');
      }
      
      if (tasks.filter(t => t.status === 'in-progress').length > 3) {
        recommendations.push('Đang có quá nhiều task đang thực hiện cùng lúc, nên tập trung hoàn thành từng task');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Dự án đang tiến triển tốt, tiếp tục duy trì nhịp độ hiện tại');
      }
      
      res.json({
        project,
        tasks,
        sessions: projectSessions,
        analysis: {
          totalEstimatedHours,
          totalActualHours,
          completionPercentage,
          remainingHours,
          isOnTrack,
          daysRemaining,
          requiredDailyHours,
          overtimeRequired,
          riskLevel,
          recommendations
        },
        workSchedule
      });
    } catch (error) {
      console.error('Error analyzing project progress:', error);
      res.status(500).json({ message: 'Failed to analyze project progress' });
    }
  });

  // Daily Tasks API
  app.get('/api/daily-tasks', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const dateParam = req.query.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      
      // Set to start of day
      date.setHours(0, 0, 0, 0);
      
      // Get end of day
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      // Get tasks with deadlines on the specified date
      const tasksWithDeadline = await TaskModel.find({
        userId,
        deadline: { $gte: date, $lte: endDate },
        status: { $ne: 'done' }
      }).sort({ priority: -1 });
      
      // Get tasks in progress without deadline
      const tasksInProgress = await TaskModel.find({
        userId,
        status: 'in-progress',
        $or: [
          { deadline: { $exists: false } },
          { deadline: null },
          { deadline: { $gt: endDate } }
        ]
      }).sort({ priority: -1 });
      
      // Get projects with deadlines approaching (within 3 days)
      const threeDay = new Date(date);
      threeDay.setDate(date.getDate() + 3);
      
      const projects = await ProjectModel.find({
        userId,
        deadline: { $gte: date, $lte: threeDay },
        completed: false
      }).sort({ deadline: 1 });
      
      // Get today's completed tasks
      const completedToday = await TaskModel.find({
        userId,
        status: 'done',
        updatedAt: { $gte: date, $lte: endDate }
      });
      
      // Get today's sessions
      const todaySessions = await SessionModel.find({
        userId,
        startTime: { $gte: date, $lte: endDate }
      });
      
      const focusSessions = todaySessions.filter(s => s.type === 'focus');
      const totalFocusTime = focusSessions.reduce((total, s) => total + (s.duration || 0), 0);
      
      res.json({
        date: date.toISOString(),
        tasksWithDeadline,
        tasksInProgress,
        projects,
        stats: {
          tasksWithDeadline: tasksWithDeadline.length,
          tasksInProgress: tasksInProgress.length,
          projectsWithDeadline: projects.length,
          completedToday: completedToday.length,
          focusSessions: focusSessions.length,
          totalFocusTime: Math.round(totalFocusTime / 60) // in minutes
        }
      });
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      res.status(500).json({ message: 'Failed to fetch daily tasks' });
    }
  });

  // Tasks CRUD
  app.get('/api/tasks', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const projectId = req.query.projectId as string | undefined;
      const filter: any = { userId };
      if (projectId) filter.projectId = projectId;
      const tasks = await TaskModel.find(filter).sort({ createdAt: -1 });
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const taskData = { ...req.body, userId };
      if (!taskData.projectId) {
        return res.status(400).json({ message: 'projectId is required' });
      }
      const task = new TaskModel(taskData);
      await task.save();
      res.json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Failed to create task' });
    }
  });

  app.put('/api/tasks/:id', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const task = await TaskModel.findOneAndUpdate(
        { _id: req.params.id, userId },
        req.body,
        { new: true }
      );
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Nếu task được đánh dấu hoàn thành, tạo động viên
      if (req.body.status === 'done') {
        try {
          const encouragementResponse = await fetch(`http://localhost:${port}/api/ai/encourage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization || ''
            },
            body: JSON.stringify({ taskId: task._id })
          });
          
          if (encouragementResponse.ok) {
            const encouragement = await encouragementResponse.json();
            // Có thể gửi notification hoặc lưu vào database
            console.log('Encouragement generated:', encouragement.message);
          }
        } catch (error) {
          console.error('Failed to generate encouragement:', error);
        }
      }

      res.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Failed to update task' });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const task = await TaskModel.findOneAndDelete({ _id: req.params.id, userId });
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Failed to delete task' });
    }
  });

  // Sessions
  app.get('/api/sessions', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const sessions = await SessionModel.find({ userId }).sort({ startTime: -1 });
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ message: 'Failed to fetch sessions' });
    }
  });

  app.post('/api/sessions', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const session = new SessionModel({ ...req.body, userId });
      await session.save();
      res.json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ message: 'Failed to create session' });
    }
  });

  // Config
  app.get('/api/config', async (req, res) => {
    try {
      const userId = (req as any).userId;
      let config = await ConfigModel.findOne({ userId });
      if (!config) {
        config = new ConfigModel({ userId });
        await config.save();
      }
      res.json(config);
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({ message: 'Failed to fetch config' });
    }
  });

  app.post('/api/config', async (req, res) => {
    try {
      const userId = (req as any).userId;
      let config = await ConfigModel.findOne({ userId });
      if (config) {
        Object.assign(config, req.body);
        await config.save();
      } else {
        config = new ConfigModel({ ...req.body, userId });
        await config.save();
      }
      res.json(config);
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ message: 'Failed to update config' });
    }
  });

  // Projects CRUD
  app.get('/api/projects', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const projects = await ProjectModel.find({ userId }).sort({ createdAt: -1 });
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const projectData = { ...req.body, userId };
      if (!projectData.name) {
        return res.status(400).json({ message: 'Project name is required' });
      }
      const project = new ProjectModel(projectData);
      await project.save();
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Failed to create project' });
    }
  });

  app.put('/api/projects/:id', async (req, res) => {
    try {
      const userId = (req as any).userId;
      // Cho phép cập nhật name, completed và status
      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.completed !== undefined) updateData.completed = req.body.completed;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.deadline !== undefined) updateData.deadline = req.body.deadline;
      if (req.body.estimatedHours !== undefined) updateData.estimatedHours = req.body.estimatedHours;
      if (req.body.actualHours !== undefined) updateData.actualHours = req.body.actualHours;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.priority !== undefined) updateData.priority = req.body.priority;
      
      const project = await ProjectModel.findOneAndUpdate(
        { _id: req.params.id, userId },
        updateData,
        { new: true }
      );
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ message: 'Failed to update project' });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const userId = (req as any).userId;
      const project = await ProjectModel.findOneAndDelete({ _id: req.params.id, userId });
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      // Xóa các task thuộc project này
      await TaskModel.deleteMany({ projectId: project._id });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: 'Failed to delete project' });
    }
  });

  // Tìm port khả dụng hoặc sử dụng lại Work Focus service
  let port: number;
  let isReusing = false;
  try {
    const result = await findOrReuseWorkFocusPort(preferredPort);
    port = result.port;
    isReusing = result.isReusing;
    
    if (isReusing) {
      console.log(`✅ Đã phát hiện Work Focus service đang chạy ở port ${port}, sử dụng lại service này`);
      // Không cần khởi động server mới, chỉ cập nhật config
      setAPIConfig(port);
      return { server: null, port, isReusing: true };
    } else if (port !== preferredPort) {
      console.log(`⚠️  Port ${preferredPort} đã bị sử dụng, chuyển sang port ${port}`);
      
      // Hiển thị thông tin chi tiết về các port bị xung đột
      if (result.conflicts.length > 0) {
        console.log('📋 Thông tin các port đã bị sử dụng:');
        result.conflicts.forEach((conflict: PortConflictInfo) => {
          if (conflict.processInfo) {
            const { pid, name, cmd } = conflict.processInfo;
            console.log(`   Port ${conflict.port}: ${name} (PID: ${pid}) - ${cmd}`);
            
            // Hiển thị gợi ý giải pháp
            const suggestions = suggestSolution(conflict);
            if (suggestions.length > 0) {
              console.log(`   💡 Gợi ý: ${suggestions[0]}`);
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Lỗi khi tìm port khả dụng:', error);
    throw error;
  }

  // Update API config với port đã xác định
  setAPIConfig(port);
  
  // Khởi động server với error handling
  const server = app.listen(port, () => {
    console.log(`🌐 API server listening on http://localhost:${port}`);
    console.log(`✅ Server khởi động thành công tại port ${port}`);
  });

  // Xử lý lỗi server
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} đã bị sử dụng. Vui lòng thử khởi động lại ứng dụng.`);
    } else {
      console.error('❌ Lỗi khởi động API server:', error);
    }
    process.exit(1);
  });

  return { server, port, isReusing: false };
}