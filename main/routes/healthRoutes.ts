import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  version: string;
}

router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check database connection
    const dbStartTime = Date.now();
    let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    let dbResponseTime: number | undefined;

    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        dbStatus = 'connected';
        dbResponseTime = Date.now() - dbStartTime;
      } else {
        dbStatus = 'disconnected';
      }
    } catch (error) {
      dbStatus = 'error';
      logger.error('Database health check failed', error);
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;

    const healthStatus: HealthStatus = {
      status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        responseTime: dbResponseTime
      },
      memory: {
        used: Math.round(usedMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      version: process.env.npm_package_version || '1.0.0'
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

router.get('/ping', (req: Request, res: Response) => {
  res.json({ 
    message: 'pong', 
    timestamp: new Date().toISOString() 
  });
});

export default router;