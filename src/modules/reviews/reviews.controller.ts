import { Response, NextFunction } from 'express';
import { reviewsService } from './reviews.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

export const reviewsController = {
  async getFeaturedReviews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = Number((req.query as { limit?: string }).limit) || 10;
      const items = await reviewsService.getFeaturedReviews(limit);
      res.json({ success: true, data: items });
    } catch (e) {
      next(e);
    }
  },

  async listAllForAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await reviewsService.listAllForAdmin();
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async updateFeaturedBatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as { tripReviewIds?: string[]; carReviewIds?: string[] };
      await reviewsService.updateFeaturedBatch(
        body.tripReviewIds ?? [],
        body.carReviewIds ?? []
      );
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },

  async createTripReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const tripId = req.params.tripId as string;
      const body = req.body as { rating: number; comment?: string };
      const review = await reviewsService.createTripReview(userId, tripId, body);
      res.status(201).json({ success: true, data: review });
    } catch (e) {
      next(e);
    }
  },

  async createCarReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const carId = req.params.carId as string;
      const body = req.body as { rating: number; comment?: string };
      const review = await reviewsService.createCarReview(userId, carId, body);
      res.status(201).json({ success: true, data: review });
    } catch (e) {
      next(e);
    }
  },

  async getTripReviews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.tripId as string;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const result = await reviewsService.getTripReviews(tripId, page, limit);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async getCarReviews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const carId = req.params.carId as string;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const result = await reviewsService.getCarReviews(carId, page, limit);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },
};
