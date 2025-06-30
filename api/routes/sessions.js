const { SessionModel } = require('../models/session');

function setupSessionRoutes(app, authenticateToken) {
  // Get sessions
  app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const sessions = await SessionModel.find({ userId })
        .populate('taskId', 'title')
        .sort({ startTime: -1 });
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ message: 'Failed to fetch sessions' });
    }
  });

  // Create session
  app.post('/api/sessions', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const sessionData = { ...req.body, userId };
      
      const session = new SessionModel(sessionData);
      await session.save();
      
      const populatedSession = await SessionModel.findById(session._id).populate('taskId', 'title');
      res.status(201).json(populatedSession);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ message: 'Failed to create session' });
    }
  });

  // Update session
  app.put('/api/sessions/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const session = await SessionModel.findOneAndUpdate(
        { _id: req.params.id, userId },
        req.body,
        { new: true }
      ).populate('taskId', 'title');
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({ message: 'Failed to update session' });
    }
  });

  // Delete session
  app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId;
      const session = await SessionModel.findOneAndDelete({ _id: req.params.id, userId });
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ message: 'Failed to delete session' });
    }
  });
}

module.exports = { setupSessionRoutes };