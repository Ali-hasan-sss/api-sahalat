/**
 * JWT creation and verification.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { Role } from '@prisma/client';
import type { JwtPayload } from '../middlewares/auth.middleware.js';

export function signAccessToken(payload: { userId: string; email: string; role: Role }): string {
  return jwt.sign(
    { ...payload, type: 'access' } as JwtPayload,
    config.JWT_ACCESS_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRY } as jwt.SignOptions
  );
}

export function signRefreshToken(payload: { userId: string; email: string; role: Role }): string {
  return jwt.sign(
    { ...payload, type: 'refresh' } as JwtPayload,
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRY } as jwt.SignOptions
  );
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}
