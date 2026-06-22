import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getEnv } from '../config/env';
import { FileType } from '../types';

// multer-s3 loaded dynamically to avoid type issues when not in use
let multerS3: any = null;
try { multerS3 = require('multer-s3'); } catch { /* local storage only */ }

export interface FileInfo {
  fileType: FileType;
  mimeType: string;
}

export const ALLOWED_MIME_TYPES: Record<string, FileInfo> = {
  'image/jpeg':   { fileType: 'IMAGE', mimeType: 'image/jpeg' },
  'image/png':    { fileType: 'IMAGE', mimeType: 'image/png' },
  'image/gif':    { fileType: 'IMAGE', mimeType: 'image/gif' },
  'image/webp':   { fileType: 'IMAGE', mimeType: 'image/webp' },
  'application/pdf': { fileType: 'PDF', mimeType: 'application/pdf' },
  'video/mp4':    { fileType: 'VIDEO', mimeType: 'video/mp4' },
  'video/webm':   { fileType: 'VIDEO', mimeType: 'video/webm' },
  'video/ogg':    { fileType: 'VIDEO', mimeType: 'video/ogg' },
  'video/quicktime': { fileType: 'VIDEO', mimeType: 'video/quicktime' },
  'application/msword': { fileType: 'DOCUMENT', mimeType: 'application/msword' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { fileType: 'DOCUMENT', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'application/vnd.ms-powerpoint': { fileType: 'DOCUMENT', mimeType: 'application/vnd.ms-powerpoint' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { fileType: 'DOCUMENT', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
};

export function getFileType(mimeType: string): FileType {
  return ALLOWED_MIME_TYPES[mimeType]?.fileType ?? 'DOCUMENT';
}

export function getMaxSize(mimeType: string): number {
  const env = getEnv();
  const fileType = getFileType(mimeType);
  switch (fileType) {
    case 'IMAGE':    return env.MAX_IMAGE_SIZE;
    case 'PDF':      return env.MAX_PDF_SIZE;
    case 'VIDEO':    return env.MAX_VIDEO_SIZE;
    case 'DOCUMENT': return env.MAX_DOC_SIZE;
    default:         return env.MAX_DOC_SIZE;
  }
}

function generateFileName(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase();
  return `${uuidv4()}${ext}`;
}

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(
      `File type not allowed: ${file.mimetype}. Allowed types: images (jpg, png, gif, webp), PDF, video (mp4, webm), documents (doc, docx, ppt, pptx)`
    ));
  }
}

function createLocalStorage(uploadDir: string): multer.StorageEngine {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, generateFileName(file.originalname)),
  });
}

function createS3Storage(bucket: string): multer.StorageEngine {
  const { getS3Client } = require('../config/storage');
  const s3 = getS3Client();
  return multerS3({
    s3,
    bucket,
    key: (_req: any, file: Express.Multer.File, cb: (err: any, key: string) => void) =>
      cb(null, `uploads/${generateFileName(file.originalname)}`),
    contentType: multerS3.AUTO_CONTENT_TYPE,
  });
}

export function createUploader(): multer.Multer {
  const env = getEnv();
  const storage =
    env.STORAGE_TYPE === 's3' && env.R2_BUCKET_NAME && multerS3
      ? createS3Storage(env.R2_BUCKET_NAME)
      : createLocalStorage(env.UPLOAD_DIR);

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: env.MAX_VIDEO_SIZE },
  });
}
