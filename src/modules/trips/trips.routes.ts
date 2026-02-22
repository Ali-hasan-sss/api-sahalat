/**
 * Trips routes: public list/detail, admin CRUD + images.
 */

import { Router } from 'express';
import { authenticate, requireAdmin, optionalAuth } from '../../middlewares/auth.middleware.js';
import { upload, uploadTo } from '../../middlewares/upload.middleware.js';
import { tripsController } from './trips.controller.js';

const router = Router();

// Public
router.get('/', optionalAuth, tripsController.list);
router.get('/:id', optionalAuth, tripsController.getById);

// Admin only
router.post('/', authenticate, requireAdmin, tripsController.create);
router.patch('/:id', authenticate, requireAdmin, tripsController.update);
router.delete('/:id', authenticate, requireAdmin, tripsController.delete);

router.post(
  '/:id/images',
  authenticate,
  requireAdmin,
  uploadTo('TRIPS'),
  upload.single('image'),
  tripsController.addImage
);
router.delete('/:id/images/:imageId', authenticate, requireAdmin, tripsController.removeImage);

router.post('/:id/features', authenticate, requireAdmin, tripsController.addFeature);
router.patch('/:id/features/:featureId', authenticate, requireAdmin, tripsController.updateFeature);
router.delete('/:id/features/:featureId', authenticate, requireAdmin, tripsController.removeFeature);

router.post('/:id/itinerary', authenticate, requireAdmin, tripsController.addItineraryDay);
router.patch('/:id/itinerary/:dayId', authenticate, requireAdmin, tripsController.updateItineraryDay);
router.delete('/:id/itinerary/:dayId', authenticate, requireAdmin, tripsController.removeItineraryDay);

router.post('/:id/meals', authenticate, requireAdmin, tripsController.addMeal);
router.patch('/:id/meals/:mealId', authenticate, requireAdmin, tripsController.updateMeal);
router.delete('/:id/meals/:mealId', authenticate, requireAdmin, tripsController.removeMeal);

router.post('/:id/hotels', authenticate, requireAdmin, tripsController.addHotel);
router.patch('/:id/hotels/:hotelId', authenticate, requireAdmin, tripsController.updateHotel);
router.delete('/:id/hotels/:hotelId', authenticate, requireAdmin, tripsController.removeHotel);

router.post('/:id/included', authenticate, requireAdmin, tripsController.addIncluded);
router.patch('/:id/included/:itemId', authenticate, requireAdmin, tripsController.updateIncluded);
router.delete('/:id/included/:itemId', authenticate, requireAdmin, tripsController.removeIncluded);

router.post('/:id/excluded', authenticate, requireAdmin, tripsController.addExcluded);
router.patch('/:id/excluded/:itemId', authenticate, requireAdmin, tripsController.updateExcluded);
router.delete('/:id/excluded/:itemId', authenticate, requireAdmin, tripsController.removeExcluded);

export const tripsRoutes = router;
