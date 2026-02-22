/**
 * Auth controller: validate body and call service.
 */

import { Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import {
  completeProfileSchema,
  registerSchema,
  type RegisterBody,
  type LoginBody,
  type RefreshBody,
  type VerifyEmailBody,
  type ResendOtpBody,
  type ForgotPasswordBody,
  type ResetPasswordBody,
  type CompleteProfileBody,
} from './auth.validators.js';
import passport from 'passport';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.js';
import { config } from '../../config/index.js';
import type { Role } from '@prisma/client';

export const authController = {
  async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const parsed = registerSchema.shape.body.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? 'Validation failed';
        return res.status(400).json({ success: false, message: msg });
      }
      const result = await authService.register(parsed.data);
      res.status(201).json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as LoginBody;
      const result = await authService.login(body);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as RefreshBody;
      const result = await authService.refresh(body);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async verifyEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as VerifyEmailBody;
      await authService.verifyEmail(body);
      res.json({ success: true, message: 'Email verified successfully' });
    } catch (e) {
      next(e);
    }
  },

  async resendOtp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as ResendOtpBody;
      const result = await authService.resendOtp(body);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async forgotPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as ForgotPasswordBody;
      const result = await authService.forgotPassword(body);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as ResetPasswordBody;
      await authService.resetPassword(body);
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (e) {
      next(e);
    }
  },

  async completeProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const parsed = completeProfileSchema.shape.body.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? 'Validation failed';
        return res.status(400).json({ success: false, message: msg });
      }
      const result = await authService.completeProfile(req.user.id, parsed.data);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const user = await authService.getProfile(req.user.id);
      res.json({ success: true, data: user });
    } catch (e) {
      next(e);
    }
  },

  googleInit(req: AuthRequest, res: Response, next: NextFunction) {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${config.FRONTEND_URL}/login?error=Google+OAuth+not+configured`);
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  },

  async googleCallback(req: AuthRequest, res: Response, next: NextFunction) {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${config.FRONTEND_URL}/login?error=Google+OAuth+not+configured`);
    }
    passport.authenticate(
      'google',
      { session: false },
      (err: Error | null, result: { user: { id: string; email: string; role: Role }; needsCompleteProfile: boolean } | undefined) => {
        if (err) {
          const frontendUrl = config.FRONTEND_URL;
          return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(err.message)}`);
        }
        if (!result?.user) {
          return res.redirect(`${config.FRONTEND_URL}/login?error=Google+auth+failed`);
        }
        const accessToken = signAccessToken({
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role,
        });
        const refreshToken = signRefreshToken({
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role,
        });
        const params = new URLSearchParams({
          accessToken,
          refreshToken,
          userId: result.user.id,
        });
        if (result.needsCompleteProfile) {
          params.set('completeProfile', '1');
        }
        res.redirect(`${config.FRONTEND_URL}/auth/callback?${params.toString()}`);
      }
    )(req, res, next);
  },
};
