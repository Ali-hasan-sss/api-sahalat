import { Response, NextFunction } from 'express';
import { carsService } from './cars.service.js';
import { getRelativeImagePath } from '../../middlewares/upload.middleware.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

function getQueryStr(val: unknown): string | undefined {
  if (typeof val === 'string') return val || undefined;
  if (Array.isArray(val) && val[0] && typeof val[0] === 'string') return val[0] || undefined;
  return undefined;
}

export const carsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = {
        page: Number(getQueryStr(req.query.page) ?? 1) || 1,
        limit: Number(getQueryStr(req.query.limit) ?? 10) || 10,
        isActive: getQueryStr(req.query.isActive),
        category: getQueryStr(req.query.category),
        transmission: getQueryStr(req.query.transmission),
        seatsRange: getQueryStr(req.query.seatsRange),
      };
      const result = await carsService.list(query);
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const forAdmin = req.user?.role === 'ADMIN';
      const car = await carsService.getById(id, forAdmin);
      res.json({ success: true, data: car });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const car = await carsService.create(req.body);
      res.status(201).json({ success: true, data: car });
    } catch (e) {
      next(e);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const car = await carsService.update(id, req.body);
      res.json({ success: true, data: car });
    } catch (e) {
      next(e);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await carsService.softDelete(id);
      res.json({ success: true, message: 'Car deleted' });
    } catch (e) {
      next(e);
    }
  },

  async addImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const carId = req.params.id as string;
      const file = req.file as Express.Multer.File;
      if (!file?.filename) return next(new Error('File is required'));
      const relativePath = getRelativeImagePath('CARS', file.filename);
      const img = await carsService.addImage(carId, relativePath);
      res.status(201).json({ success: true, data: img });
    } catch (e) {
      next(e);
    }
  },

  async removeImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const carId = req.params.id as string;
      const imageId = req.params.imageId as string;
      await carsService.removeImage(carId, imageId);
      res.json({ success: true, message: 'Image removed' });
    } catch (e) {
      next(e);
    }
  },
};
