import { Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

export const paymentsController = {
  async createTripSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const bookingId = req.params.bookingId as string;
      const body = req.body as { amount: number };
      const result = await paymentsService.createTripPaymentSession(bookingId, userId, body.amount);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async createCarSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const bookingId = req.params.bookingId as string;
      const body = req.body as { amount: number };
      const result = await paymentsService.createCarPaymentSession(bookingId, userId, body.amount);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['thawani-signature'] as string | undefined ?? req.headers['x-webhook-signature'] as string | undefined;
      const payload = req.body;
      const result = await paymentsService.handleWebhook(payload, signature);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
};
