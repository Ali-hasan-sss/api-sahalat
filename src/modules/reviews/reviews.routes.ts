import { Router } from 'express';
import { authenticate, optionalAuth, requireAdmin } from '../../middlewares/auth.middleware.js';
import { reviewsController } from './reviews.controller.js';

const router = Router();

// Public: featured reviews for homepage
router.get('/featured', reviewsController.getFeaturedReviews);

// Admin: manage featured reviews
router.get('/admin/all', authenticate, requireAdmin, reviewsController.listAllForAdmin);
router.patch('/admin/featured', authenticate, requireAdmin, reviewsController.updateFeaturedBatch);

router.get('/trips/:tripId', optionalAuth, reviewsController.getTripReviews);
router.get('/cars/:carId', optionalAuth, reviewsController.getCarReviews);

router.post('/trips/:tripId', authenticate, reviewsController.createTripReview);
router.post('/cars/:carId', authenticate, reviewsController.createCarReview);

export const reviewsRoutes = router;
