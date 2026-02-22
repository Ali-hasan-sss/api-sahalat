/**
 * Cars service: CRUD, list, soft delete, images.
 */

import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { decimalToNumber, applyDiscountToPrice } from '../../utils/priceCalculator.js';
import { discountsService } from '../discounts/discounts.service.js';
import type { Prisma } from '@prisma/client';

const VALID_CATEGORIES = ['ECONOMY', 'SUV', 'LUXURY', 'VAN'] as const;
const VALID_TRANSMISSIONS = ['AUTOMATIC', 'MANUAL'] as const;
const VALID_SEATS_RANGES = ['4-5', '6-7', '8+'] as const;

const defaultList = {
  page: 1,
  limit: 10,
  isActive: undefined as string | undefined,
  category: undefined as string | undefined,
  transmission: undefined as string | undefined,
  seatsRange: undefined as string | undefined,
};

export type CreateCarInput = {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  brand?: string;
  model?: string;
  year?: number;
  basePricePerDay: number;
  basePricePerWeek?: number | null;
  basePricePerMonth?: number | null;
  basePricePerDayWithDriver?: number | null;
  basePricePerWeekWithDriver?: number | null;
  basePricePerMonthWithDriver?: number | null;
  category?: string;
  transmission?: string;
  seats?: number;
  fuelType?: string;
  isActive?: boolean;
};

export const carsService = {
  async list(
    query: {
      page?: number;
      limit?: number;
      isActive?: string;
      category?: string;
      transmission?: string;
      seatsRange?: string;
    } = defaultList
  ) {
    const { page = 1, limit = 10, isActive, category, transmission, seatsRange } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.CarWhereInput = { deletedAt: null };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const cat = typeof category === 'string' ? category.trim().toUpperCase() : undefined;
    if (cat && VALID_CATEGORIES.includes(cat as (typeof VALID_CATEGORIES)[number])) {
      where.category = cat as 'ECONOMY' | 'SUV' | 'LUXURY' | 'VAN';
    }
    const trans = typeof transmission === 'string' ? transmission.trim().toUpperCase() : undefined;
    if (trans && VALID_TRANSMISSIONS.includes(trans as (typeof VALID_TRANSMISSIONS)[number])) {
      where.transmission = trans as 'AUTOMATIC' | 'MANUAL';
    }
    const sr = typeof seatsRange === 'string' ? seatsRange.trim() : undefined;
    if (sr && VALID_SEATS_RANGES.includes(sr as (typeof VALID_SEATS_RANGES)[number])) {
      if (sr === '4-5') where.seats = { gte: 4, lte: 5 };
      else if (sr === '6-7') where.seats = { gte: 6, lte: 7 };
      else if (sr === '8+') where.seats = { gte: 8 };
    }

    const [items, total] = await Promise.all([
      prisma.car.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { deletedAt: null }, orderBy: { order: 'asc' }, take: 1 },
          _count: { select: { reviews: true } },
          reviews: { select: { rating: true } },
        },
      }),
      prisma.car.count({ where }),
    ]);

    const list = await Promise.all(
      items.map(async (c) => {
        const { _count, reviews, ...rest } = c;
        const avgRating =
          reviews.length > 0
            ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
            : null;
        const basePricePerDay = decimalToNumber(c.basePricePerDay);
        const basePricePerWeek = c.basePricePerWeek != null ? decimalToNumber(c.basePricePerWeek) : null;
        const basePricePerMonth = c.basePricePerMonth != null ? decimalToNumber(c.basePricePerMonth) : null;
        const basePricePerDayWithDriver = c.basePricePerDayWithDriver != null ? decimalToNumber(c.basePricePerDayWithDriver) : null;
        const basePricePerWeekWithDriver = c.basePricePerWeekWithDriver != null ? decimalToNumber(c.basePricePerWeekWithDriver) : null;
        const basePricePerMonthWithDriver = c.basePricePerMonthWithDriver != null ? decimalToNumber(c.basePricePerMonthWithDriver) : null;

        const discount = await discountsService.getActiveForEntity('CAR', c.id);
        const apply = (p: number | null) =>
          p != null && discount ? applyDiscountToPrice(p, discount.discountType, discount.value) : p;

        return {
          ...rest,
          basePricePerDay,
          basePricePerWeek,
          basePricePerMonth,
          basePricePerDayWithDriver,
          basePricePerWeekWithDriver,
          basePricePerMonthWithDriver,
          discount: discount
            ? { id: discount.id, discountType: discount.discountType, value: discount.value, startDate: discount.startDate, endDate: discount.endDate }
            : null,
          finalPricePerDay: discount ? apply(basePricePerDay) : basePricePerDay,
          finalPricePerWeek: discount ? apply(basePricePerWeek) : basePricePerWeek,
          finalPricePerMonth: discount ? apply(basePricePerMonth) : basePricePerMonth,
          finalPricePerDayWithDriver: discount ? apply(basePricePerDayWithDriver) : basePricePerDayWithDriver,
          finalPricePerWeekWithDriver: discount ? apply(basePricePerWeekWithDriver) : basePricePerWeekWithDriver,
          finalPricePerMonthWithDriver: discount ? apply(basePricePerMonthWithDriver) : basePricePerMonthWithDriver,
          images: c.images.map((i) => ({ id: i.id, imagePath: i.imagePath })),
          reviewsCount: _count.reviews,
          averageRating: avgRating,
        };
      })
    );

    return { items: list, total, page, limit };
  },

  async getById(id: string, forAdmin = false) {
    const car = await prisma.car.findFirst({
      where: { id, ...(forAdmin ? {} : { deletedAt: null }) },
      include: {
        images: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        _count: { select: { reviews: true } },
      },
    });
    if (!car) throw new AppError('Car not found', 404);
    const [reviewsAgg, latestReviews] = await Promise.all([
      prisma.carReview.aggregate({
        where: { carId: id, deletedAt: null },
        _avg: { rating: true },
      }),
      prisma.carReview.findMany({
        where: { carId: id, deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);
    const averageRating = reviewsAgg._avg.rating ? Math.round(reviewsAgg._avg.rating * 10) / 10 : null;
    const reviewsCount = car._count.reviews;
    const reviews = latestReviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));

    const basePricePerDay = decimalToNumber(car.basePricePerDay);
    const basePricePerWeek = car.basePricePerWeek != null ? decimalToNumber(car.basePricePerWeek) : null;
    const basePricePerMonth = car.basePricePerMonth != null ? decimalToNumber(car.basePricePerMonth) : null;
    const basePricePerDayWithDriver = car.basePricePerDayWithDriver != null ? decimalToNumber(car.basePricePerDayWithDriver) : null;
    const basePricePerWeekWithDriver = car.basePricePerWeekWithDriver != null ? decimalToNumber(car.basePricePerWeekWithDriver) : null;
    const basePricePerMonthWithDriver = car.basePricePerMonthWithDriver != null ? decimalToNumber(car.basePricePerMonthWithDriver) : null;

    let discount = null;
    let finalPricePerDay = basePricePerDay;
    let finalPricePerWeek = basePricePerWeek;
    let finalPricePerMonth = basePricePerMonth;
    let finalPricePerDayWithDriver = basePricePerDayWithDriver;
    let finalPricePerWeekWithDriver = basePricePerWeekWithDriver;
    let finalPricePerMonthWithDriver = basePricePerMonthWithDriver;

    if (!forAdmin) {
      const activeDiscount = await discountsService.getActiveForEntity('CAR', id);
      if (activeDiscount) {
        discount = {
          id: activeDiscount.id,
          discountType: activeDiscount.discountType,
          value: activeDiscount.value,
          startDate: activeDiscount.startDate,
          endDate: activeDiscount.endDate,
        };
        const apply = (p: number | null) =>
          p != null ? applyDiscountToPrice(p, activeDiscount.discountType, activeDiscount.value) : null;
        finalPricePerDay = apply(basePricePerDay)!;
        finalPricePerWeek = apply(basePricePerWeek);
        finalPricePerMonth = apply(basePricePerMonth);
        finalPricePerDayWithDriver = apply(basePricePerDayWithDriver);
        finalPricePerWeekWithDriver = apply(basePricePerWeekWithDriver);
        finalPricePerMonthWithDriver = apply(basePricePerMonthWithDriver);
      }
    }

    return {
      ...car,
      _count: undefined,
      basePricePerDay,
      basePricePerWeek,
      basePricePerMonth,
      basePricePerDayWithDriver,
      basePricePerWeekWithDriver,
      basePricePerMonthWithDriver,
      discount,
      finalPricePerDay,
      finalPricePerWeek,
      finalPricePerMonth,
      finalPricePerDayWithDriver,
      finalPricePerWeekWithDriver,
      finalPricePerMonthWithDriver,
      averageRating,
      reviewsCount,
      reviews,
    };
  },

  async create(data: CreateCarInput) {
    const car = await prisma.car.create({
      data: {
        name: data.name,
        nameAr: data.nameAr ?? null,
        description: data.description ?? null,
        descriptionAr: data.descriptionAr ?? null,
        brand: data.brand ?? null,
        model: data.model ?? null,
        year: data.year ?? null,
        basePricePerDay: data.basePricePerDay,
        basePricePerWeek: data.basePricePerWeek ?? null,
        basePricePerMonth: data.basePricePerMonth ?? null,
        basePricePerDayWithDriver: data.basePricePerDayWithDriver ?? null,
        basePricePerWeekWithDriver: data.basePricePerWeekWithDriver ?? null,
        basePricePerMonthWithDriver: data.basePricePerMonthWithDriver ?? null,
        category: (data.category as 'ECONOMY' | 'SUV' | 'LUXURY' | 'VAN') ?? 'ECONOMY',
        transmission: (data.transmission as 'AUTOMATIC' | 'MANUAL') ?? 'AUTOMATIC',
        seats: data.seats ?? 5,
        fuelType: data.fuelType ? (data.fuelType as 'PETROL' | 'DIESEL') : null,
        isActive: data.isActive ?? true,
      },
    });
    return {
      ...car,
      basePricePerDay: decimalToNumber(car.basePricePerDay),
      basePricePerWeek: car.basePricePerWeek != null ? decimalToNumber(car.basePricePerWeek) : null,
      basePricePerMonth: car.basePricePerMonth != null ? decimalToNumber(car.basePricePerMonth) : null,
      basePricePerDayWithDriver: car.basePricePerDayWithDriver != null ? decimalToNumber(car.basePricePerDayWithDriver) : null,
      basePricePerWeekWithDriver: car.basePricePerWeekWithDriver != null ? decimalToNumber(car.basePricePerWeekWithDriver) : null,
      basePricePerMonthWithDriver: car.basePricePerMonthWithDriver != null ? decimalToNumber(car.basePricePerMonthWithDriver) : null,
    };
  },

  async update(id: string, data: Partial<CreateCarInput>) {
    const existing = await prisma.car.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Car not found', 404);
    const car = await prisma.car.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.nameAr != null && { nameAr: data.nameAr }),
        ...(data.description != null && { description: data.description }),
        ...(data.descriptionAr != null && { descriptionAr: data.descriptionAr }),
        ...(data.brand !== undefined && { brand: data.brand || null }),
        ...(data.model !== undefined && { model: data.model || null }),
        ...(data.year !== undefined && { year: data.year ?? null }),
        ...(data.basePricePerDay != null && { basePricePerDay: data.basePricePerDay }),
        ...(data.basePricePerWeek !== undefined && { basePricePerWeek: data.basePricePerWeek ?? null }),
        ...(data.basePricePerMonth !== undefined && { basePricePerMonth: data.basePricePerMonth ?? null }),
        ...(data.basePricePerDayWithDriver !== undefined && { basePricePerDayWithDriver: data.basePricePerDayWithDriver ?? null }),
        ...(data.basePricePerWeekWithDriver !== undefined && { basePricePerWeekWithDriver: data.basePricePerWeekWithDriver ?? null }),
        ...(data.basePricePerMonthWithDriver !== undefined && { basePricePerMonthWithDriver: data.basePricePerMonthWithDriver ?? null }),
        ...(data.category != null && { category: data.category as 'ECONOMY' | 'SUV' | 'LUXURY' | 'VAN' }),
        ...(data.transmission != null && { transmission: data.transmission as 'AUTOMATIC' | 'MANUAL' }),
        ...(data.seats != null && { seats: data.seats }),
        ...(data.fuelType !== undefined && { fuelType: data.fuelType ? (data.fuelType as 'PETROL' | 'DIESEL') : null }),
        ...(data.isActive != null && { isActive: data.isActive }),
      },
    });
    return {
      ...car,
      basePricePerDay: decimalToNumber(car.basePricePerDay),
      basePricePerWeek: car.basePricePerWeek != null ? decimalToNumber(car.basePricePerWeek) : null,
      basePricePerMonth: car.basePricePerMonth != null ? decimalToNumber(car.basePricePerMonth) : null,
      basePricePerDayWithDriver: car.basePricePerDayWithDriver != null ? decimalToNumber(car.basePricePerDayWithDriver) : null,
      basePricePerWeekWithDriver: car.basePricePerWeekWithDriver != null ? decimalToNumber(car.basePricePerWeekWithDriver) : null,
      basePricePerMonthWithDriver: car.basePricePerMonthWithDriver != null ? decimalToNumber(car.basePricePerMonthWithDriver) : null,
    };
  },

  async softDelete(id: string) {
    const existing = await prisma.car.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Car not found', 404);
    const images = await prisma.carImage.findMany({ where: { carId: id }, select: { imagePath: true } });
    const { deleteImageFiles } = await import('../../middlewares/upload.middleware.js');
    deleteImageFiles(images.map((img) => img.imagePath));
    await prisma.car.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Car deleted' };
  },

  async addImage(carId: string, imagePath: string, order?: number) {
    const car = await prisma.car.findFirst({ where: { id: carId, deletedAt: null } });
    if (!car) throw new AppError('Car not found', 404);
    const maxOrder = await prisma.carImage.findFirst({
      where: { carId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = order ?? (maxOrder ? maxOrder.order + 1 : 0);
    return prisma.carImage.create({
      data: { carId, imagePath, order: nextOrder },
    });
  },

  async removeImage(carId: string, imageId: string) {
    const img = await prisma.carImage.findFirst({
      where: { id: imageId, carId, deletedAt: null },
    });
    if (!img) throw new AppError('Image not found', 404);
    const { deleteImageFile } = await import('../../middlewares/upload.middleware.js');
    deleteImageFile(img.imagePath);
    await prisma.carImage.update({ where: { id: imageId }, data: { deletedAt: new Date() } });
    return { message: 'Image removed' };
  },
};
