// @ts-ignore — Prisma client is generated at runtime via `prisma generate`
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

(prisma as any).$on('error', (e: { message: string }) => {
  logger.error('Prisma error', { message: e.message });
});

(prisma as any).$on('warn', (e: { message: string }) => {
  logger.warn('Prisma warning', { message: e.message });
});

export { prisma };