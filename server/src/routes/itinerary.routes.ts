import { Router, Response } from 'express';
import { z } from 'zod';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { Trip } from '../models/Trip.js';
import { RecoveryRun } from '../models/RecoveryRun.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createItemSchema = z.object({
  tripId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  date: z.string().transform((val) => new Date(val)),
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  category: z.enum(['ACCOMMODATION', 'TRANSPORT', 'ACTIVITY', 'FOOD_DINING', 'SHOPPING', 'MISC']),
  startTime: z.string().default('10:00'),
  endTime: z.string().default('12:00'),
  location: z.string().default(''),
  estimatedCostMinor: z.number().int().min(0),
  priority: z.enum(['MUST_DO', 'FLEXIBLE', 'OPTIONAL']).default('FLEXIBLE'),
  isLocked: z.boolean().default(false),
  bookingId: z.string().optional(),
});

// List itinerary items for trip
router.get('/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const items = await ItineraryItem.find({
      tripId: trip._id,
      isRemoved: false,
    }).sort({ dayNumber: 1, startTime: 1 });

    res.json({ success: true, items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create itinerary item
router.post('/', authenticate, validateBody(createItemSchema), async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.body.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const item = await ItineraryItem.create({
      ...req.body,
      version: trip.currentVersion,
    });

    if (item.bookingId) {
      const { Booking } = await import('../models/Booking.js');
      await Booking.findByIdAndUpdate(item.bookingId, { itineraryItemId: item._id });
    }

    // Invalidate pending recovery runs as stale
    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.status(201).json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update itinerary item
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await ItineraryItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Itinerary item not found.' });
      return;
    }

    const trip = await Trip.findOne({ _id: item.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(403).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const {
      title,
      description,
      category,
      startTime,
      endTime,
      location,
      estimatedCostMinor,
      priority,
      isLocked,
      dayNumber,
    } = req.body;

    if (title) item.title = title;
    if (description !== undefined) item.description = description;
    if (category) item.category = category;
    if (startTime) item.startTime = startTime;
    if (endTime) item.endTime = endTime;
    if (location !== undefined) item.location = location;
    if (typeof estimatedCostMinor === 'number') item.estimatedCostMinor = estimatedCostMinor;
    if (priority) item.priority = priority;
    if (typeof isLocked === 'boolean') item.isLocked = isLocked;
    if (typeof dayNumber === 'number') item.dayNumber = dayNumber;

    await item.save();

    // Invalidate pending recovery runs
    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete itinerary item
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await ItineraryItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Itinerary item not found.' });
      return;
    }

    const trip = await Trip.findOne({ _id: item.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(403).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    await item.deleteOne();

    // Invalidate pending recovery runs
    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.json({ success: true, message: 'Itinerary item removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
