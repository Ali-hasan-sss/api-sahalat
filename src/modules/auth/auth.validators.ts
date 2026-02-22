/**
 * Auth request validation schemas (Zod).
 */

import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    phone: z.string().min(5, 'Phone number is required'),
    country: z.string().min(2, 'Country is required'),
    name: z.string().optional(), // legacy, computed from firstName+lastName
  }),
});

export const completeProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    phone: z.string().min(5, 'Phone number is required'),
    country: z.string().min(2, 'Country is required'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export type RegisterBody = z.infer<typeof registerSchema>['body'];
export type CompleteProfileBody = z.infer<typeof completeProfileSchema>['body'];
export type LoginBody = z.infer<typeof loginSchema>['body'];
export type RefreshBody = z.infer<typeof refreshSchema>['body'];
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>['body'];
export type ResendOtpBody = z.infer<typeof resendOtpSchema>['body'];
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>['body'];
