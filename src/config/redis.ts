import Redis from 'ioredis';
import { getEnv } from './env';
import { logger } from '../utils/logger';

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  return _redis;
}

export async function connectRedis(): Promise<void> {
  const { REDIS_URL } = getEnv();
  if (!REDIS_URL) {
    logger.warn('REDIS_URL not set — caching disabled');
    return;
  }
  try {
    _redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await _redis.connect();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn('Redis connection failed — continuing without cache');
    _redis = null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    return _redis ? await _redis.get(key) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  try {
    if (!_redis) return;
    if (ttlSeconds) {
      await _redis.setex(key, ttlSeconds, value);
    } else {
      await _redis.set(key, value);
    }
  } catch {
    // silent
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    if (_redis) await _redis.del(key);
  } catch {
    // silent
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    if (!_redis) return;
    const keys = await _redis.keys(pattern);
    if (keys.length > 0) await _redis.del(...keys);
  } catch {
    // silent
  }
}

export const CacheKeys = {
  liveContent: (teacherId: string, subject: string) => `live:${teacherId}:${subject}`,
  analytics: (type: string) => `analytics:${type}`,
  studentClasses: (studentId: string) => `student:classes:${studentId}`,
};
