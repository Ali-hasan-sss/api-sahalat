import { Response, NextFunction } from 'express';
import { landmarksService } from './landmarks.service.js';
import { getRelativeImagePath } from '../../middlewares/upload.middleware.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

export const landmarksController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        isActive: typeof req.query.isActive === 'string' ? req.query.isActive : undefined,
      };
      const result = await landmarksService.list(query);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const forAdmin = req.user?.role === 'ADMIN';
      const landmark = await landmarksService.getById(id, forAdmin);
      res.json({ success: true, data: landmark });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const landmark = await landmarksService.create(req.body);
      res.status(201).json({ success: true, data: landmark });
    } catch (e) {
      next(e);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const landmark = await landmarksService.update(id, req.body);
      res.json({ success: true, data: landmark });
    } catch (e) {
      next(e);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await landmarksService.softDelete(id);
      res.json({ success: true, message: 'Landmark deleted' });
    } catch (e) {
      next(e);
    }
  },

  async addImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const landmarkId = req.params.id as string;
      const file = req.file as Express.Multer.File;
      if (!file?.filename) return next(new Error('File is required'));
      const relativePath = getRelativeImagePath('LANDMARKS', file.filename);
      const img = await landmarksService.addImage(landmarkId, relativePath);
      res.status(201).json({ success: true, data: img });
    } catch (e) {
      next(e);
    }
  },

  async removeImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const landmarkId = req.params.id as string;
      const imageId = req.params.imageId as string;
      await landmarksService.removeImage(landmarkId, imageId);
      res.json({ success: true, message: 'Image removed' });
    } catch (e) {
      next(e);
    }
  },
};
