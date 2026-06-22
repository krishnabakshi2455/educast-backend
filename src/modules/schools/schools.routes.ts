import { Router, IRouter } from 'express';
import * as schoolsController from './schools.controller';
import { authenticate, authorize } from '../../middlewares/auth';

const router: IRouter = Router();

router.use(authenticate, authorize('PRINCIPAL'));

// School itself (creation happens in /auth/schools/register)
router.get('/', schoolsController.getSchools);
router.get('/:id', schoolsController.getSchoolById);
router.put('/:id', schoolsController.updateSchool);
router.delete('/:id', schoolsController.deleteSchool);

// Class/section setup
router.post('/:id/classes/setup', schoolsController.setupClasses);
router.get('/:id/classes', schoolsController.getClasses);

// Teachers
router.post('/:id/teachers', schoolsController.addTeacher);
router.get('/:id/teachers', schoolsController.getTeachers);

// Students
router.post('/:id/students', schoolsController.addStudent);
router.get('/:id/students', schoolsController.getStudents);

export default router;
