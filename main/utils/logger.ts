import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

class Logger {
  private logStream: NodeJS.WritableStream | null = null;
  private logDir: string;

  constructor() {
    this.logDir = join(app.getPath('userData'), 'logs');
    this.initializeLogger();
  }

  private initializeLogger() {
    try {
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true });
      }

      const logFile = join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = createWriteStream(logFile, { flags: 'a' });
    } catch (error) {
      console.error('Failed to initialize logger:', error);
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
  }

  info(message: string, meta?: any) {
    const formatted = this.formatMessage('info', message, meta);
    console.log(formatted.trim());
    this.logStream?.write(formatted);
  }

  error(message: string, meta?: any) {
    const formatted = this.formatMessage('error', message, meta);
    console.error(formatted.trim());
    this.logStream?.write(formatted);
  }

  warn(message: string, meta?: any) {
    const formatted = this.formatMessage('warn', message, meta);
    console.warn(formatted.trim());
    this.logStream?.write(formatted);
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message, meta);
      console.debug(formatted.trim());
      this.logStream?.write(formatted);
    }
  }
}

export const logger = new Logger();