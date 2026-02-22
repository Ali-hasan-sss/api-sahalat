import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import { couponsController } from './coupons.controller.js';

const router = Router();

router.get('/code/:code', couponsController.getByCode);

router.use(authenticate, requireAdmin);
router.get('/', couponsController.list);
router.get('/:id', couponsController.getById);
router.post('/', couponsController.create);
router.patch('/:id', couponsController.update);
router.delete('/:id', couponsController.delete);

export const couponsRoutes = router;
