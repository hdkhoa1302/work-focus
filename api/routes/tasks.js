const { TaskModel } = require('../models/task');
const { SessionModel } = require('../models/session');

function setupTaskRoutes(app, authenticateToken) {
  // Get tasks
  app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const { projectId } = req.query;
      
      const query = { userId };
      if (projectId) query.projectId = projectId;
      
      const tasks = await TaskModel.find(query)
        .populate('projectId', 'name')
        .sort({ createdAt: -1 });
        
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });

  // Create task
  app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const taskData = { ...req.body, userId };
      
      const task = new TaskModel(taskData);
      await task.save();
      
      const populatedTask = await TaskModel.findById(task._id).populate('projectId', 'name');
      res.status(201).json(populatedTask);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Failed to create task' });
    }
  });

  // Get task by ID
  app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const task = await TaskModel.findOne({ _id: req.params.id, userId })
        .populate('projectId', 'name');
        
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({ message: 'Failed to fetch task' });
    }
  });

  // Update task
  app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const task = await TaskModel.findOneAndUpdate(
        { _id: req.params.id, userId },
        req.body,
        { new: true }
      ).populate('projectId', 'name');
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Failed to update task' });
    }
  });

  // Delete task
  app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
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

  // Get daily tasks
  app.get('/api/tasks/daily/:date?', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const date = req.params.date ? new Date(req.params.date) : new Date();
      
      // Set date range for today
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get tasks with deadline today or overdue
      const tasksWithDeadline = await TaskModel.find({
        userId,
        deadline: { $lte: endOfDay },
        status: { $ne: 'done' }
      }).populate('projectId', 'name').sort({ deadline: 1 });
      
      // Get tasks in progress
      const tasksInProgress = await TaskModel.find({
        userId,
        status: 'in-progress'
      }).populate('projectId', 'name').sort({ updatedAt: -1 });
      
      // Get completed tasks today
      const completedToday = await TaskModel.countDocuments({
        userId,
        status: 'done',
        updatedAt: { $gte: startOfDay, $lte: endOfDay }
      });
      
      // Get focus sessions today
      const focusSessions = await SessionModel.find({
        userId,
        type: 'focus',
        startTime: { $gte: startOfDay, $lte: endOfDay }
      });
      
      const totalFocusTime = focusSessions.reduce((total, session) => 
        total + (session.duration || 0), 0
      );
      
      res.json({
        date: date.toISOString().split('T')[0],
        tasksWithDeadline,
        tasksInProgress,
        stats: {
          tasksWithDeadline: tasksWithDeadline.length,
          tasksInProgress: tasksInProgress.length,
          completedToday,
          focusSessions: focusSessions.length,
          totalFocusTime: Math.round(totalFocusTime / 60) // Convert to minutes
        }
      });
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      res.status(500).json({ message: 'Failed to fetch daily tasks' });
    }
  });
}

module.exports = { setupTaskRoutes }; 