/**
 * Application constants (non-env).
 */

export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export const UPLOAD_PATHS = {
  TRIPS: 'trips',
  CARS: 'cars',
  LANDMARKS: 'landmarks',
  LICENSES: 'licenses',
} as const;

export const BOOKING_TYPES = {
  TRIP: 'TRIP_BOOKING',
  CAR: 'CAR_BOOKING',
} as const;

export const DISCOUNT_TYPES = {
  TRIP: 'TRIP',
  CAR: 'CAR',
} as const;

export const DISCOUNT_VALUE_TYPES = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const;

export const RATING_MIN = 1;
export const RATING_MAX = 5;
