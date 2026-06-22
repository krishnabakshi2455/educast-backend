import { z } from 'zod';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { cacheDelPattern } from '../../config/redis';
import { contentRepo } from '../../repositories/content.repo';

export const approveSchema = z.object({
  remarks: z.string().optional(),
});

export const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export async function getPendingContent(schoolId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    contentRepo.findPendingBySchool(schoolId, skip, limit),
    contentRepo.countPendingBySchool(schoolId),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function approveContent(contentId: string, principalId: string, remarks?: string) {
  const content = await contentRepo.findById(contentId);
  if (!content) throw new NotFoundError('Content not found');
  if (content.status !== 'PENDING') {
    throw new BadRequestError(`Content is already ${(content.status as string).toLowerCase()}`);
  }

  const updated = await contentRepo.update(contentId, {
    status: 'APPROVED',
    approvedBy: principalId,
    approvedAt: new Date(),
    rejectionReason: remarks ?? null,
  });

  await cacheDelPattern(`live:${content.uploadedBy}:*`);
  return updated;
}

export async function rejectContent(contentId: string, principalId: string, reason: string) {
  const content = await contentRepo.findById(contentId);
  if (!content) throw new NotFoundError('Content not found');
  if (content.status !== 'PENDING') {
    throw new BadRequestError(`Content is already ${(content.status as string).toLowerCase()}`);
  }

  const updated = await contentRepo.update(contentId, {
    status: 'REJECTED',
    rejectionReason: reason,
    approvedBy: principalId,
    approvedAt: new Date(),
  });

  await cacheDelPattern(`live:${content.uploadedBy}:*`);
  return updated;
}
