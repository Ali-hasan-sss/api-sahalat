/**
 * Central configuration from environment variables.
 * All env access should go through this module.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  OTP_EXPIRY_MINUTES: z.string().transform(Number).default('10'),
  OTP_RATE_LIMIT_MAX: z.string().transform(Number).default('5'),
  PASSWORD_RESET_EXPIRY_MINUTES: z.string().transform(Number).default('60'),

  THAWANI_SECRET_KEY: z.string().optional(),
  THAWANI_PUBLISHABLE_KEY: z.string().optional(),
  THAWANI_WEBHOOK_SECRET: z.string().optional(),
  THAWANI_BASE_URL: z.string().url().optional().default('https://checkout.thawani.om/api/v1'),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.string().transform(Number).default('5'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
