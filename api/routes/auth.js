const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { UserModel } = require('../models/user');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = '7d';

function setupAuthRoutes(app) {
  // Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Create user
      const user = new UserModel({ name, email, password });
      await user.save();

      // Generate JWT
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user
      const user = await UserModel.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Validate token
  app.get('/api/auth/validate', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
      const user = await UserModel.findById(req.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      });
    } catch (error) {
      console.error('Token validation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update profile
  app.put('/api/auth/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
      const { name, avatar } = req.body;
      const userId = req.userId;

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (name) user.name = name;
      if (avatar !== undefined) user.avatar = avatar;

      await user.save();

      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

module.exports = { setupAuthRoutes }; 