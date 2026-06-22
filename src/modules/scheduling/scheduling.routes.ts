import { Router, IRouter, Request, Response, NextFunction } from 'express';
import * as schedulingService from './scheduling.service';
import { sendSuccess } from '../../utils/response';
import { authenticate, authorize } from '../../middlewares/auth';
import { publicApiLimiter } from '../../middlewares/rateLimiter';
import { userRepo } from '../../repositories/user.repo';
import { NotFoundError } from '../../utils/errors';

const router: IRouter = Router();

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

/**
 * Public endpoint — no auth required.
 * GET /api/content/live/:teacherId?subject=maths
 */
router.get(
  '/live/:teacherId',
  publicApiLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { teacherId } = req.params;
      const subject = qs(req.query.subject as string | string[]);

      const teacher = await userRepo.findById(teacherId);

      if (!teacher || teacher.role !== 'TEACHER') {
        res.status(200).json({ success: true, message: 'No content available', data: [], teacher: null });
        return;
      }

      const liveContent = await schedulingService.getLiveContent(teacherId, subject);

      if (liveContent.length === 0) {
        res.status(200).json({
          success: true,
          message: 'No content available',
          data: [],
          teacher: { id: teacher.id, name: teacher.name },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Live content retrieved',
        data: liveContent,
        teacher: { id: teacher.id, name: teacher.name },
      });
    } catch (err) { next(err); }
  }
);

/**
 * Authenticated: view rotation schedule for a teacher
 * GET /api/content/schedule/:teacherId
 */
router.get(
  '/schedule/:teacherId',
  authenticate,
  authorize('PRINCIPAL', 'TEACHER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { teacherId } = req.params;
      const subject = qs(req.query.subject as string | string[]);

      if (req.user!.role === 'TEACHER' && req.user!.userId !== teacherId) {
        throw new NotFoundError('Schedule not found');
      }

      const schedule = await schedulingService.getRotationSchedule(teacherId, subject);
      sendSuccess(res, schedule, 'Rotation schedule retrieved');
    } catch (err) { next(err); }
  }
);

export default router;
