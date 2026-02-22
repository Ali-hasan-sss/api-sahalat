/**
 * Coupons: CRUD (admin), validate (server-side in bookings).
 * Supports PERCENTAGE | FIXED, min booking amount, max usages, expiry.
 */

import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { decimalToNumber } from '../../utils/priceCalculator.js';
import type { DiscountValueType, Prisma } from '@prisma/client';

export type CreateCouponInput = {
  code: string;
  discountType: DiscountValueType;
  value: number;
  minBookingAmount?: number | null;
  maxUsages?: number | null;
  expiresAt: Date;
  isActive?: boolean;
};

export const couponsService = {
  async list(query: { page?: number; limit?: number; isActive?: boolean }) {
    const { page = 1, limit = 20, isActive } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.CouponWhereInput = { deletedAt: null };
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coupon.count({ where }),
    ]);
    const list = items.map((c) => ({
      ...c,
      value: decimalToNumber(c.value),
      minBookingAmount: c.minBookingAmount != null ? decimalToNumber(c.minBookingAmount) : null,
    }));
    return { items: list, total, page, limit };
  },

  async getById(id: string) {
    const coupon = await prisma.coupon.findFirst({
      where: { id, deletedAt: null },
    });
    if (!coupon) throw new AppError('Coupon not found', 404);
    return {
      ...coupon,
      value: decimalToNumber(coupon.value),
      minBookingAmount: coupon.minBookingAmount != null ? decimalToNumber(coupon.minBookingAmount) : null,
    };
  },

  async getByCode(code: string) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), deletedAt: null },
    });
    if (!coupon) throw new AppError('Coupon not found', 404);
    return {
      ...coupon,
      value: decimalToNumber(coupon.value),
      minBookingAmount: coupon.minBookingAmount != null ? decimalToNumber(coupon.minBookingAmount) : null,
    };
  },

  async create(data: CreateCouponInput) {
    const existing = await prisma.coupon.findFirst({
      where: { code: data.code.toUpperCase(), deletedAt: null },
    });
    if (existing) throw new AppError('Coupon code already exists', 400);
    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        value: data.value,
        minBookingAmount: data.minBookingAmount ?? null,
        maxUsages: data.maxUsages ?? null,
        expiresAt: data.expiresAt,
        isActive: data.isActive ?? true,
      },
    });
    return {
      ...coupon,
      value: decimalToNumber(coupon.value),
      minBookingAmount: coupon.minBookingAmount != null ? decimalToNumber(coupon.minBookingAmount) : null,
    };
  },

  async update(id: string, data: Partial<CreateCouponInput>) {
    const existing = await prisma.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Coupon not found', 404);
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(data.code != null && { code: data.code.toUpperCase() }),
        ...(data.discountType != null && { discountType: data.discountType }),
        ...(data.value != null && { value: data.value }),
        ...(data.minBookingAmount != null && { minBookingAmount: data.minBookingAmount }),
        ...(data.maxUsages != null && { maxUsages: data.maxUsages }),
        ...(data.expiresAt != null && { expiresAt: data.expiresAt }),
        ...(data.isActive != null && { isActive: data.isActive }),
      },
    });
    return {
      ...coupon,
      value: decimalToNumber(coupon.value),
      minBookingAmount: coupon.minBookingAmount != null ? decimalToNumber(coupon.minBookingAmount) : null,
    };
  },

  async softDelete(id: string) {
    const existing = await prisma.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Coupon not found', 404);
    await prisma.coupon.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Coupon deleted' };
  },
};
