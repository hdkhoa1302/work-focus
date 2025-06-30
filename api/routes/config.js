const { ConfigModel } = require('../models/config');

function setupConfigRoutes(app, authenticateToken) {
  // Get config
  app.get('/api/config', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      let config = await ConfigModel.findOne({ userId });
      
      if (!config) {
        // Create default config
        config = new ConfigModel({
          userId,
          pomodoro: { focus: 25, break: 5 },
          blockList: { hosts: [], apps: [] },
          notifications: { enabled: true, sound: true },
          workSchedule: {
            hoursPerDay: 8,
            daysPerWeek: 5,
            startTime: '09:00',
            endTime: '17:00',
            breakHours: 1,
            overtimeRate: 1.5
          }
        });
        await config.save();
      }
      
      res.json(config);
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({ message: 'Failed to fetch config' });
    }
  });

  // Save config
  app.post('/api/config', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const configData = { ...req.body, userId };
      
      const config = await ConfigModel.findOneAndUpdate(
        { userId },
        configData,
        { new: true, upsert: true }
      );
      
      res.json(config);
    } catch (error) {
      console.error('Error saving config:', error);
      res.status(500).json({ message: 'Failed to save config' });
    }
  });
}

module.exports = { setupConfigRoutes }; 