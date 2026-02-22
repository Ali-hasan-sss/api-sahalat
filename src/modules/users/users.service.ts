/**
 * Users service: get profile, update profile (for authenticated user).
 */

import { prisma } from '../../utils/prisma.js';
import { hashPassword } from '../../utils/hash.js';
import { AppError } from '../../middlewares/errorHandler.js';

export const usersService = {
  async getById(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true, name: true, phone: true, role: true, isVerified: true, createdAt: true },
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async updateProfile(userId: string, data: { name?: string; phone?: string; password?: string }) {
    const updateData: { name?: string; phone?: string; password?: string } = {};
    if (data.name != null) updateData.name = data.name;
    if (data.phone != null) updateData.phone = data.phone;
    if (data.password != null) updateData.password = await hashPassword(data.password);
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, phone: true, role: true, isVerified: true },
    });
    return user;
  },
};
