import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).userId;
    return userId || req.ip || req.connection.remoteAddress || 'unknown';
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();
      
      if (!this.store[key] || this.store[key].resetTime < now) {
        this.store[key] = {
          count: 1,
          resetTime: now + this.windowMs
        };
      } else {
        this.store[key].count++;
      }

      const remaining = Math.max(0, this.maxRequests - this.store[key].count);
      const resetTime = Math.ceil((this.store[key].resetTime - now) / 1000);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      });

      if (this.store[key].count > this.maxRequests) {
        throw new AppError('Too many requests, please try again later', 429);
      }

      next();
    };
  }
}

// Create different rate limiters for different endpoints
export const generalLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const authLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 auth attempts per 15 minutes
export const aiLimiter = new RateLimiter(60 * 1000, 10); // 10 AI requests per minute