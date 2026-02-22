/**
 * Landmarks service: CRUD, list, soft delete, images.
 */

import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { Prisma } from '@prisma/client';

const defaultList = { page: 1, limit: 20, isActive: undefined as string | undefined };

export type CreateLandmarkInput = {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
};

export const landmarksService = {
  async list(query: { page?: number; limit?: number; isActive?: string } = defaultList) {
    const { page = 1, limit = 20, isActive } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.LandmarkWhereInput = { deletedAt: null };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      prisma.landmark.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { images: { where: { deletedAt: null }, orderBy: { order: 'asc' }, take: 1 } },
      }),
      prisma.landmark.count({ where }),
    ]);

    const list = items.map((l) => ({
      ...l,
      latitude: l.latitude ? Number(l.latitude) : null,
      longitude: l.longitude ? Number(l.longitude) : null,
      images: l.images.map((i) => ({ id: i.id, imagePath: i.imagePath })),
    }));

    return { items: list, total, page, limit };
  },

  async getById(id: string, forAdmin = false) {
    const landmark = await prisma.landmark.findFirst({
      where: { id, ...(forAdmin ? {} : { deletedAt: null, isActive: true }) },
      include: { images: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    });
    if (!landmark) throw new AppError('Landmark not found', 404);
    return {
      ...landmark,
      latitude: landmark.latitude ? Number(landmark.latitude) : null,
      longitude: landmark.longitude ? Number(landmark.longitude) : null,
    };
  },

  async create(data: CreateLandmarkInput) {
    const landmark = await prisma.landmark.create({
      data: {
        name: data.name,
        nameAr: data.nameAr ?? null,
        description: data.description ?? null,
        descriptionAr: data.descriptionAr ?? null,
        location: data.location ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isActive: data.isActive ?? true,
      },
    });
    return landmark;
  },

  async update(id: string, data: Partial<CreateLandmarkInput>) {
    const existing = await prisma.landmark.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Landmark not found', 404);
    const landmark = await prisma.landmark.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.nameAr != null && { nameAr: data.nameAr }),
        ...(data.description != null && { description: data.description }),
        ...(data.descriptionAr != null && { descriptionAr: data.descriptionAr }),
        ...(data.location != null && { location: data.location }),
        ...(data.latitude != null && { latitude: data.latitude }),
        ...(data.longitude != null && { longitude: data.longitude }),
        ...(data.isActive != null && { isActive: data.isActive }),
      },
    });
    return landmark;
  },

  async softDelete(id: string) {
    const existing = await prisma.landmark.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Landmark not found', 404);
    const images = await prisma.landmarkImage.findMany({ where: { landmarkId: id }, select: { imagePath: true } });
    const { deleteImageFiles } = await import('../../middlewares/upload.middleware.js');
    deleteImageFiles(images.map((img) => img.imagePath));
    await prisma.landmark.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Landmark deleted' };
  },

  async addImage(landmarkId: string, imagePath: string, order?: number) {
    const landmark = await prisma.landmark.findFirst({ where: { id: landmarkId, deletedAt: null } });
    if (!landmark) throw new AppError('Landmark not found', 404);
    const maxOrder = await prisma.landmarkImage.findFirst({
      where: { landmarkId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = order ?? (maxOrder ? maxOrder.order + 1 : 0);
    return prisma.landmarkImage.create({
      data: { landmarkId, imagePath, order: nextOrder },
    });
  },

  async removeImage(landmarkId: string, imageId: string) {
    const img = await prisma.landmarkImage.findFirst({
      where: { id: imageId, landmarkId, deletedAt: null },
    });
    if (!img) throw new AppError('Image not found', 404);
    const { deleteImageFile } = await import('../../middlewares/upload.middleware.js');
    deleteImageFile(img.imagePath);
    await prisma.landmarkImage.update({ where: { id: imageId }, data: { deletedAt: new Date() } });
    return { message: 'Image removed' };
  },
};
