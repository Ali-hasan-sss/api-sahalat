/**
 * Passport Google OAuth 2.0 strategy.
 * Finds user by email or googleId, creates new user if not found (email verified).
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'node:crypto';
import { prisma } from '../../utils/prisma.js';
import { hashPassword } from '../../utils/hash.js';
import { config } from '../../config/index.js';

const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = config.GOOGLE_CLIENT_SECRET;

export interface GoogleProfile {
  id: string;
  email: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
}

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${config.FRONTEND_URL}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('No email from Google'), undefined);
          }

          const googleId = profile.id;
          const displayName = profile.displayName || '';
          const givenName = profile.name?.givenName || displayName.split(' ')[0] || '';
          const familyName = profile.name?.familyName || displayName.split(' ').slice(1).join(' ') || '';

          let user = await prisma.user.findFirst({
            where: {
              OR: [{ email }, { googleId }],
              deletedAt: null,
            },
          });

          if (user) {
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  googleId,
                  isVerified: true,
                  name: user.name || `${givenName} ${familyName}`.trim(),
                },
              });
            }
            return done(null, { user, needsCompleteProfile: false } as unknown as Express.User);
          }

          const randomPassword = crypto.randomBytes(32).toString('hex');
          const hashedPassword = await hashPassword(randomPassword);
          const name = `${givenName} ${familyName}`.trim() || displayName || email.split('@')[0];

          user = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              name,
              firstName: givenName || null,
              lastName: familyName || null,
              googleId,
              isVerified: true,
              role: 'USER',
            },
          });

          const missingProfile =
            !user.firstName || !user.lastName || !user.phone || !user.country;

          return done(null, {
            user,
            needsCompleteProfile: !!missingProfile,
          } as unknown as Express.User);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}
