import { Router, IRouter, Request, Response, NextFunction } from 'express';
import * as approvalService from './approval.service';
import { sendSuccess } from '../../utils/response';
import { authenticate, authorize } from '../../middlewares/auth';

const router: IRouter = Router();

router.use(authenticate, authorize('PRINCIPAL'));

router.get('/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(Array.isArray(req.query.page) ? req.query.page[0] : (req.query.page ?? 1));
    const limit = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : (req.query.limit ?? 20));
    const result = await approvalService.getPendingContent(req.user!.schoolId, page, limit);
    sendSuccess(res, result.items, undefined, {
      total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages,
    });
  } catch (err) { next(err); }
});

router.patch('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = approvalService.approveSchema.parse(req.body);
    const content = await approvalService.approveContent(req.params.id, req.user!.userId, body.remarks);
    sendSuccess(res, content, 'Content approved successfully');
  } catch (err) { next(err); }
});

router.patch('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = approvalService.rejectSchema.parse(req.body);
    const content = await approvalService.rejectContent(req.params.id, req.user!.userId, body.reason);
    sendSuccess(res, content, 'Content rejected');
  } catch (err) { next(err); }
});

export default router;
