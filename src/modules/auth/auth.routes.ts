import { Router, IRouter } from 'express';
import * as authController from './auth.controller';
import { authLimiter } from '../../middlewares/rateLimiter';

const router: IRouter = Router();

// Principal creates a brand new school (no School ID needed — one is generated)
router.post('/schools/register', authLimiter, authController.createSchoolAndRegister);

// Role-specific logins — all three require School ID
router.post('/login/principal', authLimiter, authController.loginPrincipal);
router.post('/login/teacher', authLimiter, authController.loginTeacher);
router.post('/login/student', authLimiter, authController.loginStudent);

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
