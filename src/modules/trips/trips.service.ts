/**
 * Trips service: CRUD, list with filters, soft delete.
 * Image paths stored in TripImage.
 */

import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { decimalToNumber, applyDiscountToPrice } from '../../utils/priceCalculator.js';
import { discountsService } from '../discounts/discounts.service.js';
import type { CreateTripBody, UpdateTripBody, ListTripsQuery } from './trips.validators.js';
import type { Prisma } from '@prisma/client';

export const tripsService = {
  async list(query: ListTripsQuery) {
    const { page, limit, isActive, minPrice, maxPrice, landmarkId } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.TripWhereInput = { deletedAt: null };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (minPrice != null || maxPrice != null) {
      where.basePrice = {};
      if (minPrice != null) (where.basePrice as Prisma.DecimalFilter).gte = minPrice;
      if (maxPrice != null) (where.basePrice as Prisma.DecimalFilter).lte = maxPrice;
    }
    if (landmarkId) {
      where.tripLandmarks = { some: { landmarkId, deletedAt: null } };
    }

    const [items, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { deletedAt: null }, orderBy: { order: 'asc' }, take: 1 },
          tripLandmarks: { where: { deletedAt: null }, include: { landmark: true } },
          _count: { select: { reviews: true } },
          reviews: { where: { deletedAt: null }, select: { rating: true } },
        },
      }),
      prisma.trip.count({ where }),
    ]);

    const list = await Promise.all(
      items.map(async (t) => {
        const { tripLandmarks, _count, reviews, ...rest } = t;
        const avgRating =
          reviews && reviews.length > 0
            ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
            : null;
        const basePrice = decimalToNumber(t.basePrice);
        const discount = await discountsService.getActiveForEntity('TRIP', t.id);
        const finalPrice = discount ? applyDiscountToPrice(basePrice, discount.discountType, discount.value) : null;
        return {
          ...rest,
          basePrice,
          discount: discount
            ? { id: discount.id, discountType: discount.discountType, value: discount.value, startDate: discount.startDate, endDate: discount.endDate }
            : null,
          finalPrice: finalPrice ?? basePrice,
          images: t.images.map((i) => ({ id: i.id, imagePath: i.imagePath, order: i.order })),
          route: t.route,
          routeAr: t.routeAr,
          tripType: t.tripType,
          landmarks: tripLandmarks?.map((tl) => tl.landmark) ?? [],
          averageRating: avgRating,
          reviewsCount: _count?.reviews ?? 0,
        };
      })
    );

    return { items: list, total, page, limit };
  },

  async getById(id: string, forAdmin = false) {
    const tripData = await prisma.trip.findFirst({
      where: { id, ...(forAdmin ? {} : { deletedAt: null, isActive: true }) },
      include: {
        images: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        features: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        itineraryDays: { where: { deletedAt: null }, orderBy: [{ order: 'asc' }, { dayNumber: 'asc' }] },
        includedItems: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        excludedItems: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        meals: { where: { deletedAt: null }, orderBy: { dayNumber: 'asc' } },
        hotels: { where: { deletedAt: null }, orderBy: { nightNumber: 'asc' } },
        tripLandmarks: {
          where: { deletedAt: null },
          include: { landmark: { include: { images: { where: { deletedAt: null }, take: 1 } } } },
        },
      },
    });
    if (!tripData) throw new AppError('Trip not found', 404);

    const [reviewsAgg, latestReviews] = await Promise.all([
      prisma.tripReview.aggregate({
        where: { tripId: id, deletedAt: null },
        _avg: { rating: true },
        _count: true,
      }),
      prisma.tripReview.findMany({
        where: { tripId: id, deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    const averageRating = reviewsAgg._avg.rating ? Math.round(reviewsAgg._avg.rating * 10) / 10 : 0;
    const reviewsCount = reviewsAgg._count;
    const reviews = latestReviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));

    const basePrice = decimalToNumber(tripData.basePrice);
    let discount = null;
    let finalPrice = basePrice;
    if (!forAdmin) {
      const activeDiscount = await discountsService.getActiveForEntity('TRIP', id);
      if (activeDiscount) {
        discount = {
          id: activeDiscount.id,
          discountType: activeDiscount.discountType,
          value: activeDiscount.value,
          startDate: activeDiscount.startDate,
          endDate: activeDiscount.endDate,
        };
        finalPrice = applyDiscountToPrice(basePrice, activeDiscount.discountType, activeDiscount.value);
      }
    }

    return {
      ...tripData,
      included: tripData.includedItems ?? [],
      excluded: tripData.excludedItems ?? [],
      basePrice,
      discount,
      finalPrice,
      images: tripData.images.map((i) => ({ id: i.id, imagePath: i.imagePath, order: i.order })),
      averageRating,
      reviewsCount,
      reviews,
      landmarks: tripData.tripLandmarks.map((tl) => ({
        ...tl.landmark,
        order: tl.order,
        image: tl.landmark.images[0]?.imagePath,
      })),
    };
  },

  async create(data: CreateTripBody & { landmarkIds?: string[] }) {
    const landmarkIds = data.landmarkIds ?? [];
    if (landmarkIds.length === 0) {
      throw new AppError('يجب ربط الرحلة بمعلم سياحي واحد على الأقل', 400);
    }
    const trip = await prisma.trip.create({
      data: {
        title: data.title,
        titleAr: data.titleAr ?? null,
        description: data.description ?? null,
        descriptionAr: data.descriptionAr ?? null,
        route: data.route ?? null,
        routeAr: data.routeAr ?? null,
        tripType: data.tripType ?? null,
        durationDays: data.durationDays,
        basePrice: data.basePrice,
        maxParticipants: data.maxParticipants ?? null,
        isActive: data.isActive ?? true,
      },
    });
    for (let i = 0; i < landmarkIds.length; i++) {
      await prisma.tripLandmark.create({
        data: { tripId: trip.id, landmarkId: landmarkIds[i], order: i },
      });
    }
    return { ...trip, basePrice: decimalToNumber(trip.basePrice) };
  },

  async update(id: string, data: UpdateTripBody & { landmarkIds?: string[] }) {
    const existing = await prisma.trip.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Trip not found', 404);
    if (data.landmarkIds !== undefined) {
      if (data.landmarkIds.length === 0) {
        throw new AppError('يجب ربط الرحلة بمعلم سياحي واحد على الأقل', 400);
      }
      await prisma.tripLandmark.updateMany({ where: { tripId: id }, data: { deletedAt: new Date() } });
      for (let i = 0; i < data.landmarkIds.length; i++) {
        await prisma.tripLandmark.upsert({
          where: { tripId_landmarkId: { tripId: id, landmarkId: data.landmarkIds[i] } },
          create: { tripId: id, landmarkId: data.landmarkIds[i], order: i },
          update: { order: i, deletedAt: null },
        });
      }
    }
    const trip = await prisma.trip.update({
      where: { id },
      data: {
        ...(data.title != null && { title: data.title }),
        ...(data.titleAr != null && { titleAr: data.titleAr }),
        ...(data.description != null && { description: data.description }),
        ...(data.descriptionAr != null && { descriptionAr: data.descriptionAr }),
        ...(data.route !== undefined && { route: data.route }),
        ...(data.routeAr !== undefined && { routeAr: data.routeAr }),
        ...(data.tripType !== undefined && { tripType: data.tripType }),
        ...(data.durationDays != null && { durationDays: data.durationDays }),
        ...(data.basePrice != null && { basePrice: data.basePrice }),
        ...(data.maxParticipants != null && { maxParticipants: data.maxParticipants }),
        ...(data.isActive != null && { isActive: data.isActive }),
      },
    });
    return { ...trip, basePrice: decimalToNumber(trip.basePrice) };
  },

  async softDelete(id: string) {
    const existing = await prisma.trip.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Trip not found', 404);
    const images = await prisma.tripImage.findMany({ where: { tripId: id }, select: { imagePath: true } });
    const { deleteImageFiles } = await import('../../middlewares/upload.middleware.js');
    deleteImageFiles(images.map((img) => img.imagePath));
    await prisma.trip.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Trip deleted' };
  },

  async addImage(tripId: string, imagePath: string, order?: number) {
    const trip = await prisma.trip.findFirst({ where: { id: tripId, deletedAt: null } });
    if (!trip) throw new AppError('Trip not found', 404);
    const maxOrder = await prisma.tripImage.findFirst({
      where: { tripId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = order ?? (maxOrder ? maxOrder.order + 1 : 0);
    const img = await prisma.tripImage.create({
      data: { tripId, imagePath, order: nextOrder },
    });
    return img;
  },

  async removeImage(tripId: string, imageId: string) {
    const img = await prisma.tripImage.findFirst({
      where: { id: imageId, tripId, deletedAt: null },
    });
    if (!img) throw new AppError('Image not found', 404);
    const { deleteImageFile } = await import('../../middlewares/upload.middleware.js');
    deleteImageFile(img.imagePath);
    await prisma.tripImage.update({ where: { id: imageId }, data: { deletedAt: new Date() } });
    return { message: 'Image removed' };
  },

  async addFeature(
    tripId: string,
    data: { title: string; titleAr?: string; description?: string; descriptionAr?: string; icon?: string; order?: number }
  ) {
    await this.ensureTripExists(tripId);
    const maxOrder = await prisma.tripFeature.findFirst({
      where: { tripId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = data.order ?? (maxOrder ? maxOrder.order + 1 : 0);
    return prisma.tripFeature.create({
      data: { tripId, title: data.title, titleAr: data.titleAr ?? null, description: data.description ?? null, descriptionAr: data.descriptionAr ?? null, icon: data.icon ?? null, order },
    });
  },

  async updateFeature(
    tripId: string,
    featureId: string,
    data: { title?: string; titleAr?: string; description?: string; descriptionAr?: string; icon?: string; order?: number }
  ) {
    const f = await prisma.tripFeature.findFirst({ where: { id: featureId, tripId, deletedAt: null } });
    if (!f) throw new AppError('Feature not found', 404);
    return prisma.tripFeature.update({
      where: { id: featureId },
      data: { ...(data.title != null && { title: data.title }), ...(data.titleAr !== undefined && { titleAr: data.titleAr }), ...(data.description !== undefined && { description: data.description }), ...(data.descriptionAr !== undefined && { descriptionAr: data.descriptionAr }), ...(data.icon !== undefined && { icon: data.icon }), ...(data.order != null && { order: data.order }) },
    });
  },

  async removeFeature(tripId: string, featureId: string) {
    const f = await prisma.tripFeature.findFirst({ where: { id: featureId, tripId, deletedAt: null } });
    if (!f) throw new AppError('Feature not found', 404);
    await prisma.tripFeature.update({ where: { id: featureId }, data: { deletedAt: new Date() } });
    return { message: 'Feature removed' };
  },

  async addItineraryDay(
    tripId: string,
    data: { dayNumber?: number; duration?: string; durationAr?: string; title: string; titleAr?: string; content?: string; contentAr?: string; extraInfo?: string; extraInfoAr?: string; order?: number }
  ) {
    await this.ensureTripExists(tripId);
    const maxOrder = await prisma.tripItineraryDay.findFirst({
      where: { tripId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = data.order ?? (maxOrder ? maxOrder.order + 1 : 0);
    return prisma.tripItineraryDay.create({
      data: {
        tripId,
        dayNumber: data.dayNumber ?? 1,
        duration: data.duration ?? null,
        durationAr: data.durationAr ?? null,
        title: data.title,
        titleAr: data.titleAr ?? null,
        content: data.content ?? null,
        contentAr: data.contentAr ?? null,
        extraInfo: data.extraInfo ?? null,
        extraInfoAr: data.extraInfoAr ?? null,
        order,
      },
    });
  },

  async updateItineraryDay(
    tripId: string,
    dayId: string,
    data: { dayNumber?: number; duration?: string; durationAr?: string; title?: string; titleAr?: string; content?: string; contentAr?: string; extraInfo?: string; extraInfoAr?: string; order?: number }
  ) {
    const d = await prisma.tripItineraryDay.findFirst({ where: { id: dayId, tripId, deletedAt: null } });
    if (!d) throw new AppError('Itinerary day not found', 404);
    return prisma.tripItineraryDay.update({
      where: { id: dayId },
      data: {
        ...(data.dayNumber != null && { dayNumber: data.dayNumber }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.durationAr !== undefined && { durationAr: data.durationAr }),
        ...(data.title != null && { title: data.title }),
        ...(data.titleAr !== undefined && { titleAr: data.titleAr }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.contentAr !== undefined && { contentAr: data.contentAr }),
        ...(data.extraInfo !== undefined && { extraInfo: data.extraInfo }),
        ...(data.extraInfoAr !== undefined && { extraInfoAr: data.extraInfoAr }),
        ...(data.order != null && { order: data.order }),
      },
    });
  },

  async removeItineraryDay(tripId: string, dayId: string) {
    const d = await prisma.tripItineraryDay.findFirst({ where: { id: dayId, tripId, deletedAt: null } });
    if (!d) throw new AppError('Itinerary day not found', 404);
    await prisma.tripItineraryDay.update({ where: { id: dayId }, data: { deletedAt: new Date() } });
    return { message: 'Itinerary day removed' };
  },

  async addMeal(
    tripId: string,
    data: { dayNumber: number; breakfast?: string; breakfastAr?: string; lunch?: string; lunchAr?: string; dinner?: string; dinnerAr?: string }
  ) {
    await this.ensureTripExists(tripId);
    return prisma.tripMeal.create({
      data: {
        tripId,
        dayNumber: data.dayNumber,
        breakfast: data.breakfast ?? null,
        breakfastAr: data.breakfastAr ?? null,
        lunch: data.lunch ?? null,
        lunchAr: data.lunchAr ?? null,
        dinner: data.dinner ?? null,
        dinnerAr: data.dinnerAr ?? null,
      },
    });
  },

  async updateMeal(
    tripId: string,
    mealId: string,
    data: { dayNumber?: number; breakfast?: string; breakfastAr?: string; lunch?: string; lunchAr?: string; dinner?: string; dinnerAr?: string }
  ) {
    const m = await prisma.tripMeal.findFirst({ where: { id: mealId, tripId, deletedAt: null } });
    if (!m) throw new AppError('Meal not found', 404);
    return prisma.tripMeal.update({
      where: { id: mealId },
      data: {
        ...(data.dayNumber != null && { dayNumber: data.dayNumber }),
        ...(data.breakfast !== undefined && { breakfast: data.breakfast }),
        ...(data.breakfastAr !== undefined && { breakfastAr: data.breakfastAr }),
        ...(data.lunch !== undefined && { lunch: data.lunch }),
        ...(data.lunchAr !== undefined && { lunchAr: data.lunchAr }),
        ...(data.dinner !== undefined && { dinner: data.dinner }),
        ...(data.dinnerAr !== undefined && { dinnerAr: data.dinnerAr }),
      },
    });
  },

  async removeMeal(tripId: string, mealId: string) {
    const m = await prisma.tripMeal.findFirst({ where: { id: mealId, tripId, deletedAt: null } });
    if (!m) throw new AppError('Meal not found', 404);
    await prisma.tripMeal.update({ where: { id: mealId }, data: { deletedAt: new Date() } });
    return { message: 'Meal removed' };
  },

  async addHotel(
    tripId: string,
    data: { nightNumber: number; hotelName: string; hotelNameAr?: string; city?: string; cityAr?: string; category?: string; optionNumber?: number }
  ) {
    await this.ensureTripExists(tripId);
    return prisma.tripHotel.create({
      data: {
        tripId,
        nightNumber: data.nightNumber,
        hotelName: data.hotelName,
        hotelNameAr: data.hotelNameAr ?? null,
        city: data.city ?? null,
        cityAr: data.cityAr ?? null,
        category: data.category ?? null,
        optionNumber: data.optionNumber ?? 1,
      },
    });
  },

  async updateHotel(
    tripId: string,
    hotelId: string,
    data: { nightNumber?: number; hotelName?: string; hotelNameAr?: string; city?: string; cityAr?: string; category?: string; optionNumber?: number }
  ) {
    const h = await prisma.tripHotel.findFirst({ where: { id: hotelId, tripId, deletedAt: null } });
    if (!h) throw new AppError('Hotel not found', 404);
    return prisma.tripHotel.update({
      where: { id: hotelId },
      data: {
        ...(data.nightNumber != null && { nightNumber: data.nightNumber }),
        ...(data.hotelName != null && { hotelName: data.hotelName }),
        ...(data.hotelNameAr !== undefined && { hotelNameAr: data.hotelNameAr }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.cityAr !== undefined && { cityAr: data.cityAr }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.optionNumber != null && { optionNumber: data.optionNumber }),
      },
    });
  },

  async removeHotel(tripId: string, hotelId: string) {
    const h = await prisma.tripHotel.findFirst({ where: { id: hotelId, tripId, deletedAt: null } });
    if (!h) throw new AppError('Hotel not found', 404);
    await prisma.tripHotel.update({ where: { id: hotelId }, data: { deletedAt: new Date() } });
    return { message: 'Hotel removed' };
  },

  async addIncluded(tripId: string, data: { text: string; textAr?: string; icon?: string; order?: number }) {
    await this.ensureTripExists(tripId);
    const maxOrder = await prisma.tripIncluded.findFirst({
      where: { tripId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = data.order ?? (maxOrder ? maxOrder.order + 1 : 0);
    return prisma.tripIncluded.create({
      data: { tripId, text: data.text, textAr: data.textAr ?? null, icon: data.icon ?? null, order },
    });
  },

  async updateIncluded(tripId: string, itemId: string, data: { text?: string; textAr?: string; icon?: string; order?: number }) {
    const item = await prisma.tripIncluded.findFirst({ where: { id: itemId, tripId, deletedAt: null } });
    if (!item) throw new AppError('Included item not found', 404);
    return prisma.tripIncluded.update({
      where: { id: itemId },
      data: {
        ...(data.text != null && { text: data.text }),
        ...(data.textAr !== undefined && { textAr: data.textAr }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.order != null && { order: data.order }),
      },
    });
  },

  async removeIncluded(tripId: string, itemId: string) {
    const item = await prisma.tripIncluded.findFirst({ where: { id: itemId, tripId, deletedAt: null } });
    if (!item) throw new AppError('Included item not found', 404);
    await prisma.tripIncluded.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
    return { message: 'Included item removed' };
  },

  async addExcluded(tripId: string, data: { text: string; textAr?: string; icon?: string; order?: number }) {
    await this.ensureTripExists(tripId);
    const maxOrder = await prisma.tripExcluded.findFirst({
      where: { tripId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = data.order ?? (maxOrder ? maxOrder.order + 1 : 0);
    return prisma.tripExcluded.create({
      data: { tripId, text: data.text, textAr: data.textAr ?? null, icon: data.icon ?? null, order },
    });
  },

  async updateExcluded(tripId: string, itemId: string, data: { text?: string; textAr?: string; icon?: string; order?: number }) {
    const item = await prisma.tripExcluded.findFirst({ where: { id: itemId, tripId, deletedAt: null } });
    if (!item) throw new AppError('Excluded item not found', 404);
    return prisma.tripExcluded.update({
      where: { id: itemId },
      data: {
        ...(data.text != null && { text: data.text }),
        ...(data.textAr !== undefined && { textAr: data.textAr }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.order != null && { order: data.order }),
      },
    });
  },

  async removeExcluded(tripId: string, itemId: string) {
    const item = await prisma.tripExcluded.findFirst({ where: { id: itemId, tripId, deletedAt: null } });
    if (!item) throw new AppError('Excluded item not found', 404);
    await prisma.tripExcluded.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
    return { message: 'Excluded item removed' };
  },

  async ensureTripExists(tripId: string) {
    const t = await prisma.trip.findFirst({ where: { id: tripId, deletedAt: null } });
    if (!t) throw new AppError('Trip not found', 404);
  },
};
