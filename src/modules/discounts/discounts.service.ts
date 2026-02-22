/**
 * Admin discounts: CRUD for TRIP | CAR discounts (PERCENTAGE | FIXED).
 */

import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { decimalToNumber, applyDiscount } from '../../utils/priceCalculator.js';
import type { DiscountType, DiscountValueType } from '@prisma/client';

export type ActiveDiscount = {
  id: string;
  discountType: DiscountValueType;
  value: number;
  startDate: Date;
  endDate: Date;
};

export type CreateDiscountInput = {
  type: DiscountType;
  referenceId: string;
  discountType: DiscountValueType;
  value: number;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
};

export const discountsService = {
  async list(query: { type?: DiscountType; referenceId?: string; page?: number; limit?: number }) {
    const { type, referenceId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where = { deletedAt: null as Date | null };
    if (type) (where as { type?: DiscountType }).type = type;
    if (referenceId) (where as { referenceId?: string }).referenceId = referenceId;

    const [items, total] = await Promise.all([
      prisma.discount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.discount.count({ where }),
    ]);
    const list = await Promise.all(
      items.map(async (d) => {
        const val = decimalToNumber(d.value);
        let referenceBasePrice: number | null = null;
        let calculatedDiscountAmount: number | null = null;
        if (d.type === 'TRIP') {
          const trip = await prisma.trip.findFirst({
            where: { id: d.referenceId, deletedAt: null },
            select: { basePrice: true },
          });
          if (trip) {
            referenceBasePrice = decimalToNumber(trip.basePrice);
            calculatedDiscountAmount = applyDiscount(referenceBasePrice, d.discountType, val);
          }
        } else {
          const car = await prisma.car.findFirst({
            where: { id: d.referenceId, deletedAt: null },
            select: { basePricePerDay: true },
          });
          if (car) {
            referenceBasePrice = decimalToNumber(car.basePricePerDay);
            calculatedDiscountAmount = applyDiscount(referenceBasePrice, d.discountType, val);
          }
        }
        return {
          ...d,
          value: val,
          referenceBasePrice,
          calculatedDiscountAmount,
        };
      })
    );
    return { items: list, total, page, limit };
  },

  async getById(id: string) {
    const discount = await prisma.discount.findFirst({
      where: { id, deletedAt: null },
    });
    if (!discount) throw new AppError('Discount not found', 404);
    const val = decimalToNumber(discount.value);
    let referenceBasePrice: number | null = null;
    let calculatedDiscountAmount: number | null = null;
    if (discount.type === 'TRIP') {
      const trip = await prisma.trip.findFirst({
        where: { id: discount.referenceId, deletedAt: null },
        select: { basePrice: true },
      });
      if (trip) {
        referenceBasePrice = decimalToNumber(trip.basePrice);
        calculatedDiscountAmount = applyDiscount(referenceBasePrice, discount.discountType, val);
      }
    } else {
      const car = await prisma.car.findFirst({
        where: { id: discount.referenceId, deletedAt: null },
        select: { basePricePerDay: true },
      });
      if (car) {
        referenceBasePrice = decimalToNumber(car.basePricePerDay);
        calculatedDiscountAmount = applyDiscount(referenceBasePrice, discount.discountType, val);
      }
    }
    return {
      ...discount,
      value: val,
      referenceBasePrice,
      calculatedDiscountAmount,
    };
  },

  async create(data: CreateDiscountInput) {
    if (data.type === 'TRIP') {
      const trip = await prisma.trip.findFirst({ where: { id: data.referenceId, deletedAt: null } });
      if (!trip) throw new AppError('Trip not found', 404);
    } else {
      const car = await prisma.car.findFirst({ where: { id: data.referenceId, deletedAt: null } });
      if (!car) throw new AppError('Car not found', 404);
    }
    const discount = await prisma.discount.create({
      data: {
        type: data.type,
        referenceId: data.referenceId,
        discountType: data.discountType,
        value: data.value,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive ?? true,
      },
    });
    return this.enrichDiscount(discount);
  },

  async update(id: string, data: Partial<CreateDiscountInput>) {
    const existing = await prisma.discount.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Discount not found', 404);
    const discount = await prisma.discount.update({
      where: { id },
      data: {
        ...(data.type != null && { type: data.type }),
        ...(data.referenceId != null && { referenceId: data.referenceId }),
        ...(data.discountType != null && { discountType: data.discountType }),
        ...(data.value != null && { value: data.value }),
        ...(data.startDate != null && { startDate: data.startDate }),
        ...(data.endDate != null && { endDate: data.endDate }),
        ...(data.isActive != null && { isActive: data.isActive }),
      },
    });
    return this.enrichDiscount(discount);
  },

  async softDelete(id: string) {
    const existing = await prisma.discount.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Discount not found', 404);
    await prisma.discount.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Discount deleted' };
  },

  async enrichDiscount(d: { id: string; type: DiscountType; referenceId: string; discountType: DiscountValueType; value: unknown; startDate: Date; endDate: Date; isActive: boolean; createdAt: Date; updatedAt: Date; deletedAt: Date | null }) {
    const val = decimalToNumber(d.value as Parameters<typeof decimalToNumber>[0]);
    let referenceBasePrice: number | null = null;
    let calculatedDiscountAmount: number | null = null;
    if (d.type === 'TRIP') {
      const trip = await prisma.trip.findFirst({
        where: { id: d.referenceId, deletedAt: null },
        select: { basePrice: true },
      });
      if (trip) {
        referenceBasePrice = decimalToNumber(trip.basePrice);
        calculatedDiscountAmount = applyDiscount(referenceBasePrice, d.discountType, val);
      }
    } else {
      const car = await prisma.car.findFirst({
        where: { id: d.referenceId, deletedAt: null },
        select: { basePricePerDay: true },
      });
      if (car) {
        referenceBasePrice = decimalToNumber(car.basePricePerDay);
        calculatedDiscountAmount = applyDiscount(referenceBasePrice, d.discountType, val);
      }
    }
    return {
      ...d,
      value: val,
      referenceBasePrice,
      calculatedDiscountAmount,
    };
  },

  /** Get active discount for a trip or car (for public API responses). */
  async getActiveForEntity(type: DiscountType, referenceId: string): Promise<ActiveDiscount | null> {
    const now = new Date();
    const discount = await prisma.discount.findFirst({
      where: {
        type,
        referenceId,
        deletedAt: null,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!discount) return null;
    return {
      id: discount.id,
      discountType: discount.discountType,
      value: decimalToNumber(discount.value),
      startDate: discount.startDate,
      endDate: discount.endDate,
    };
  },
};
