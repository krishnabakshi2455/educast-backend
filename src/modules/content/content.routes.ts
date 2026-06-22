import { Router, IRouter } from 'express';
import * as contentController from './content.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { createUploader } from '../../middlewares/upload';

const router: IRouter = Router();
const uploader = createUploader();

// Teacher: upload content
router.post(
  '/upload',
  authenticate,
  authorize('TEACHER'),
  uploader.single('file'),
  contentController.uploadContent
);

// Teacher: view own content
router.get('/my', authenticate, authorize('TEACHER'), contentController.getMyContent);

// Teacher: delete own content (only pending/rejected)
router.delete('/:id', authenticate, authorize('TEACHER'), contentController.deleteContent);

// Principal: view all content
router.get('/', authenticate, authorize('PRINCIPAL'), contentController.getAllContent);

// Student: view approved content for assigned classes
router.get('/student/feed', authenticate, authorize('STUDENT'), contentController.getStudentContent);

// Shared: get single content item (teacher sees own, principal sees all)
router.get('/:id', authenticate, authorize('PRINCIPAL', 'TEACHER'), contentController.getContentById);

export default router;
