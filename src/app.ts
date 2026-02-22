/**
 * Express application setup.
 * Mounts routes, middlewares, and global error handler.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/index.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { tripsRoutes } from './modules/trips/trips.routes.js';
import { landmarksRoutes } from './modules/landmarks/landmarks.routes.js';
import { carsRoutes } from './modules/cars/cars.routes.js';
import { bookingsRoutes } from './modules/bookings/bookings.routes.js';
import { reviewsRoutes } from './modules/reviews/reviews.routes.js';
import { favoritesRoutes } from './modules/favorites/favorites.routes.js';
import { discountsRoutes } from './modules/discounts/discounts.routes.js';
import { couponsRoutes } from './modules/coupons/coupons.routes.js';
import { paymentsRoutes } from './modules/payments/payments.routes.js';
import { AppError } from './middlewares/errorHandler.js';

const app = express();

// CORS
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded images
const uploadsPath = path.join(process.cwd(), config.UPLOAD_DIR);
app.use(`/${config.UPLOAD_DIR}`, express.static(uploadsPath));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/landmarks', landmarksRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/discounts', discountsRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/payments', paymentsRoutes);

// 404
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('Not Found', 404));
});

// Global error handler (must be last)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: AppError | Error, req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Internal Server Error';
  if (status >= 500) {
    console.error('[Error]', err);
  }
  res.status(status).json({ success: false, message });
});

export default app;
