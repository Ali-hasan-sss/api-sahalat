import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { paymentsController } from './payments.controller.js';

const router = Router();

router.post('/trip-booking/:bookingId/session', authenticate, paymentsController.createTripSession);
router.post('/car-booking/:bookingId/session', authenticate, paymentsController.createCarSession);

router.post('/webhook', paymentsController.webhook);

export const paymentsRoutes = router;
