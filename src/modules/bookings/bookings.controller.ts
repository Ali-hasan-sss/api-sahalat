import { Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/errorHandler.js';
import { bookingsService } from './bookings.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

export const bookingsController = {
  async createTripBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const tripId = req.params.tripId as string;
      const body = req.body as { startDate: string; participants?: number; adults?: number; children?: number; couponCode?: string };
      const startDate = new Date(body.startDate);
      const result = await bookingsService.createTripBooking(userId, tripId, {
        startDate,
        participants: body.participants,
        adults: body.adults,
        children: body.children,
        couponCode: body.couponCode,
      });
      res.status(201).json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async getCarRentalPricePreview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const carId = req.params.carId as string;
      const body = req.body as { startDate: string; endDate: string; withDriver?: boolean; couponCode?: string };
      const result = await bookingsService.getCarRentalPricePreview(userId, carId, {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        withDriver: body.withDriver ?? false,
        couponCode: body.couponCode,
      });
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async createCarBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const carId = req.params.carId as string;
      const body = req.body as {
        pickupLocation: string;
        returnLocation: string;
        startDate: string;
        endDate: string;
        withDriver: boolean;
        licenseImagePath?: string;
        licenseIssuer?: string;
        couponCode?: string;
      };
      if (!body.pickupLocation?.trim()) throw new AppError('Pickup location is required', 400);
      if (!body.returnLocation?.trim()) throw new AppError('Return location is required', 400);
      const licensePath = (req as AuthRequest & { licenseImagePath?: string }).licenseImagePath ?? body.licenseImagePath;
      const result = await bookingsService.createCarBooking(userId, carId, {
        pickupLocation: body.pickupLocation,
        returnLocation: body.returnLocation,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        withDriver: body.withDriver ?? false,
        licenseImagePath: licensePath,
        licenseIssuer: body.licenseIssuer,
        couponCode: body.couponCode,
      });
      res.status(201).json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async uploadLicense(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file as Express.Multer.File;
      if (!file?.filename) return next(new Error('File is required'));
      const { getRelativeImagePath } = await import('../../middlewares/upload.middleware.js');
      const imagePath = getRelativeImagePath('LICENSES', file.filename);
      res.status(201).json({ success: true, data: { imagePath } });
    } catch (e) {
      next(e);
    }
  },

  async getTripBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.bookingId as string;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const booking = await bookingsService.getTripBookingById(bookingId, userId, isAdmin);
      res.json({ success: true, data: booking });
    } catch (e) {
      next(e);
    }
  },

  async getCarBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.bookingId as string;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const booking = await bookingsService.getCarBookingById(bookingId, userId, isAdmin);
      res.json({ success: true, data: booking });
    } catch (e) {
      next(e);
    }
  },

  async listMyTripBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const result = await bookingsService.listMyTripBookings(userId, page, limit);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async listMyCarBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const result = await bookingsService.listMyCarBookings(userId, page, limit);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async listAllTripBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await bookingsService.listAllTripBookings(page, limit);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async listAllCarBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await bookingsService.listAllCarBookings(page, limit);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async adminUpdateTripBookingStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.bookingId as string;
      const status = req.body.status as 'PENDING' | 'PAID' | 'CANCELLED' | 'COMPLETED';
      if (!['PENDING', 'PAID', 'CANCELLED', 'COMPLETED'].includes(status)) {
        throw new AppError('Invalid status', 400);
      }
      const booking = await bookingsService.adminUpdateTripBookingStatus(bookingId, status);
      res.json({ success: true, data: booking });
    } catch (e) {
      next(e);
    }
  },

  async adminUpdateCarBookingStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.bookingId as string;
      const status = req.body.status as 'PENDING' | 'PAID' | 'CANCELLED' | 'COMPLETED';
      if (!['PENDING', 'PAID', 'CANCELLED', 'COMPLETED'].includes(status)) {
        throw new AppError('Invalid status', 400);
      }
      const booking = await bookingsService.adminUpdateCarBookingStatus(bookingId, status);
      res.json({ success: true, data: booking });
    } catch (e) {
      next(e);
    }
  },
};
