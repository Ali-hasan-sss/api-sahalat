import { Router } from 'express';
import { authenticate, requireAdmin, optionalAuth } from '../../middlewares/auth.middleware.js';
import { upload, uploadTo } from '../../middlewares/upload.middleware.js';
import { carsController } from './cars.controller.js';

const router = Router();

router.get('/', optionalAuth, carsController.list);
router.get('/:id', optionalAuth, carsController.getById);

router.post('/', authenticate, requireAdmin, carsController.create);
router.patch('/:id', authenticate, requireAdmin, carsController.update);
router.delete('/:id', authenticate, requireAdmin, carsController.delete);

router.post(
  '/:id/images',
  authenticate,
  requireAdmin,
  uploadTo('CARS'),
  upload.single('image'),
  carsController.addImage
);
router.delete('/:id/images/:imageId', authenticate, requireAdmin, carsController.removeImage);

export const carsRoutes = router;
