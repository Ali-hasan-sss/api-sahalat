import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    password: z.string().min(8).optional(),
  }),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>['body'];
