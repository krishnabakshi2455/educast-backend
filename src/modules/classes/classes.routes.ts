import { Router, IRouter } from 'express';
import * as classesController from './classes.controller';
import { authenticate, authorize } from '../../middlewares/auth';

const router: IRouter = Router();

// My class(es) — Teacher gets a list of assignments, Student gets their single class
router.get('/my', authenticate, authorize('TEACHER', 'STUDENT'), classesController.getMyClasses);

// Class detail — Principal only
router.get('/:id', authenticate, authorize('PRINCIPAL'), classesController.getClassById);

// Teacher assignment (with subject) — Principal only
router.post('/:id/teachers', authenticate, authorize('PRINCIPAL'), classesController.assignTeacher);
router.delete('/assignments/:assignmentId', authenticate, authorize('PRINCIPAL'), classesController.removeTeacherAssignment);

export default router;
