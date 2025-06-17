import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { TaskModel } from './models/task';
import { SessionModel } from './models/session';
import { ConfigModel } from './models/config';
import { setupAuthRoutes, authenticateToken } from './auth';
import { ProjectModel } from './models/project';
import { chat } from './services/geminiService';

export function setupAPI() {
  const app = express();
  const port = process.env.API_PORT || 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Setup authentication routes
  setupAuthRoutes(app);

  // Middleware to protect routes (apply to all routes except auth)
  app.use('/api/tasks', authenticateToken);
  app.use('/api/sessions', authenticateToken);
  app.use('/api/config', authenticateToken);
  app.use('/api/projects', authenticateToken);

  // AI chat endpoint
  app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    try {
      const { model, contents, generationConfig } = req.body;
      const result = await chat({ model, contents, generationConfig });
      res.json(result);
    } catch (error) {
      console.error('Error chatting with AI:', error);
      res.status(500).json({ message: 'Failed to chat with AI' });
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
Phân tích hiệu suất làm việc của người dùng:

Thống kê:
- Tổng số task: ${totalTasks}
- Task hoàn thành: ${completedTasks}
- Tỷ lệ hoàn thành: ${completionRate.toFixed(1)}%
- Dự án đang thực hiện: ${activeProjects}
- Dự án hoàn thành: ${completedProjects}
- Tổng thời gian tập trung: ${Math.round(totalFocusTime / 60)} phút
- Số phiên Pomodoro: ${focusSessions.length}

Hãy đưa ra:
1. Đánh giá tổng quan về hiệu suất
2. Điểm mạnh đã thể hiện
3. Những điểm cần cải thiện
4. Gợi ý cụ thể để nâng cao hiệu quả
5. Lời động viên tích cực

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
          activeProjects > 5 ? 'Giảm số dự án đang thực hiện' : null,
          focusSessions.length < 10 ? 'Tăng cường sử dụng Pomodoro' : null
        ].filter(Boolean)
      });
    } catch (error) {
      console.error('Error analyzing performance:', error);
      res.status(500).json({ message: 'Failed to analyze performance' });
    }
  });

  // AI encouragement endpoint - Động viên khi hoàn thành task
  app.post('/api/ai/encourage', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { taskId } = req.body;
      
      const task = await TaskModel.findOne({ _id: taskId, userId });
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const project = await ProjectModel.findById(task.projectId);
      const userTasks = await TaskModel.find({ userId });
      const completedTasks = userTasks.filter(t => t.status === 'done').length;
      const sessions = await SessionModel.find({ userId, type: 'focus' });

      const encouragementPrompt = `
Người dùng vừa hoàn thành task: "${task.title}"
Thuộc dự án: "${project?.name || 'Unknown'}"

Thống kê hiện tại:
- Tổng task hoàn thành: ${completedTasks}
- Tổng phiên Pomodoro: ${sessions.length}
- Mô tả task: ${task.description || 'Không có mô tả'}

Hãy tạo lời động viên bao gồm:
1. Lời chúc mừng nhiệt tình và cụ thể
2. Nhận xét về thành tích (nếu đáng chú ý)
3. Động lực cho bước tiếp theo
4. Emoji phù hợp để tạo không khí tích cực

Trả lời ngắn gọn, tích cực và cá nhân hóa.
`;

      const aiResponse = await chat({
        model: 'gemini-2.0-flash',
        contents: encouragementPrompt
      });

      res.json({
        message: aiResponse.text,
        achievement: completedTasks % 5 === 0 ? `Milestone: ${completedTasks} tasks completed!` : null
      });
    } catch (error) {
      console.error('Error generating encouragement:', error);
      res.status(500).json({ 
        message: '🎉 Chúc mừng bạn đã hoàn thành task! Tiếp tục phát huy nhé!' 
      });
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
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: 'Project name is required' });
      }
      const project = new ProjectModel({ name, userId });
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

  app.listen(port, () => {
    console.log(`🌐 API server listening on http://localhost:${port}`);
  });
}