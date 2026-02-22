/**
 * JWT authentication and role-based access middlewares.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from './errorHandler.js';
import type { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
}

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: Role };
}

/**
 * Verify JWT access token and attach user to request.
 */
export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    next(new AppError('Unauthorized', 401));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
    if (decoded.type !== 'access') {
      next(new AppError('Invalid token type', 401));
      return;
    }
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

/**
 * Restrict route to ADMIN only.
 */
export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Unauthorized', 401));
    return;
  }
  if (req.user.role !== 'ADMIN') {
    next(new AppError('Forbidden', 403));
    return;
  }
  next();
}

/**
 * Optional auth: attach user if valid token present, otherwise continue without user.
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
    if (decoded.type === 'access') {
      req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    }
  } catch {
    // ignore invalid token
  }
  next();
}
