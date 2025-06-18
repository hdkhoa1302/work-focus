import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth';
import { backupService } from '../services/backupService';
import { validateRequest, commonValidations } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errorHandler';

const router = Router();

// Apply rate limiting and authentication to all backup routes
router.use(generalLimiter.middleware());
router.use(authenticateToken);

// Create backup
router.post('/create', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const backupPath = await backupService.createBackup(userId);
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      backupPath
    });
  } catch (error) {
    logger.error('Backup creation failed', { error, userId: (req as any).userId });
    throw new AppError('Failed to create backup', 500);
  }
});

// Restore backup
router.post('/restore', 
  validateRequest([
    {
      field: 'backupPath',
      required: true,
      type: 'string'
    }
  ]),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { backupPath } = req.body;
      
      await backupService.restoreBackup(userId, backupPath);
      
      res.json({
        success: true,
        message: 'Backup restored successfully'
      });
    } catch (error) {
      logger.error('Backup restoration failed', { error, userId: (req as any).userId });
      throw new AppError('Failed to restore backup', 500);
    }
  }
);

// Schedule auto backup
router.post('/schedule',
  validateRequest([
    {
      field: 'intervalHours',
      required: false,
      type: 'number',
      min: 1,
      max: 168 // Max 1 week
    }
  ]),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { intervalHours = 24 } = req.body;
      
      await backupService.scheduleAutoBackup(userId, intervalHours);
      
      res.json({
        success: true,
        message: `Auto backup scheduled every ${intervalHours} hours`
      });
    } catch (error) {
      logger.error('Auto backup scheduling failed', { error, userId: (req as any).userId });
      throw new AppError('Failed to schedule auto backup', 500);
    }
  }
);

export default router;