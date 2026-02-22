import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { usersController } from './users.controller.js';

const router = Router();

router.use(authenticate);
router.get('/profile', usersController.getProfile);
router.patch('/profile', usersController.updateProfile);

export const usersRoutes = router;
