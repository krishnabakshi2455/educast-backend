import { S3Client } from '@aws-sdk/client-s3';
import { getEnv } from './env';

let _s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (_s3Client) return _s3Client;

  const env = getEnv();

  if (env.STORAGE_TYPE !== 's3') {
    throw new Error('S3 storage not configured');
  }

  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }

  _s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return _s3Client;
}

export function getPublicUrl(key: string): string {
  const env = getEnv();
  if (env.STORAGE_TYPE === 's3' && env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL}/${key}`;
  }
  return `/uploads/${key}`;
}
