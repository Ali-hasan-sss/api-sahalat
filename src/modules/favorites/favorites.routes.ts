import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { favoritesController } from './favorites.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', favoritesController.list);
router.post('/', favoritesController.add);
router.delete('/:id', favoritesController.remove);

export const favoritesRoutes = router;
