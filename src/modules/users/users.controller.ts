/**
 * Users controller.
 */

import { Response, NextFunction } from 'express';
import { usersService } from './users.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

export const usersController = {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      const user = await usersService.getById(req.user.id);
      res.json({ success: true, data: user });
    } catch (e) {
      next(e);
    }
  },

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      const user = await usersService.updateProfile(req.user.id, req.body);
      res.json({ success: true, data: user });
    } catch (e) {
      next(e);
    }
  },
};
