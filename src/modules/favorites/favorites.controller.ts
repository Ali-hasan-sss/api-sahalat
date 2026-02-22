import { Response, NextFunction } from 'express';
import { favoritesService } from './favorites.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

export const favoritesController = {
  async add(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const body = req.body as { tripId?: string; carId?: string; landmarkId?: string };
      const fav = await favoritesService.add(userId, body);
      res.status(201).json({ success: true, data: fav });
    } catch (e) {
      next(e);
    }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const favoriteId = req.params.id as string;
      await favoritesService.remove(userId, favoriteId);
      res.json({ success: true, message: 'Removed from favorites' });
    } catch (e) {
      next(e);
    }
  },

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const list = await favoritesService.list(userId);
      res.json({ success: true, data: list });
    } catch (e) {
      next(e);
    }
  },
};
