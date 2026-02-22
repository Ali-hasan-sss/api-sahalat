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

  /** Public: get featured reviews for homepage slider */
  async getFeaturedReviews(limit = 10) {
    const [tripReviews, carReviews] = await Promise.all([
      prisma.tripReview.findMany({
        where: { isFeatured: true, deletedAt: null, comment: { not: null } },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, country: true } },
          trip: { select: { id: true, title: true, titleAr: true } },
        },
      }),
      prisma.carReview.findMany({
        where: { isFeatured: true, deletedAt: null, comment: { not: null } },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, country: true } },
          car: { select: { id: true, name: true, nameAr: true } },
        },
      }),
    ]);
    const items = [
      ...tripReviews.map((r) => ({
        id: r.id,
        type: 'TRIP' as const,
        rating: r.rating,
        comment: r.comment,
        userName: r.user.name,
        userCountry: r.user.country,
        referenceTitle: r.trip.titleAr ?? r.trip.title,
        referenceId: r.tripId,
      })),
      ...carReviews.map((r) => ({
        id: r.id,
        type: 'CAR' as const,
        rating: r.rating,
        comment: r.comment,
        userName: r.user.name,
        userCountry: r.user.country,
        referenceTitle: r.car.nameAr ?? r.car.name,
        referenceId: r.carId,
      })),
    ].filter((r) => r.comment != null && r.comment.trim().length > 0);
    return items;
  },

  /** Admin: list all reviews for featured management */
  async listAllForAdmin() {
    const [tripReviews, carReviews] = await Promise.all([
      prisma.tripReview.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, country: true } },
          trip: { select: { id: true, title: true, titleAr: true } },
        },
      }),
      prisma.carReview.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, country: true } },
          car: { select: { id: true, name: true, nameAr: true } },
        },
      }),
    ]);
    const items = [
      ...tripReviews.map((r) => ({
        id: r.id,
        type: 'TRIP' as const,
        rating: r.rating,
        comment: r.comment,
        isFeatured: r.isFeatured,
        createdAt: r.createdAt,
        userName: r.user.name,
        userCountry: r.user.country,
        referenceTitle: r.trip.titleAr ?? r.trip.title,
        referenceId: r.tripId,
      })),
      ...carReviews.map((r) => ({
        id: r.id,
        type: 'CAR' as const,
        rating: r.rating,
        comment: r.comment,
        isFeatured: r.isFeatured,
        createdAt: r.createdAt,
        userName: r.user.name,
        userCountry: r.user.country,
        referenceTitle: r.car.nameAr ?? r.car.name,
        referenceId: r.carId,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return { items };
  },

  async setTripReviewFeatured(id: string, isFeatured: boolean) {
    const r = await prisma.tripReview.findFirst({ where: { id, deletedAt: null } });
    if (!r) throw new AppError('Trip review not found', 404);
    return prisma.tripReview.update({ where: { id }, data: { isFeatured } });
  },

  async setCarReviewFeatured(id: string, isFeatured: boolean) {
    const r = await prisma.carReview.findFirst({ where: { id, deletedAt: null } });
    if (!r) throw new AppError('Car review not found', 404);
    return prisma.carReview.update({ where: { id }, data: { isFeatured } });
  },

  /** Admin: batch update featured status (review IDs) */
  async updateFeaturedBatch(tripReviewIds: string[], carReviewIds: string[]) {
    await prisma.tripReview.updateMany({
      where: { id: { in: tripReviewIds }, deletedAt: null },
      data: { isFeatured: true },
    });
    await prisma.tripReview.updateMany({
      where: { id: { notIn: tripReviewIds }, deletedAt: null },
      data: { isFeatured: false },
    });
    await prisma.carReview.updateMany({
      where: { id: { in: carReviewIds }, deletedAt: null },
      data: { isFeatured: true },
    });
    await prisma.carReview.updateMany({
      where: { id: { notIn: carReviewIds }, deletedAt: null },
      data: { isFeatured: false },
    });
  },
};
