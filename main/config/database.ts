import mongoose from 'mongoose';
import { config as loadEnv } from 'dotenv';
import { logger } from '../utils/logger';
import { handleError } from '../utils/errorHandler';

loadEnv();

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

const getDatabaseConfig = (): DatabaseConfig => {
  const uri = process.env.MONGO_URI;
  
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  return {
    uri,
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    }
  };
};

export const connectDB = async (): Promise<void> => {
  try {
    const config = getDatabaseConfig();
    
    mongoose.connection.on('connected', () => {
      logger.info('✅ MongoDB Atlas connected successfully');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error during MongoDB disconnection:', error);
        process.exit(1);
      }
    });

    await mongoose.connect(config.uri, config.options);
  } catch (error) {
    handleError(error as Error, 'Database Connection');
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('Database disconnected successfully');
  } catch (error) {
    handleError(error as Error, 'Database Disconnection');
    throw error;
  }
};