import { logger } from './logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (error: Error, context?: string) => {
  const errorContext = context ? `[${context}]` : '';
  
  if (error instanceof AppError) {
    logger.error(`${errorContext} Operational Error: ${error.message}`, {
      statusCode: error.statusCode,
      stack: error.stack
    });
  } else {
    logger.error(`${errorContext} Unexpected Error: ${error.message}`, {
      stack: error.stack
    });
  }
};

export const asyncHandler = (fn: Function) => {
  return (...args: any[]) => {
    Promise.resolve(fn(...args)).catch((error) => {
      handleError(error, 'AsyncHandler');
    });
  };
};