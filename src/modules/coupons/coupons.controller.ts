import { Response, NextFunction } from 'express';
import { couponsService, type CreateCouponInput } from './coupons.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

export const couponsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      };
      const result = await couponsService.list(query);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const coupon = await couponsService.getById(id);
      res.json({ success: true, data: coupon });
    } catch (e) {
      next(e);
    }
  },

  async getByCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const code = req.params.code as string;
      const coupon = await couponsService.getByCode(code);
      res.json({ success: true, data: coupon });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as {
        code: string;
        discountType: 'PERCENTAGE' | 'FIXED';
        value: number;
        minBookingAmount?: number | null;
        maxUsages?: number | null;
        expiresAt: string;
        isActive?: boolean;
      };
      const coupon = await couponsService.create({
        ...body,
        expiresAt: new Date(body.expiresAt),
      });
      res.status(201).json({ success: true, data: coupon });
    } catch (e) {
      next(e);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = req.body as Partial<{
        code: string;
        discountType: 'PERCENTAGE' | 'FIXED';
        value: number;
        minBookingAmount: number | null;
        maxUsages: number | null;
        expiresAt: string;
        isActive: boolean;
      }>;
      const updateData: Partial<CreateCouponInput> = { ...body } as Partial<CreateCouponInput>;
      if (body.expiresAt) updateData.expiresAt = new Date(body.expiresAt);
      const coupon = await couponsService.update(id, updateData);
      res.json({ success: true, data: coupon });
    } catch (e) {
      next(e);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await couponsService.softDelete(id);
      res.json({ success: true, message: 'Coupon deleted' });
    } catch (e) {
      next(e);
    }
  },
};
