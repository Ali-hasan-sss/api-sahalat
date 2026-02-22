import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middlewares/auth.middleware.js';
import { reviewsController } from './reviews.controller.js';

const router = Router();

router.get('/trips/:tripId', optionalAuth, reviewsController.getTripReviews);
router.get('/cars/:carId', optionalAuth, reviewsController.getCarReviews);

router.post('/trips/:tripId', authenticate, reviewsController.createTripReview);
router.post('/cars/:carId', authenticate, reviewsController.createCarReview);

export const reviewsRoutes = router;
