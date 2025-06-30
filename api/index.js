const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { connectDB } = require('./utils/db');
const { authenticateToken } = require('./middleware/auth');
const { setupAuthRoutes } = require('./routes/auth');
const { setupTaskRoutes } = require('./routes/tasks');
const { setupProjectRoutes } = require('./routes/projects');
const { setupConversationRoutes } = require('./routes/conversations');
const { setupConfigRoutes } = require('./routes/config');
const { setupSessionRoutes } = require('./routes/sessions');
const { setupChatRoutes } = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    service: 'work-focus-api',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Debug endpoint để kiểm tra env và DB connection
app.get('/api/debug', async (req, res) => {
  try {
    const { connectDB } = require('./utils/db');
    
    // Kiểm tra environment variables (không show giá trị thực)
    const envStatus = {
      MONGO_URI: !!process.env.MONGO_URI,
      JWT_SECRET: !!process.env.JWT_SECRET,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL
    };

    // Test database connection
    let dbStatus = 'disconnected';
    let dbError = null;
    
    try {
      const connected = await connectDB();
      dbStatus = connected ? 'connected' : 'failed';
    } catch (error) {
      dbStatus = 'error';
      dbError = error.message;
    }

    res.json({
      message: 'Debug information',
      environment: envStatus,
      database: {
        status: dbStatus,
        error: dbError
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Debug endpoint error',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Work Focus API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      tasks: '/api/tasks',
      projects: '/api/projects',
      conversations: '/api/conversations',
      config: '/api/config',
      sessions: '/api/sessions',
      chat: '/api/ai/chat'
    }
  });
});

// Setup routes
setupAuthRoutes(app);
setupTaskRoutes(app, authenticateToken);
setupProjectRoutes(app, authenticateToken);
setupConversationRoutes(app, authenticateToken);
setupConfigRoutes(app, authenticateToken);
setupSessionRoutes(app, authenticateToken);
setupChatRoutes(app, authenticateToken);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    const dbConnected = await connectDB();
    if (!dbConnected) {
      console.warn('⚠️ API server khởi động mà không có database connection');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Work Focus API server đang chạy tại port ${PORT}`);
      console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Lỗi khởi động server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Nhận tín hiệu SIGTERM, đang tắt server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Nhận tín hiệu SIGINT, đang tắt server...');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 