import { Router, IRouter } from 'express';
import * as usersController from './users.controller';
import { authenticate, authorize } from '../../middlewares/auth';

const router: IRouter = Router();

router.get('/me', authenticate, usersController.getMe);
router.get('/', authenticate, authorize('PRINCIPAL'), usersController.getAllUsers);
router.get('/:id', authenticate, authorize('PRINCIPAL'), usersController.getUserById);

export default router;
