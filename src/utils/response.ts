import { Response } from 'express';

interface Meta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export function sendSuccess(res: Response, data?: unknown, message?: string, meta?: Meta): void {
  res.status(200).json({ success: true, message, data, meta });
}

export function sendCreated(res: Response, data?: unknown, message?: string): void {
  res.status(201).json({ success: true, message, data });
}

export function sendError(res: Response, statusCode: number, message: string, errors?: unknown): void {
  res.status(statusCode).json({ success: false, message, errors });
}
