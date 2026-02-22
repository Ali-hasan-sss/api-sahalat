import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import { discountsController } from './discounts.controller.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', discountsController.list);
router.get('/:id', discountsController.getById);
router.post('/', discountsController.create);
router.patch('/:id', discountsController.update);
router.delete('/:id', discountsController.delete);

export const discountsRoutes = router;
