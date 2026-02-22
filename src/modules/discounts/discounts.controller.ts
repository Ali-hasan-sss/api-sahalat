import { Response, NextFunction } from 'express';
import { discountsService, type CreateDiscountInput } from './discounts.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

export const discountsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = {
        type: typeof req.query.type === 'string' ? (req.query.type as 'TRIP' | 'CAR') : undefined,
        referenceId: typeof req.query.referenceId === 'string' ? req.query.referenceId : undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      };
      const result = await discountsService.list(query);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const discount = await discountsService.getById(id);
      res.json({ success: true, data: discount });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as {
        type: 'TRIP' | 'CAR';
        referenceId: string;
        discountType: 'PERCENTAGE' | 'FIXED';
        value: number;
        startDate: string;
        endDate: string;
        isActive?: boolean;
      };
      const discount = await discountsService.create({
        ...body,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      });
      res.status(201).json({ success: true, data: discount });
    } catch (e) {
      next(e);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = req.body as Partial<{
        type: 'TRIP' | 'CAR';
        referenceId: string;
        discountType: 'PERCENTAGE' | 'FIXED';
        value: number;
        startDate: string;
        endDate: string;
        isActive: boolean;
      }>;
      const updateData: Partial<CreateDiscountInput> = { ...body } as Partial<CreateDiscountInput>;
      if (body.startDate) updateData.startDate = new Date(body.startDate);
      if (body.endDate) updateData.endDate = new Date(body.endDate);
      const discount = await discountsService.update(id, updateData);
      res.json({ success: true, data: discount });
    } catch (e) {
      next(e);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await discountsService.softDelete(id);
      res.json({ success: true, message: 'Discount deleted' });
    } catch (e) {
      next(e);
    }
  },
};
