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