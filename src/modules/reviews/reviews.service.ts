/**
 * Reviews service: trip and car reviews (1-5 rating + comment).
 */

import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { RATING_MIN, RATING_MAX } from '../../config/constants.js';

export const reviewsService = {
  async createTripReview(userId: string, tripId: string, data: { rating: number; comment?: string }) {
    if (data.rating < RATING_MIN || data.rating > RATING_MAX) {
      throw new AppError(`Rating must be between ${RATING_MIN} and ${RATING_MAX}`, 400);
    }
    const trip = await prisma.trip.findFirst({ where: { id: tripId, deletedAt: null } });
    if (!trip) throw new AppError('Trip not found', 404);
    const confirmedBooking = await prisma.tripBooking.findFirst({
      where: { userId, tripId, status: { in: ['PENDING', 'PAID'] }, deletedAt: null },
    });
    if (!confirmedBooking) throw new AppError('Only users with a confirmed booking can review this trip', 403);
    const existing = await prisma.tripReview.findFirst({
      where: { userId, tripId, deletedAt: null },
    });
    if (existing) throw new AppError('You already reviewed this trip', 400);
    const review = await prisma.tripReview.create({
      data: { userId, tripId, rating: data.rating, comment: data.comment ?? null },
    });
    return review;
  },

  async createCarReview(userId: string, carId: string, data: { rating: number; comment?: string }) {
    if (data.rating < RATING_MIN || data.rating > RATING_MAX) {
      throw new AppError(`Rating must be between ${RATING_MIN} and ${RATING_MAX}`, 400);
    }
    const car = await prisma.car.findFirst({ where: { id: carId, deletedAt: null } });
    if (!car) throw new AppError('Car not found', 404);
    const confirmedBooking = await prisma.carBooking.findFirst({
      where: { userId, carId, status: { in: ['PENDING', 'PAID'] }, deletedAt: null },
    });
    if (!confirmedBooking) throw new AppError('Only users with a confirmed booking can review this car', 403);
    const existing = await prisma.carReview.findFirst({
      where: { userId, carId, deletedAt: null },
    });
    if (existing) throw new AppError('You already reviewed this car', 400);
    const review = await prisma.carReview.create({
      data: { userId, carId, rating: data.rating, comment: data.comment ?? null },
    });
    return review;
  },

  async getTripReviews(tripId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.tripReview.findMany({
        where: { tripId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.tripReview.count({ where: { tripId, deletedAt: null } }),
    ]);
    const avg = await prisma.tripReview.aggregate({
      where: { tripId, deletedAt: null },
      _avg: { rating: true },
      _count: true,
    });
    return { items, total, page, limit, averageRating: avg._avg.rating ?? 0, totalReviews: avg._count };
  },

  async getCarReviews(carId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.carReview.findMany({
        where: { carId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.carReview.count({ where: { carId, deletedAt: null } }),
    ]);
    const avg = await prisma.carReview.aggregate({
      where: { carId, deletedAt: null },
      _avg: { rating: true },
      _count: true,
    });
    return { items, total, page, limit, averageRating: avg._avg.rating ?? 0, totalReviews: avg._count };
  },
};
