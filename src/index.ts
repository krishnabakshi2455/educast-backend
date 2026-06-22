import 'dotenv/config';
import { loadEnv } from './config/env';

// Load and validate env first
const env = loadEnv();

import { createApp } from './app';
import { prisma } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';



async function bootstrap() {
  // Connect to Redis (non-blocking)
  await connectRedis();

  // Test database connection
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error('Database connection failed', { error: err });
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 EduRotor API v2.0 running on port ${env.PORT}`);
    logger.info(`📁 Storage: ${env.STORAGE_TYPE}`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err });
    process.exit(1);
  });
}

bootstrap();
