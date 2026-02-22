/**
 * Final price calculation: base - admin discount - coupon discount.
 * All pricing logic must run on the server only.
 */

import { Decimal } from '@prisma/client/runtime/library';
import type { DiscountValueType } from '@prisma/client';

export interface AdminDiscountInput {
  discountType: DiscountValueType;
  value: number;
}

export interface CouponInput {
  discountType: DiscountValueType;
  value: number;
  minBookingAmount: number | null;
}

export interface CalculateFinalPriceInput {
  basePrice: number;
  adminDiscount?: AdminDiscountInput | null;
  coupon?: CouponInput | null;
}

export interface CalculateFinalPriceResult {
  basePrice: number;
  adminDiscountAmount: number;
  couponDiscountAmount: number;
  finalPrice: number;
}

/**
 * Apply a single discount (percentage or fixed) to a price. Returns the discount amount.
 */
export function applyDiscount(price: number, discountType: DiscountValueType, value: number): number {
  if (value <= 0) return 0;
  if (discountType === 'PERCENTAGE') {
    return Math.min(price * (value / 100), price);
  }
  return Math.min(value, price);
}

/** Apply discount to a price and return the discounted price. */
export function applyDiscountToPrice(price: number, discountType: DiscountValueType, value: number): number {
  const amount = applyDiscount(price, discountType, value);
  return Math.round(Math.max(0, price - amount) * 100) / 100;
}

/**
 * Calculate final price from base price, optional admin discount, and optional coupon.
 * Order: basePrice, then subtract admin discount, then subtract coupon from remaining amount.
 */
export function calculateFinalPrice(input: CalculateFinalPriceInput): CalculateFinalPriceResult {
  const { basePrice, adminDiscount, coupon } = input;
  let runningTotal = basePrice;
  let adminDiscountAmount = 0;
  let couponDiscountAmount = 0;

  if (adminDiscount && (adminDiscount.discountType === 'PERCENTAGE' || adminDiscount.discountType === 'FIXED')) {
    adminDiscountAmount = applyDiscount(runningTotal, adminDiscount.discountType, adminDiscount.value);
    runningTotal = Math.max(0, runningTotal - adminDiscountAmount);
  }

  if (coupon) {
    if (coupon.minBookingAmount != null && basePrice < coupon.minBookingAmount) {
      // Coupon not applicable - min not met
    } else {
      couponDiscountAmount = applyDiscount(runningTotal, coupon.discountType, coupon.value);
      runningTotal = Math.max(0, runningTotal - couponDiscountAmount);
    }
  }

  return {
    basePrice,
    adminDiscountAmount,
    couponDiscountAmount,
    finalPrice: Math.round(runningTotal * 100) / 100,
  };
}

/** Decimal to number helper */
export function decimalToNumber(d: Decimal | number): number {
  if (typeof d === 'number') return d;
  return Number(d.toString());
}

export interface CarRentalBreakdown {
  months: number;
  weeks: number;
  days: number;
  monthAmount: number;
  weekAmount: number;
  dayAmount: number;
  basePrice: number;
}

/**
 * Calculate car rental base price and breakdown from days using monthly > weekly > daily.
 * 37 days = 1 month + 1 week; 10 days = 1 week + 3 days.
 */
export function calculateCarRentalBasePrice(
  days: number,
  pricePerDay: number,
  pricePerWeek: number | null | undefined,
  pricePerMonth: number | null | undefined
): number {
  const r = calculateCarRentalBreakdown(days, pricePerDay, pricePerWeek, pricePerMonth);
  return r.basePrice;
}

/**
 * Same logic but returns full breakdown (months, weeks, days + amounts).
 */
export function calculateCarRentalBreakdown(
  days: number,
  pricePerDay: number,
  pricePerWeek: number | null | undefined,
  pricePerMonth: number | null | undefined
): CarRentalBreakdown {
  let months = 0;
  let weeks = 0;
  let remaining = days <= 0 ? 0 : days;
  let monthAmount = 0;
  let weekAmount = 0;
  let dayAmount = 0;

  if (pricePerMonth != null && pricePerMonth > 0 && remaining > 0) {
    months = Math.floor(remaining / 30);
    monthAmount = months * pricePerMonth;
    remaining = remaining % 30;
  }

  if (pricePerWeek != null && pricePerWeek > 0 && remaining > 0) {
    weeks = Math.floor(remaining / 7);
    weekAmount = weeks * pricePerWeek;
    remaining = remaining % 7;
  }

  dayAmount = remaining * pricePerDay;
  const basePrice = Math.round((monthAmount + weekAmount + dayAmount) * 100) / 100;

  return {
    months,
    weeks,
    days: remaining,
    monthAmount: Math.round(monthAmount * 100) / 100,
    weekAmount: Math.round(weekAmount * 100) / 100,
    dayAmount: Math.round(dayAmount * 100) / 100,
    basePrice,
  };
}
