/**
 * Favorites service: add/remove/list favorites (trips, cars, or landmarks).
 */

import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { decimalToNumber, applyDiscountToPrice } from '../../utils/priceCalculator.js';
import { discountsService } from '../discounts/discounts.service.js';

export const favoritesService = {
  async add(userId: string, data: { tripId?: string; carId?: string; landmarkId?: string }) {
    const count = [data.tripId, data.carId, data.landmarkId].filter(Boolean).length;
    if (count !== 1) throw new AppError('Specify exactly one of tripId, carId, or landmarkId', 400);
    if (data.tripId) {
      const trip = await prisma.trip.findFirst({ where: { id: data.tripId, deletedAt: null } });
      if (!trip) throw new AppError('Trip not found', 404);
      const existing = await prisma.favorite.findFirst({
        where: { userId, tripId: data.tripId, carId: null, landmarkId: null, deletedAt: null },
      });
      if (existing) throw new AppError('Already in favorites', 400);
      return prisma.favorite.create({
        data: { userId, tripId: data.tripId, carId: null, landmarkId: null },
      });
    }
    if (data.carId) {
      const car = await prisma.car.findFirst({ where: { id: data.carId, deletedAt: null } });
      if (!car) throw new AppError('Car not found', 404);
      const existing = await prisma.favorite.findFirst({
        where: { userId, carId: data.carId, tripId: null, landmarkId: null, deletedAt: null },
      });
      if (existing) throw new AppError('Already in favorites', 400);
      return prisma.favorite.create({
        data: { userId, carId: data.carId, tripId: null, landmarkId: null },
      });
    }
    const landmark = await prisma.landmark.findFirst({ where: { id: data.landmarkId!, deletedAt: null } });
    if (!landmark) throw new AppError('Landmark not found', 404);
    const existing = await prisma.favorite.findFirst({
      where: { userId, landmarkId: data.landmarkId, tripId: null, carId: null, deletedAt: null },
    });
    if (existing) throw new AppError('Already in favorites', 400);
    return prisma.favorite.create({
      data: { userId, landmarkId: data.landmarkId, tripId: null, carId: null },
    });
  },

  async remove(userId: string, favoriteId: string) {
    const fav = await prisma.favorite.findFirst({
      where: { id: favoriteId, userId, deletedAt: null },
    });
    if (!fav) throw new AppError('Favorite not found', 404);
    await prisma.favorite.update({ where: { id: favoriteId }, data: { deletedAt: new Date() } });
    return { message: 'Removed from favorites' };
  },

  async list(userId: string) {
    const items = await prisma.favorite.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        trip: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            basePrice: true,
            durationDays: true,
            images: { where: { deletedAt: null }, orderBy: { order: 'asc' }, take: 1 },
          },
        },
        car: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            basePricePerDay: true,
            images: { where: { deletedAt: null }, orderBy: { order: 'asc' }, take: 1 },
          },
        },
        landmark: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            location: true,
            images: { where: { deletedAt: null }, orderBy: { order: 'asc' }, take: 1 },
          },
        },
      },
    });
    const mapped = await Promise.all(
      items.map(async (f) => {
        let tripData = null;
        if (f.trip) {
          const basePrice = decimalToNumber(f.trip.basePrice);
          const discount = await discountsService.getActiveForEntity('TRIP', f.trip.id);
          const finalPrice = discount ? applyDiscountToPrice(basePrice, discount.discountType, discount.value) : basePrice;
          tripData = {
            id: f.trip.id,
            title: f.trip.title,
            titleAr: f.trip.titleAr,
            basePrice,
            discount: discount ? { id: discount.id, discountType: discount.discountType, value: discount.value } : null,
            finalPrice,
            durationDays: f.trip.durationDays,
            image: f.trip.images[0]?.imagePath,
          };
        }
        let carData = null;
        if (f.car) {
          const basePricePerDay = decimalToNumber(f.car.basePricePerDay);
          const discount = await discountsService.getActiveForEntity('CAR', f.car.id);
          const finalPricePerDay = discount ? applyDiscountToPrice(basePricePerDay, discount.discountType, discount.value) : basePricePerDay;
          carData = {
            id: f.car.id,
            name: f.car.name,
            nameAr: f.car.nameAr,
            basePricePerDay,
            discount: discount ? { id: discount.id, discountType: discount.discountType, value: discount.value } : null,
            finalPricePerDay,
            image: f.car.images[0]?.imagePath,
          };
        }
        return {
          id: f.id,
          type: f.tripId ? 'trip' : f.carId ? 'car' : 'landmark',
          trip: tripData,
          car: carData,
          landmark: f.landmark
            ? { id: f.landmark.id, name: f.landmark.name, nameAr: f.landmark.nameAr, location: f.landmark.location, image: f.landmark.images[0]?.imagePath }
            : null,
          createdAt: f.createdAt,
        };
      })
    );
    return mapped;
  },
};
