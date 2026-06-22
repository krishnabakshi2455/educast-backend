import { Request, Response, NextFunction } from 'express';
import * as classesService from './classes.service';
import { assignTeacherSchema } from './classes.schema';
import { sendSuccess, sendCreated } from '../../utils/response';

export async function getClassById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cls = await classesService.getClassById(req.params.id, req.user!.userId);
    sendSuccess(res, cls);
  } catch (err) { next(err); }
}

export async function assignTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = assignTeacherSchema.parse(req.body);
    const result = await classesService.assignTeacher(req.params.id, req.user!.userId, dto);
    sendCreated(res, result, 'Teacher assigned successfully');
  } catch (err) { next(err); }
}

export async function removeTeacherAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await classesService.removeTeacherAssignment(req.params.assignmentId, req.user!.userId);
    sendSuccess(res, null, 'Teacher assignment removed successfully');
  } catch (err) { next(err); }
}

export async function getMyClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user!.role === 'TEACHER') {
      const classes = await classesService.getTeacherClasses(req.user!.userId);
      sendSuccess(res, classes);
    } else {
      const cls = await classesService.getStudentClass(req.user!.userId);
      sendSuccess(res, cls);
    }
  } catch (err) { next(err); }
}
