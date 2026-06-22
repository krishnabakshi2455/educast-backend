import { Request, Response, NextFunction } from 'express';
import * as contentService from './content.service';
import { uploadContentSchema, contentQuerySchema } from './content.schema';
import { sendSuccess, sendCreated } from '../../utils/response';
import { BadRequestError } from '../../utils/errors';

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

export async function uploadContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) throw new BadRequestError('File is required');
    const dto = uploadContentSchema.parse(req.body);
    const content = await contentService.uploadContent(req.user!.userId, dto, req.file, req);
    sendCreated(res, content, 'Content uploaded successfully and pending approval');
  } catch (err) { next(err); }
}

export async function getMyContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = contentQuerySchema.parse(req.query);
    const result = await contentService.getTeacherContent(req.user!.userId, filters);
    sendSuccess(res, result.items, undefined, {
      total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages,
    });
  } catch (err) { next(err); }
}

export async function getAllContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = contentQuerySchema.parse(req.query);
    const result = await contentService.getAllContent(req.user!.schoolId, filters);
    sendSuccess(res, result.items, undefined, {
      total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages,
    });
  } catch (err) { next(err); }
}

export async function getContentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const content = await contentService.getContentById(req.params.id, req.user!.userId, req.user!.role);
    sendSuccess(res, content);
  } catch (err) { next(err); }
}

export async function deleteContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await contentService.deleteContent(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Content deleted successfully');
  } catch (err) { next(err); }
}

export async function getStudentContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subject = qs(req.query.subject as string | string[]);
    const content = await contentService.getStudentContent(req.user!.userId, subject);
    sendSuccess(res, content);
  } catch (err) { next(err); }
}
