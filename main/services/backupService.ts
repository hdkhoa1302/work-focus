import { writeFile, readFile, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { promisify } from 'util';
import { TaskModel } from '../models/task';
import { ProjectModel } from '../models/project';
import { SessionModel } from '../models/session';
import { ConfigModel } from '../models/config';
import { ConversationModel } from '../models/conversation';
import { logger } from '../utils/logger';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    tasks: any[];
    projects: any[];
    sessions: any[];
    configs: any[];
    conversations: any[];
  };
}

class BackupService {
  private backupDir: string;

  constructor() {
    this.backupDir = join(app.getPath('userData'), 'backups');
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(userId: string): Promise<string> {
    try {
      logger.info('Creating backup for user', { userId });

      const [tasks, projects, sessions, configs, conversations] = await Promise.all([
        TaskModel.find({ userId }).lean(),
        ProjectModel.find({ userId }).lean(),
        SessionModel.find({ userId }).lean(),
        ConfigModel.find({ userId }).lean(),
        ConversationModel.find({ userId }).lean()
      ]);

      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: {
          tasks,
          projects,
          sessions,
          configs,
          conversations
        }
      };

      const filename = `backup-${userId}-${Date.now()}.json`;
      const filepath = join(this.backupDir, filename);

      await writeFileAsync(filepath, JSON.stringify(backupData, null, 2));

      logger.info('Backup created successfully', { userId, filename });
      return filepath;
    } catch (error) {
      logger.error('Failed to create backup', { userId, error });
      throw error;
    }
  }

  async restoreBackup(userId: string, backupPath: string): Promise<void> {
    try {
      logger.info('Restoring backup for user', { userId, backupPath });

      const backupContent = await readFileAsync(backupPath, 'utf-8');
      const backupData: BackupData = JSON.parse(backupContent);

      // Validate backup data
      if (!backupData.data || !backupData.version) {
        throw new Error('Invalid backup file format');
      }

      // Clear existing data for the user
      await Promise.all([
        TaskModel.deleteMany({ userId }),
        ProjectModel.deleteMany({ userId }),
        SessionModel.deleteMany({ userId }),
        ConfigModel.deleteMany({ userId }),
        ConversationModel.deleteMany({ userId })
      ]);

      // Restore data
      const restorePromises = [];

      if (backupData.data.tasks?.length > 0) {
        restorePromises.push(TaskModel.insertMany(backupData.data.tasks));
      }

      if (backupData.data.projects?.length > 0) {
        restorePromises.push(ProjectModel.insertMany(backupData.data.projects));
      }

      if (backupData.data.sessions?.length > 0) {
        restorePromises.push(SessionModel.insertMany(backupData.data.sessions));
      }

      if (backupData.data.configs?.length > 0) {
        restorePromises.push(ConfigModel.insertMany(backupData.data.configs));
      }

      if (backupData.data.conversations?.length > 0) {
        restorePromises.push(ConversationModel.insertMany(backupData.data.conversations));
      }

      await Promise.all(restorePromises);

      logger.info('Backup restored successfully', { userId });
    } catch (error) {
      logger.error('Failed to restore backup', { userId, error });
      throw error;
    }
  }

  async scheduleAutoBackup(userId: string, intervalHours: number = 24): Promise<void> {
    const intervalMs = intervalHours * 60 * 60 * 1000;

    const performBackup = async () => {
      try {
        await this.createBackup(userId);
        logger.info('Auto backup completed', { userId });
      } catch (error) {
        logger.error('Auto backup failed', { userId, error });
      }
    };

    // Perform initial backup
    await performBackup();

    // Schedule recurring backups
    setInterval(performBackup, intervalMs);

    logger.info('Auto backup scheduled', { userId, intervalHours });
  }
}

export const backupService = new BackupService();