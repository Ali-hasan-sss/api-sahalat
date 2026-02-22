/**
 * Auth routes: register, login, refresh, verify OTP, reset password, Google OAuth.
 * Rate limit applied to OTP/resend and forgot password.
 */

import './passport.google.js';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../config/index.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authController } from './auth.controller.js';

const router = Router();

const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.OTP_RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many OTP attempts, try again later' },
});

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

router.post('/verify-email', otpRateLimiter, authController.verifyEmail);
router.post('/resend-otp', otpRateLimiter, authController.resendOtp);

router.post('/forgot-password', otpRateLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/me', authenticate, authController.me);
router.post('/complete-profile', authenticate, authController.completeProfile);

router.get('/google', authController.googleInit);
router.get('/google/callback', authController.googleCallback);

export const authRoutes = router;
