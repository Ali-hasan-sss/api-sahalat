/**
 * Bookings service: trip and car bookings, price calculation, payment session.
 * Final price = base - admin discount - coupon (server-side only).
 */

import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { calculateCarRentalBreakdown, calculateFinalPrice, decimalToNumber } from '../../utils/priceCalculator.js';
import type { DiscountValueType } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

export const bookingsService = {
  /** Get active admin discount for a trip or car (by referenceId and type) */
  async getActiveAdminDiscount(type: 'TRIP' | 'CAR', referenceId: string) {
    const now = new Date();
    const discount = await prisma.discount.findFirst({
      where: {
        type,
        referenceId,
        isActive: true,
        deletedAt: null,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!discount) return null;
    return {
      discountType: discount.discountType,
      value: decimalToNumber(discount.value),
    };
  },

  /** Validate coupon and return discount info if applicable */
  async validateCoupon(code: string, userId: string, basePrice: number) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), isActive: true, deletedAt: null, expiresAt: { gte: new Date() } },
    });
    if (!coupon) return null;
    if (coupon.maxUsages != null && coupon.usedCount >= coupon.maxUsages) return null;
    const minAmount = coupon.minBookingAmount != null ? decimalToNumber(coupon.minBookingAmount) : null;
    if (minAmount != null && basePrice < minAmount) return null;
    return {
      couponId: coupon.id,
      discountType: coupon.discountType as DiscountValueType,
      value: decimalToNumber(coupon.value),
      minBookingAmount: minAmount,
    };
  },

  /** Create trip booking (PENDING), compute final price, optionally apply coupon */
  async createTripBooking(
    userId: string,
    tripId: string,
    data: { startDate: Date; participants?: number; adults?: number; children?: number; couponCode?: string }
  ) {
    const trip = await prisma.trip.findFirst({ where: { id: tripId, deletedAt: null, isActive: true } });
    if (!trip) throw new AppError('Trip not found', 404);
    const adults = data.adults ?? 1;
    const children = data.children ?? 0;
    const participants = data.participants ?? Math.max(1, adults + children);
    const basePrice = decimalToNumber(trip.basePrice) * participants;

    const adminDiscount = await this.getActiveAdminDiscount('TRIP', tripId);
    let couponInput = null;
    if (data.couponCode) {
      const coupon = await this.validateCoupon(data.couponCode, userId, basePrice);
      if (coupon) couponInput = { discountType: coupon.discountType, value: coupon.value, minBookingAmount: coupon.minBookingAmount };
    }

    const result = calculateFinalPrice({
      basePrice,
      adminDiscount: adminDiscount ?? undefined,
      coupon: couponInput ?? undefined,
    });

    const couponRecord = data.couponCode
      ? await prisma.coupon.findFirst({ where: { code: data.couponCode.toUpperCase(), deletedAt: null } })
      : null;

    const booking = await prisma.tripBooking.create({
      data: {
        userId,
        tripId,
        startDate: data.startDate,
        participants,
        adults,
        children,
        basePrice,
        discountAmount: result.adminDiscountAmount,
        couponAmount: result.couponDiscountAmount,
        finalPrice: result.finalPrice,
        couponId: couponRecord?.id ?? null,
        status: 'PENDING',
      },
    });

    if (couponRecord && result.couponDiscountAmount > 0) {
      await prisma.couponUsage.create({
        data: {
          couponId: couponRecord.id,
          userId,
          bookingType: 'TRIP_BOOKING',
          bookingId: booking.id,
          discountAmount: result.couponDiscountAmount,
        },
      });
      await prisma.coupon.update({
        where: { id: couponRecord.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return {
      booking: {
        id: booking.id,
        tripId,
        startDate: booking.startDate,
        participants: booking.participants,
        adults: booking.adults,
        children: booking.children,
        basePrice: booking.basePrice,
        discountAmount: booking.discountAmount,
        couponAmount: booking.couponAmount,
        finalPrice: booking.finalPrice,
        status: booking.status,
      },
      paymentAmount: result.finalPrice,
    };
  },

  /** Price preview for car rental (for display before booking) */
  async getCarRentalPricePreview(
    userId: string,
    carId: string,
    data: { startDate: Date; endDate: Date; withDriver?: boolean; couponCode?: string }
  ) {
    const car = await prisma.car.findFirst({ where: { id: carId, deletedAt: null, isActive: true } });
    if (!car) throw new AppError('Car not found', 404);
    const withDriver = data.withDriver ?? false;
    const days = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (24 * 60 * 60 * 1000)) || 1;
    const pricePerDay = withDriver && car.basePricePerDayWithDriver != null
      ? decimalToNumber(car.basePricePerDayWithDriver)
      : decimalToNumber(car.basePricePerDay);
    const pricePerWeek = withDriver && car.basePricePerWeekWithDriver != null
      ? decimalToNumber(car.basePricePerWeekWithDriver)
      : (car.basePricePerWeek != null ? decimalToNumber(car.basePricePerWeek) : null);
    const pricePerMonth = withDriver && car.basePricePerMonthWithDriver != null
      ? decimalToNumber(car.basePricePerMonthWithDriver)
      : (car.basePricePerMonth != null ? decimalToNumber(car.basePricePerMonth) : null);
    const breakdown = calculateCarRentalBreakdown(days, pricePerDay, pricePerWeek, pricePerMonth);

    const adminDiscount = await this.getActiveAdminDiscount('CAR', carId);
    let couponInput = null;
    if (data.couponCode) {
      const coupon = await this.validateCoupon(data.couponCode, userId, breakdown.basePrice);
      if (coupon) couponInput = { discountType: coupon.discountType, value: coupon.value, minBookingAmount: coupon.minBookingAmount };
    }

    const result = calculateFinalPrice({
      basePrice: breakdown.basePrice,
      adminDiscount: adminDiscount ?? undefined,
      coupon: couponInput ?? undefined,
    });

    return {
      days,
      breakdown: {
        months: breakdown.months,
        weeks: breakdown.weeks,
        days: breakdown.days,
        monthAmount: breakdown.monthAmount,
        weekAmount: breakdown.weekAmount,
        dayAmount: breakdown.dayAmount,
      },
      basePrice: breakdown.basePrice,
      adminDiscountAmount: result.adminDiscountAmount,
      couponDiscountAmount: result.couponDiscountAmount,
      finalPrice: result.finalPrice,
    };
  },

  /** Create car booking (PENDING), with optional driver, license upload */
  async createCarBooking(
    userId: string,
    carId: string,
    data: {
      pickupLocation: string;
      returnLocation: string;
      startDate: Date;
      endDate: Date;
      withDriver: boolean;
      licenseImagePath?: string;
      licenseIssuer?: string;
      couponCode?: string;
    }
  ) {
    const car = await prisma.car.findFirst({ where: { id: carId, deletedAt: null, isActive: true } });
    if (!car) throw new AppError('Car not found', 404);

    if (!data.withDriver) {
      if (!data.licenseImagePath?.trim()) throw new AppError('Driving license image is required when renting without driver', 400);
      if (!data.licenseIssuer?.trim()) throw new AppError('License issuer is required when renting without driver', 400);
    }

    const days = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (24 * 60 * 60 * 1000)) || 1;
    const withDriver = data.withDriver ?? false;
    const pricePerDay = withDriver && car.basePricePerDayWithDriver != null
      ? decimalToNumber(car.basePricePerDayWithDriver)
      : decimalToNumber(car.basePricePerDay);
    const pricePerWeek = withDriver && car.basePricePerWeekWithDriver != null
      ? decimalToNumber(car.basePricePerWeekWithDriver)
      : (car.basePricePerWeek != null ? decimalToNumber(car.basePricePerWeek) : null);
    const pricePerMonth = withDriver && car.basePricePerMonthWithDriver != null
      ? decimalToNumber(car.basePricePerMonthWithDriver)
      : (car.basePricePerMonth != null ? decimalToNumber(car.basePricePerMonth) : null);
    const breakdown = calculateCarRentalBreakdown(days, pricePerDay, pricePerWeek, pricePerMonth);
    const basePrice = breakdown.basePrice;

    const adminDiscount = await this.getActiveAdminDiscount('CAR', carId);
    let couponInput = null;
    if (data.couponCode) {
      const coupon = await this.validateCoupon(data.couponCode, userId, basePrice);
      if (coupon) couponInput = { discountType: coupon.discountType, value: coupon.value, minBookingAmount: coupon.minBookingAmount };
    }

    const result = calculateFinalPrice({
      basePrice,
      adminDiscount: adminDiscount ?? undefined,
      coupon: couponInput ?? undefined,
    });

    const couponRecord = data.couponCode
      ? await prisma.coupon.findFirst({ where: { code: data.couponCode.toUpperCase(), deletedAt: null } })
      : null;

    const booking = await prisma.carBooking.create({
      data: {
        userId,
        carId,
        pickupLocation: data.pickupLocation.trim(),
        returnLocation: data.returnLocation.trim(),
        startDate: data.startDate,
        endDate: data.endDate,
        withDriver: data.withDriver,
        licenseImagePath: data.licenseImagePath?.trim() ?? null,
        licenseIssuer: data.licenseIssuer?.trim() ?? null,
        basePrice,
        discountAmount: result.adminDiscountAmount,
        couponAmount: result.couponDiscountAmount,
        finalPrice: result.finalPrice,
        couponId: couponRecord?.id ?? null,
        status: 'PENDING',
      },
    });

    if (couponRecord && result.couponDiscountAmount > 0) {
      await prisma.couponUsage.create({
        data: {
          couponId: couponRecord.id,
          userId,
          bookingType: 'CAR_BOOKING',
          bookingId: booking.id,
          discountAmount: result.couponDiscountAmount,
        },
      });
      await prisma.coupon.update({
        where: { id: couponRecord.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return {
      booking: {
        id: booking.id,
        carId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        withDriver: booking.withDriver,
        basePrice: booking.basePrice,
        discountAmount: booking.discountAmount,
        couponAmount: booking.couponAmount,
        finalPrice: booking.finalPrice,
        status: booking.status,
      },
      paymentAmount: result.finalPrice,
    };
  },

  async getTripBookingById(bookingId: string, userId: string, isAdmin: boolean) {
    const booking = await prisma.tripBooking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { trip: true, user: { select: { id: true, email: true, name: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (!isAdmin && booking.userId !== userId) throw new AppError('Forbidden', 403);
    return {
      ...booking,
      basePrice: decimalToNumber(booking.basePrice),
      discountAmount: decimalToNumber(booking.discountAmount),
      couponAmount: decimalToNumber(booking.couponAmount),
      finalPrice: decimalToNumber(booking.finalPrice),
    };
  },

  async getCarBookingById(bookingId: string, userId: string, isAdmin: boolean) {
    const booking = await prisma.carBooking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { car: true, user: { select: { id: true, email: true, name: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (!isAdmin && booking.userId !== userId) throw new AppError('Forbidden', 403);
    return {
      ...booking,
      basePrice: decimalToNumber(booking.basePrice),
      discountAmount: decimalToNumber(booking.discountAmount),
      couponAmount: decimalToNumber(booking.couponAmount),
      finalPrice: decimalToNumber(booking.finalPrice),
    };
  },

  async listMyTripBookings(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.tripBooking.findMany({
        where: { userId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          trip: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              route: true,
              routeAr: true,
              durationDays: true,
              images: {
                where: { deletedAt: null },
                take: 1,
                orderBy: { order: 'asc' },
                select: { imagePath: true },
              },
            },
          },
        },
      }),
      prisma.tripBooking.count({ where: { userId, deletedAt: null } }),
    ]);
    const tripIds = items.map((b) => b.tripId);
    const userReviews = tripIds.length
      ? await prisma.tripReview.findMany({
          where: { userId, tripId: { in: tripIds }, deletedAt: null },
          select: { tripId: true, rating: true, comment: true, id: true },
        })
      : [];
    const reviewMap = new Map(userReviews.map((r) => [r.tripId, r]));

    const list = items.map((b) => {
      const canReviewStatuses = ['PENDING', 'PAID'];
      const userReview = canReviewStatuses.includes(b.status) ? reviewMap.get(b.tripId) : null;
      return {
        ...b,
        basePrice: decimalToNumber(b.basePrice),
        finalPrice: decimalToNumber(b.finalPrice),
        canReview: canReviewStatuses.includes(b.status) && !userReview,
        userReview: userReview ? { id: userReview.id, rating: userReview.rating, comment: userReview.comment } : null,
      };
    });
    return { items: list, total, page, limit };
  },

  async listMyCarBookings(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.carBooking.findMany({
        where: { userId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          car: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              images: {
                where: { deletedAt: null },
                take: 1,
                orderBy: { order: 'asc' },
                select: { imagePath: true },
              },
            },
          },
        },
      }),
      prisma.carBooking.count({ where: { userId, deletedAt: null } }),
    ]);
    const carIds = items.map((b) => b.carId);
    const userReviews = carIds.length
      ? await prisma.carReview.findMany({
          where: { userId, carId: { in: carIds }, deletedAt: null },
          select: { carId: true, rating: true, comment: true, id: true },
        })
      : [];
    const reviewMap = new Map(userReviews.map((r) => [r.carId, r]));

    const list = items.map((b) => {
      const canReviewStatuses = ['PENDING', 'PAID'];
      const userReview = canReviewStatuses.includes(b.status) ? reviewMap.get(b.carId) : null;
      return {
        ...b,
        basePrice: decimalToNumber(b.basePrice),
        finalPrice: decimalToNumber(b.finalPrice),
        canReview: canReviewStatuses.includes(b.status) && !userReview,
        userReview: userReview ? { id: userReview.id, rating: userReview.rating, comment: userReview.comment } : null,
      };
    });
    return { items: list, total, page, limit };
  },

  async listAllTripBookings(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.tripBooking.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { trip: { select: { id: true, title: true } }, user: { select: { id: true, email: true, name: true } } },
      }),
      prisma.tripBooking.count({ where: { deletedAt: null } }),
    ]);
    return { items, total, page, limit };
  },

  async listAllCarBookings(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.carBooking.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { car: { select: { id: true, name: true } }, user: { select: { id: true, email: true, name: true } } },
      }),
      prisma.carBooking.count({ where: { deletedAt: null } }),
    ]);
    return { items, total, page, limit };
  },
};
