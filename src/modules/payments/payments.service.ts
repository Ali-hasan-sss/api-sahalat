/**
 * Payments (Thawani): create session, save provider_session_id, webhook updates booking.
 */

import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { config } from '../../config/index.js';
import { decimalToNumber } from '../../utils/priceCalculator.js';

const THAWANI_BASE = config.THAWANI_BASE_URL;

export const paymentsService = {
  async createTripPaymentSession(bookingId: string, userId: string, amount: number) {
    const booking = await prisma.tripBooking.findFirst({
      where: { id: bookingId, userId, deletedAt: null, status: 'PENDING' },
    });
    if (!booking) throw new AppError('Booking not found or not pending', 404);
    const existingPayment = await prisma.payment.findFirst({
      where: { tripBookingId: bookingId, deletedAt: null },
    });
    if (existingPayment?.status === 'SUCCEEDED') throw new AppError('Booking already paid', 400);

    let providerSessionId: string | null = null;
    if (config.THAWANI_SECRET_KEY && THAWANI_BASE) {
      try {
        const res = await fetch(`${THAWANI_BASE}/checkout/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'thawani-api-key': config.THAWANI_SECRET_KEY,
          },
          body: JSON.stringify({
            client_reference_id: bookingId,
            mode: 'payment',
            products: [{ name: `Trip Booking ${bookingId}`, unit_amount: Math.round(amount * 1000), quantity: 1 }],
            success_url: `${config.CORS_ORIGIN}/bookings/success?booking=${bookingId}&type=trip`,
            cancel_url: `${config.CORS_ORIGIN}/bookings/cancel?booking=${bookingId}&type=trip`,
            metadata: { bookingId, type: 'TRIP_BOOKING' },
          }),
        });
        const data = (await res.json()) as { data?: { session_id?: string }; session_id?: string };
        providerSessionId = data.data?.session_id ?? data.session_id ?? null;
      } catch (e) {
        console.error('Thawani create session error:', e);
      }
    }
    if (!providerSessionId && config.THAWANI_SECRET_KEY) {
      throw new AppError('Failed to create payment session', 500);
    }

    const payment = await prisma.payment.upsert({
      where: { tripBookingId: bookingId },
      create: {
        tripBookingId: bookingId,
        amount: booking.finalPrice,
        currency: 'OMR',
        status: 'PENDING',
        providerSessionId,
      },
      update: {
        amount: booking.finalPrice,
        providerSessionId: providerSessionId ?? undefined,
        status: 'PENDING',
      },
    });

    const checkoutHost = new URL(THAWANI_BASE).origin;
    const redirectUrl = providerSessionId && config.THAWANI_PUBLISHABLE_KEY
      ? `${checkoutHost}/pay/${providerSessionId}?key=${config.THAWANI_PUBLISHABLE_KEY}`
      : null;

    return {
      paymentId: payment.id,
      sessionId: providerSessionId,
      amount: decimalToNumber(payment.amount),
      publishableKey: config.THAWANI_PUBLISHABLE_KEY,
      redirectUrl,
    };
  },

  async createCarPaymentSession(bookingId: string, userId: string, amount: number) {
    const booking = await prisma.carBooking.findFirst({
      where: { id: bookingId, userId, deletedAt: null, status: 'PENDING' },
    });
    if (!booking) throw new AppError('Booking not found or not pending', 404);
    const existingPayment = await prisma.payment.findFirst({
      where: { carBookingId: bookingId, deletedAt: null },
    });
    if (existingPayment?.status === 'SUCCEEDED') throw new AppError('Booking already paid', 400);

    let providerSessionId: string | null = null;
    if (config.THAWANI_SECRET_KEY && THAWANI_BASE) {
      try {
        const res = await fetch(`${THAWANI_BASE}/checkout/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'thawani-api-key': config.THAWANI_SECRET_KEY,
          },
          body: JSON.stringify({
            client_reference_id: bookingId,
            mode: 'payment',
            products: [{ name: `Car Booking ${bookingId}`, unit_amount: Math.round(amount * 1000), quantity: 1 }],
            success_url: `${config.CORS_ORIGIN}/bookings/success?booking=${bookingId}&type=car`,
            cancel_url: `${config.CORS_ORIGIN}/bookings/cancel?booking=${bookingId}&type=car`,
            metadata: { bookingId, type: 'CAR_BOOKING' },
          }),
        });
        const data = (await res.json()) as { data?: { session_id?: string }; session_id?: string };
        providerSessionId = data.data?.session_id ?? data.session_id ?? null;
      } catch (e) {
        console.error('Thawani create session error:', e);
      }
    }
    if (!providerSessionId && config.THAWANI_SECRET_KEY) {
      throw new AppError('Failed to create payment session', 500);
    }

    const payment = await prisma.payment.upsert({
      where: { carBookingId: bookingId },
      create: {
        carBookingId: bookingId,
        amount: booking.finalPrice,
        currency: 'OMR',
        status: 'PENDING',
        providerSessionId,
      },
      update: {
        amount: booking.finalPrice,
        providerSessionId: providerSessionId ?? undefined,
        status: 'PENDING',
      },
    });

    return {
      paymentId: payment.id,
      sessionId: providerSessionId,
      amount: decimalToNumber(payment.amount),
      publishableKey: config.THAWANI_PUBLISHABLE_KEY,
    };
  },

  async handleWebhook(payload: unknown, signature: string | undefined): Promise<{ received: boolean }> {
    const secret = config.THAWANI_WEBHOOK_SECRET;
    if (secret && signature) {
      const crypto = await import('node:crypto');
      const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      if (signature !== expected) {
        throw new AppError('Invalid webhook signature', 401);
      }
    }

    const body = payload as { event?: string; data?: { session_id?: string; payment_status?: string }; session_id?: string; type?: string };
    const event = body.event ?? body.type;
    const sessionId = body.data?.session_id ?? body.session_id;

    await prisma.webhookLog.create({
      data: {
        event: String(event ?? 'unknown'),
        payload: body as object,
        signature: signature ?? null,
        verified: Boolean(secret && signature),
      },
    });

    if (event === 'payment_success' || body.data?.payment_status === 'paid') {
      const payment = await prisma.payment.findFirst({
        where: { providerSessionId: sessionId, deletedAt: null },
      });
      if (payment) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED' } });
        if (payment.tripBookingId) {
          await prisma.tripBooking.update({ where: { id: payment.tripBookingId }, data: { status: 'PAID' } });
        }
        if (payment.carBookingId) {
          await prisma.carBooking.update({ where: { id: payment.carBookingId }, data: { status: 'PAID' } });
        }
      }
    }

    return { received: true };
  },
};
