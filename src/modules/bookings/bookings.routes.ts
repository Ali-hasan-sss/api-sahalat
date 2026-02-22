import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import { upload, uploadTo } from '../../middlewares/upload.middleware.js';
import { bookingsController } from './bookings.controller.js';

const router = Router();

router.use(authenticate);

router.post('/trips/:tripId', bookingsController.createTripBooking);
router.post('/cars/upload-license', uploadTo('LICENSES'), upload.single('license'), bookingsController.uploadLicense);
router.post('/cars/:carId/price-preview', bookingsController.getCarRentalPricePreview);
router.post('/cars/:carId', bookingsController.createCarBooking);

router.get('/trips/my', bookingsController.listMyTripBookings);
router.get('/cars/my', bookingsController.listMyCarBookings);

router.get('/trips/:bookingId', bookingsController.getTripBooking);
router.get('/cars/:bookingId', bookingsController.getCarBooking);

router.get('/admin/trips', requireAdmin, bookingsController.listAllTripBookings);
router.get('/admin/cars', requireAdmin, bookingsController.listAllCarBookings);

export const bookingsRoutes = router;
