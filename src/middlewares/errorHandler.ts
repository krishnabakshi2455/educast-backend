import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Request error', {
    method: req.method,
    url: req.url,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Validation error',
      errors: err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof Error && err.message.includes('File too large')) {
    res.status(400).json({ success: false, message: 'File size exceeds the allowed limit' });
    return;
  }

  if (err instanceof Error && err.message.includes('LIMIT_UNEXPECTED_FILE')) {
    res.status(400).json({ success: false, message: 'Unexpected file field' });
    return;
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
}
