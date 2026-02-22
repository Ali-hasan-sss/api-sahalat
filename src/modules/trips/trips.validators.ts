/**
 * Trips request validation (Zod).
 */

import { z } from 'zod';

const tripTypeEnum = z.enum(['MARINE', 'GROUP', 'INDIVIDUAL']);

const landmarkIdsSchema = z.array(z.string().uuid()).min(1, 'يجب ربط الرحلة بمعلم سياحي واحد على الأقل');

export const createTripSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    titleAr: z.string().optional(),
    description: z.string().optional(),
    descriptionAr: z.string().optional(),
    route: z.string().optional(),
    routeAr: z.string().optional(),
    tripType: tripTypeEnum.optional(),
    durationDays: z.number().int().positive(),
    basePrice: z.number().positive(),
    maxParticipants: z.number().int().positive().optional(),
    isActive: z.boolean().optional().default(true),
    landmarkIds: landmarkIdsSchema,
  }),
});

export const updateTripSchema = createTripSchema.partial().extend({
  body: z.object({
    title: z.string().min(2).optional(),
    titleAr: z.string().optional(),
    description: z.string().optional(),
    descriptionAr: z.string().optional(),
    route: z.string().optional().nullable(),
    routeAr: z.string().optional().nullable(),
    tripType: tripTypeEnum.optional().nullable(),
    durationDays: z.number().int().positive().optional(),
    basePrice: z.number().positive().optional(),
    maxParticipants: z.number().int().positive().optional().nullable(),
    isActive: z.boolean().optional(),
    landmarkIds: z.array(z.string().uuid()).min(1, 'يجب ربط الرحلة بمعلم سياحي واحد على الأقل').optional(),
  }),
});

export const listTripsQuerySchema = z.object({
  query: z.object({
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).optional().default('10'),
    isActive: z.enum(['true', 'false']).optional(),
    minPrice: z.string().transform(Number).optional(),
    maxPrice: z.string().transform(Number).optional(),
    landmarkId: z.string().uuid().optional(),
  }),
});

export type CreateTripBody = z.infer<typeof createTripSchema>['body'];
export type UpdateTripBody = z.infer<typeof updateTripSchema>['body'];
export type ListTripsQuery = z.infer<typeof listTripsQuerySchema>['query'];
