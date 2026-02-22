/**
 * Auth service: register, login, refresh, OTP verify, password reset.
 * OTP and reset tokens stored hashed. Rate limiting applied at route level.
 */

import crypto from 'node:crypto';
import { prisma } from '../../utils/prisma.js';
import { hashPassword, comparePassword, hashToken, compareToken } from '../../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { Role } from '@prisma/client';
import type {
  RegisterBody,
  LoginBody,
  RefreshBody,
  VerifyEmailBody,
  ResendOtpBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  CompleteProfileBody,
} from './auth.validators.js';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = config.OTP_EXPIRY_MINUTES * 60 * 1000;
const PASSWORD_RESET_EXPIRY_MS = config.PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const authService = {
  async register(data: RegisterBody) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), deletedAt: null },
    });
    if (existing) {
      throw new AppError('Email already registered', 400);
    }
    const hashed = await hashPassword(data.password);
    const name = `${data.firstName} ${data.lastName}`.trim();
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashed,
        name,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        country: data.country ?? null,
        role: 'USER',
        isVerified: false,
      },
    });
    const otp = generateOtp();
    const tokenHash = await hashToken(otp);
    await prisma.userToken.create({
      data: {
        userId: user.id,
        type: 'OTP_VERIFY',
        tokenHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
    });
    // In production: send OTP via email/SMS. Here we return it for dev only.
    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email, role: user.role });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, isVerified: user.isVerified },
      accessToken,
      refreshToken,
      expiresIn: config.JWT_ACCESS_EXPIRY,
      ...(config.NODE_ENV === 'development' && { otpForDev: otp }),
    };
  },

  async login(data: LoginBody) {
    const user = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), deletedAt: null },
    });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }
    const valid = await comparePassword(data.password, user.password);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }
    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email, role: user.role });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, isVerified: user.isVerified },
      accessToken,
      refreshToken,
      expiresIn: config.JWT_ACCESS_EXPIRY,
    };
  },

  async refresh(data: RefreshBody) {
    const payload = verifyRefreshToken(data.refreshToken);
    const user = await prisma.user.findFirst({
      where: { id: payload.userId, deletedAt: null },
    });
    if (!user) {
      throw new AppError('User not found', 401);
    }
    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email, role: user.role });
    return {
      accessToken,
      refreshToken,
      expiresIn: config.JWT_ACCESS_EXPIRY,
    };
  },

  async verifyEmail(data: VerifyEmailBody) {
    const user = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), deletedAt: null },
      include: { tokens: { where: { type: 'OTP_VERIFY' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const tokenRecord = user.tokens[0];
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new AppError('OTP expired or not found', 400);
    }
    const valid = await compareToken(data.otp, tokenRecord.tokenHash);
    if (!valid) {
      throw new AppError('Invalid OTP', 400);
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { isVerified: true } }),
      prisma.userToken.update({ where: { id: tokenRecord.id }, data: { deletedAt: new Date() } }),
    ]);
    return { message: 'Email verified successfully' };
  },

  async resendOtp(data: ResendOtpBody) {
    const user = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), deletedAt: null },
    });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const otp = generateOtp();
    const tokenHash = await hashToken(otp);
    await prisma.userToken.create({
      data: {
        userId: user.id,
        type: 'OTP_VERIFY',
        tokenHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
    });
    // TODO: send email/SMS with otp
    return {
      message: 'OTP sent',
      ...(config.NODE_ENV === 'development' && { otpForDev: otp }),
    };
  },

  async forgotPassword(data: ForgotPasswordBody) {
    const user = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), deletedAt: null },
    });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }
    const token = generateResetToken();
    const tokenHash = await hashToken(token);
    await prisma.userToken.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
      },
    });
    // TODO: send email with link containing token
    return {
      message: 'If the email exists, a reset link has been sent',
      ...(config.NODE_ENV === 'development' && { resetTokenForDev: token }),
    };
  },

  async completeProfile(userId: string, data: CompleteProfileBody) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const updates: {
      firstName: string;
      lastName: string;
      phone: string;
      country: string;
      name: string;
      password?: string;
    } = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      country: data.country,
      name: `${data.firstName} ${data.lastName}`.trim(),
    };
    if (data.password) {
      updates.password = await hashPassword(data.password);
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });
    return {
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        country: updated.country,
        role: updated.role,
        isVerified: updated.isVerified,
      },
    };
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  },

  async resetPassword(data: ResetPasswordBody) {
    const tokens = await prisma.userToken.findMany({
      where: { type: 'PASSWORD_RESET', deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    for (const t of tokens) {
      if (t.expiresAt < new Date()) continue;
      const valid = await compareToken(data.token, t.tokenHash);
      if (valid) {
        const hashed = await hashPassword(data.newPassword);
        await prisma.$transaction([
          prisma.user.update({ where: { id: t.userId }, data: { password: hashed } }),
          prisma.userToken.update({ where: { id: t.id }, data: { deletedAt: new Date() } }),
        ]);
        return { message: 'Password reset successfully' };
      }
    }
    throw new AppError('Invalid or expired reset token', 400);
  },
};
