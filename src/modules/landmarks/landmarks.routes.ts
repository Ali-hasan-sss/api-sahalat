import { Router } from 'express';
import { authenticate, requireAdmin, optionalAuth } from '../../middlewares/auth.middleware.js';
import { upload, uploadTo } from '../../middlewares/upload.middleware.js';
import { landmarksController } from './landmarks.controller.js';

const router = Router();

router.get('/', optionalAuth, landmarksController.list);
router.get('/:id', optionalAuth, landmarksController.getById);

router.post('/', authenticate, requireAdmin, landmarksController.create);
router.patch('/:id', authenticate, requireAdmin, landmarksController.update);
router.delete('/:id', authenticate, requireAdmin, landmarksController.delete);

router.post(
  '/:id/images',
  authenticate,
  requireAdmin,
  uploadTo('LANDMARKS'),
  upload.single('image'),
  landmarksController.addImage
);
router.delete('/:id/images/:imageId', authenticate, requireAdmin, landmarksController.removeImage);

export const landmarksRoutes = router;
