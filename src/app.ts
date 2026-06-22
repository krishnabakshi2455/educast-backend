import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { getEnv } from './config/env';
import { generalLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import schoolsRoutes from './modules/schools/schools.routes';
import classesRoutes from './modules/classes/classes.routes';
import contentRoutes from './modules/content/content.routes';
import approvalRoutes from './modules/approval/approval.routes';
import schedulingRoutes from './modules/scheduling/scheduling.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

export function createApp(): Application {
  const app = express();
  const env = getEnv();

  // Security
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Parsing & compression
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  app.use('/api', generalLimiter);

  // Serve uploaded files (local storage only)
  if (env.STORAGE_TYPE === 'local') {
    app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/schools', schoolsRoutes);
  app.use('/api/classes', classesRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/approval', approvalRoutes);
  app.use('/api/content', schedulingRoutes);   // /api/content/live/:teacherId
  app.use('/api/analytics', analyticsRoutes);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
