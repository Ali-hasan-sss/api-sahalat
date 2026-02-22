/**
 * Trips controller: list, get, create, update, delete, add/remove images.
 */

import { Response, NextFunction } from 'express';
import { tripsService } from './trips.service.js';
import { getRelativeImagePath } from '../../middlewares/upload.middleware.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

export const tripsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const isActiveParam = req.query.isActive;
      const query = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        isActive: isActiveParam === 'true' || isActiveParam === 'false' ? (isActiveParam as 'true' | 'false') : undefined,
        minPrice: req.query.minPrice != null ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice != null ? Number(req.query.maxPrice) : undefined,
        landmarkId: typeof req.query.landmarkId === 'string' ? req.query.landmarkId : undefined,
        tripType: (typeof req.query.tripType === 'string' && ['MARINE', 'GROUP', 'INDIVIDUAL'].includes(req.query.tripType) ? req.query.tripType : undefined) as 'MARINE' | 'GROUP' | 'INDIVIDUAL' | undefined,
      };
      const result = await tripsService.list(query);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const forAdmin = req.user?.role === 'ADMIN';
      const trip = await tripsService.getById(id, forAdmin);
      res.json({ success: true, data: trip });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const trip = await tripsService.create(req.body);
      res.status(201).json({ success: true, data: trip });
    } catch (e) {
      next(e);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const trip = await tripsService.update(id, req.body);
      res.json({ success: true, data: trip });
    } catch (e) {
      next(e);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await tripsService.softDelete(id);
      res.json({ success: true, message: 'Trip deleted' });
    } catch (e) {
      next(e);
    }
  },

  async addImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const file = req.file as Express.Multer.File;
      if (!file?.filename) {
        return next(new Error('File is required'));
      }
      const relativePath = getRelativeImagePath('TRIPS', file.filename);
      const img = await tripsService.addImage(tripId, relativePath);
      res.status(201).json({ success: true, data: img });
    } catch (e) {
      next(e);
    }
  },

  async removeImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const imageId = req.params.imageId as string;
      await tripsService.removeImage(tripId, imageId);
      res.json({ success: true, message: 'Image removed' });
    } catch (e) {
      next(e);
    }
  },

  async addFeature(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const feat = await tripsService.addFeature(tripId, req.body);
      res.status(201).json({ success: true, data: feat });
    } catch (e) {
      next(e);
    }
  },

  async updateFeature(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const featureId = req.params.featureId as string;
      const feat = await tripsService.updateFeature(tripId, featureId, req.body);
      res.json({ success: true, data: feat });
    } catch (e) {
      next(e);
    }
  },

  async removeFeature(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const featureId = req.params.featureId as string;
      await tripsService.removeFeature(tripId, featureId);
      res.json({ success: true, message: 'Feature removed' });
    } catch (e) {
      next(e);
    }
  },

  async addItineraryDay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const day = await tripsService.addItineraryDay(tripId, req.body);
      res.status(201).json({ success: true, data: day });
    } catch (e) {
      next(e);
    }
  },

  async updateItineraryDay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const dayId = req.params.dayId as string;
      const day = await tripsService.updateItineraryDay(tripId, dayId, req.body);
      res.json({ success: true, data: day });
    } catch (e) {
      next(e);
    }
  },

  async removeItineraryDay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const dayId = req.params.dayId as string;
      await tripsService.removeItineraryDay(tripId, dayId);
      res.json({ success: true, message: 'Itinerary day removed' });
    } catch (e) {
      next(e);
    }
  },

  async addMeal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const meal = await tripsService.addMeal(tripId, req.body);
      res.status(201).json({ success: true, data: meal });
    } catch (e) {
      next(e);
    }
  },

  async updateMeal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const mealId = req.params.mealId as string;
      const meal = await tripsService.updateMeal(tripId, mealId, req.body);
      res.json({ success: true, data: meal });
    } catch (e) {
      next(e);
    }
  },

  async removeMeal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const mealId = req.params.mealId as string;
      await tripsService.removeMeal(tripId, mealId);
      res.json({ success: true, message: 'Meal removed' });
    } catch (e) {
      next(e);
    }
  },

  async addHotel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const hotel = await tripsService.addHotel(tripId, req.body);
      res.status(201).json({ success: true, data: hotel });
    } catch (e) {
      next(e);
    }
  },

  async updateHotel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const hotelId = req.params.hotelId as string;
      const hotel = await tripsService.updateHotel(tripId, hotelId, req.body);
      res.json({ success: true, data: hotel });
    } catch (e) {
      next(e);
    }
  },

  async removeHotel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const hotelId = req.params.hotelId as string;
      await tripsService.removeHotel(tripId, hotelId);
      res.json({ success: true, message: 'Hotel removed' });
    } catch (e) {
      next(e);
    }
  },

  async addIncluded(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const item = await tripsService.addIncluded(tripId, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (e) {
      next(e);
    }
  },

  async updateIncluded(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const itemId = req.params.itemId as string;
      const item = await tripsService.updateIncluded(tripId, itemId, req.body);
      res.json({ success: true, data: item });
    } catch (e) {
      next(e);
    }
  },

  async removeIncluded(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const itemId = req.params.itemId as string;
      await tripsService.removeIncluded(tripId, itemId);
      res.json({ success: true, message: 'Included item removed' });
    } catch (e) {
      next(e);
    }
  },

  async addExcluded(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const item = await tripsService.addExcluded(tripId, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (e) {
      next(e);
    }
  },

  async updateExcluded(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const itemId = req.params.itemId as string;
      const item = await tripsService.updateExcluded(tripId, itemId, req.body);
      res.json({ success: true, data: item });
    } catch (e) {
      next(e);
    }
  },

  async removeExcluded(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.id as string;
      const itemId = req.params.itemId as string;
      await tripsService.removeExcluded(tripId, itemId);
      res.json({ success: true, message: 'Excluded item removed' });
    } catch (e) {
      next(e);
    }
  },
};
