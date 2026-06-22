import { Router, IRouter, Request, Response, NextFunction } from 'express';
import * as analyticsService from './analytics.service';
import { sendSuccess } from '../../utils/response';
import { authenticate, authorize } from '../../middlewares/auth';

const router: IRouter = Router();

router.get('/principal', authenticate, authorize('PRINCIPAL'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await analyticsService.getPrincipalStats(req.user!.userId, req.user!.schoolId);
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
});

router.get('/teacher', authenticate, authorize('TEACHER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await analyticsService.getTeacherStats(req.user!.userId);
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
});

router.get('/student', authenticate, authorize('STUDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await analyticsService.getStudentStats(req.user!.userId);
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
});

router.get('/subjects', authenticate, authorize('PRINCIPAL'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await analyticsService.getSubjectAnalytics(req.user!.schoolId);
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
});

export default router;
