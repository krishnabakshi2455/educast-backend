import path from 'path';
import fs from 'fs';
import { getEnv } from '../../config/env';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { getFileType, getMaxSize } from '../../middlewares/upload';
import { UploadContentDto } from './content.schema';
import { cacheDelPattern } from '../../config/redis';
import { contentRepo } from '../../repositories/content.repo';
import { userRepo } from '../../repositories/user.repo';

function buildFileUrl(req: any, filePath: string): string {
  const filename = path.basename(filePath);
  const host = req.get?.('host') ?? 'localhost:3000';
  const protocol = req.protocol ?? 'http';
  return `${protocol}://${host}/uploads/${filename}`;
}

export async function uploadContent(
  teacherId: string,
  dto: UploadContentDto,
  file: Express.Multer.File,
  req: any
) {
  const env = getEnv();
  const isS3 = env.STORAGE_TYPE === 's3';

  const maxSize = getMaxSize(file.mimetype);
  if (file.size > maxSize) {
    if (!isS3 && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new BadRequestError(
      `File too large. Max size for this type: ${Math.round(maxSize / 1024 / 1024)}MB`
    );
  }

  if (dto.classId) {
    // Teacher must hold at least one subject assignment on this class
    const assignment = await contentRepo.findClassAssignmentForTeacher(dto.classId, teacherId);
    if (!assignment) {
      if (!isS3 && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new ForbiddenError('You are not assigned to this class');
    }
  }

  const fileType = getFileType(file.mimetype);
  const fileUrl = isS3 ? (file as any).location : buildFileUrl(req, file.path);
  const filePath = isS3 ? (file as any).key : file.path;

  const content = await contentRepo.create({
    title: dto.title,
    description: dto.description,
    subject: dto.subject,
    classId: dto.classId,
    fileUrl,
    filePath,
    fileType,
    fileSize: file.size,
    originalName: file.originalname,
    mimeType: file.mimetype,
    uploadedBy: teacherId,
    status: 'PENDING',
    startTime: dto.startTime ? new Date(dto.startTime) : undefined,
    endTime: dto.endTime ? new Date(dto.endTime) : undefined,
    rotationDuration: dto.rotationDuration ?? 5,
  });

  await cacheDelPattern(`live:${teacherId}:*`);
  return content;
}

export async function getTeacherContent(teacherId: string, filters: any) {
  const { status, subject, classId, fileType, page, limit } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (subject) where.subject = { contains: subject, mode: 'insensitive' };
  if (classId) where.classId = classId;
  if (fileType) where.fileType = fileType;

  const [items, total] = await Promise.all([
    contentRepo.findByTeacher(teacherId, where, skip, limit),
    contentRepo.countByTeacher(teacherId, where),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getAllContent(schoolId: string, filters: any) {
  const { status, subject, classId, fileType, page, limit } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (subject) where.subject = { contains: subject, mode: 'insensitive' };
  if (classId) where.classId = classId;
  if (fileType) where.fileType = fileType;

  const [items, total] = await Promise.all([
    contentRepo.findAllBySchool(schoolId, where, skip, limit),
    contentRepo.countAllBySchool(schoolId, where),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getContentById(id: string, userId: string, role: string) {
  const content = await contentRepo.findByIdFull(id);
  if (!content) throw new NotFoundError('Content not found');
  if (role === 'TEACHER' && content.uploadedBy !== userId) throw new ForbiddenError('Access denied');
  return content;
}

export async function deleteContent(id: string, teacherId: string) {
  const content = await contentRepo.findById(id);
  if (!content) throw new NotFoundError('Content not found');
  if (content.uploadedBy !== teacherId) throw new ForbiddenError('Access denied');
  if (content.status === 'APPROVED') throw new BadRequestError('Cannot delete approved content');

  const env = getEnv();
  if (env.STORAGE_TYPE === 's3' && content.filePath) {
    try {
      const { getS3Client } = require('../../config/storage');
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await getS3Client().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME!, Key: content.filePath }));
    } catch { /* silent */ }
  } else if (content.filePath && fs.existsSync(content.filePath)) {
    fs.unlinkSync(content.filePath);
  }

  await contentRepo.delete(id);
  await cacheDelPattern(`live:${teacherId}:*`);
}

/**
 * Student content feed — students now have a single classId directly on
 * their User record (no join table). Returns approved content for that
 * class within its active time window.
 */
export async function getStudentContent(studentId: string, subject?: string) {
  const student = await userRepo.findById(studentId);
  if (!student?.classId) return [];

  const now = new Date();
  const where: any = {};
  if (subject) where.subject = { contains: subject, mode: 'insensitive' };
  where.OR = [{ startTime: null }, { startTime: { lte: now } }];
  where.AND = [{ OR: [{ endTime: null }, { endTime: { gte: now } }] }];

  return contentRepo.findByClassId(student.classId, where);
}
