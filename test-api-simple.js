const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check called');
  res.json({ 
    service: 'work-focus',
    app: 'work-focus',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'disconnected'
  });
});

// Simple auth endpoint (no database)
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { email, password } = req.body;
  
  // Mock user for testing
  if (email === 'test@test.com' && password === 'test123') {
    res.json({
      message: 'Login successful',
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@test.com'
      },
      token: 'fake-jwt-token-for-testing'
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

app.listen(port, () => {
  console.log(`🌐 Simple API server listening on http://localhost:${port}`);
  console.log('✅ Test server khởi động thành công');
  console.log('📝 Test login: email=test@test.com, password=test123');
});

app.on('error', (error) => {
  console.error('🚨 Server Error:', error);
}); 