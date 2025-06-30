const { ProjectModel } = require('../models/project');
const { TaskModel } = require('../models/task');
const { SessionModel } = require('../models/session');

function setupProjectRoutes(app, authenticateToken) {
  // Get projects
  app.get('/api/projects', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const projects = await ProjectModel.find({ userId }).sort({ createdAt: -1 });
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  // Create project
  app.post('/api/projects', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const projectData = { ...req.body, userId };
      
      const project = new ProjectModel(projectData);
      await project.save();
      
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Failed to create project' });
    }
  });

  // Get project by ID
  app.get('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const project = await ProjectModel.findOne({ _id: req.params.id, userId });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ message: 'Failed to fetch project' });
    }
  });

  // Update project
  app.put('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const project = await ProjectModel.findOneAndUpdate(
        { _id: req.params.id, userId },
        req.body,
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

  // Delete project
  app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const project = await ProjectModel.findOneAndDelete({ _id: req.params.id, userId });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Delete all related tasks
      await TaskModel.deleteMany({ projectId: req.params.id, userId });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: 'Failed to delete project' });
    }
  });

  // Get project progress analysis
  app.get('/api/projects/:id/progress', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const projectId = req.params.id;
      
      const project = await ProjectModel.findOne({ _id: projectId, userId });
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      const tasks = await TaskModel.find({ projectId, userId });
      const sessions = await SessionModel.find({ userId, taskId: { $in: tasks.map(t => t._id) } });
      
      // Calculate analysis
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const totalEstimatedHours = tasks.reduce((total, task) => 
        total + ((task.estimatedPomodoros || 0) * 25 / 60), 0
      );
      const totalActualHours = sessions.reduce((total, session) => 
        total + ((session.duration || 0) / 60), 0
      );
      
      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const remainingHours = Math.max(0, totalEstimatedHours - totalActualHours);
      
      // Calculate days remaining
      let daysRemaining = 0;
      if (project.deadline) {
        const now = new Date();
        const deadline = new Date(project.deadline);
        daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      const analysis = {
        totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
        totalActualHours: Math.round(totalActualHours * 100) / 100,
        completionPercentage: Math.round(completionPercentage * 100) / 100,
        remainingHours: Math.round(remainingHours * 100) / 100,
        isOnTrack: completionPercentage >= 50 || remainingHours <= totalEstimatedHours * 0.5,
        daysRemaining,
        requiredDailyHours: daysRemaining > 0 ? Math.round((remainingHours / daysRemaining) * 100) / 100 : 0,
        overtimeRequired: 0,
        riskLevel: completionPercentage < 25 ? 'high' : completionPercentage < 50 ? 'medium' : 'low',
        recommendations: [
          'Tập trung vào các task có độ ưu tiên cao',
          'Sử dụng kỹ thuật Pomodoro để tăng hiệu suất',
          'Cập nhật tiến độ thường xuyên'
        ]
      };
      
      res.json({
        project,
        tasks,
        sessions,
        analysis,
        workSchedule: {
          hoursPerDay: 8,
          daysPerWeek: 5,
          startTime: '09:00',
          endTime: '17:00',
          breakHours: 1,
          overtimeRate: 1.5
        }
      });
    } catch (error) {
      console.error('Error fetching project progress:', error);
      res.status(500).json({ message: 'Failed to fetch project progress' });
    }
  });
}

module.exports = { setupProjectRoutes }; 