import { Router, Response } from 'express';
import { z } from 'zod';
import { Trip } from '../models/Trip.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { Booking } from '../models/Booking.js';
import { Expense } from '../models/Expense.js';
import { RecoveryRun } from '../models/RecoveryRun.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';

const router = Router();

const createTripSchema = z.object({
  name: z.string().min(1, 'Trip name is required'),
  destination: z.string().min(1, 'Destination is required'),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  travelersCount: z.number().int().min(1).default(1),
  totalBudgetMinor: z.number().int().min(100, 'Budget must be at least 1 standard unit'),
  emergencyReserveMinor: z.number().int().min(0).optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).default('INR'),
  preferences: z
    .object({
      primaryInterests: z.array(z.string()).default([]),
      travelPace: z.enum(['RELAXED', 'BALANCED', 'PACKED']).default('BALANCED'),
      accommodationPreference: z.enum(['BUDGET', 'BOUTIQUE', 'LUXURY']).default('BOUTIQUE'),
    })
    .optional(),
});

// List all trips for authenticated user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trips = await Trip.find({ userId: req.user!.id }).sort({ startDate: -1 });

    // Attach computed forecast summaries to each trip
    const tripsWithHealth = await Promise.all(
      trips.map(async (trip) => {
        const [items, bookings, expenses] = await Promise.all([
          ItineraryItem.find({ tripId: trip._id, isRemoved: false }),
          Booking.find({ tripId: trip._id }),
          Expense.find({ tripId: trip._id }),
        ]);

        const forecast = calculateFinancialForecast(trip, items, bookings, expenses);
        return {
          ...trip.toObject(),
          forecast,
        };
      })
    );

    res.json({ success: true, trips: tripsWithHealth });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new trip
router.post('/', authenticate, validateBody(createTripSchema), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      destination,
      startDate,
      endDate,
      travelersCount,
      totalBudgetMinor,
      emergencyReserveMinor,
      currency,
      preferences,
    } = req.body;

    const reserve =
      typeof emergencyReserveMinor === 'number'
        ? emergencyReserveMinor
        : Math.round(totalBudgetMinor * 0.10);

    const trip = await Trip.create({
      userId: req.user!.id,
      name,
      destination,
      startDate,
      endDate,
      travelersCount,
      totalBudgetMinor,
      emergencyReserveMinor: reserve,
      currency,
      preferences,
    });

    await AuditEvent.create({
      tripId: trip._id,
      userId: req.user!.id,
      eventType: 'TRIP_CREATED',
      metadata: { name, totalBudgetMinor, currency },
    });

    res.status(201).json({ success: true, trip });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single trip with real-time financial health
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found.' });
      return;
    }

    const [items, bookings, expenses] = await Promise.all([
      ItineraryItem.find({ tripId: trip._id, isRemoved: false }),
      Booking.find({ tripId: trip._id }),
      Expense.find({ tripId: trip._id }),
    ]);

    const forecast = calculateFinancialForecast(trip, items, bookings, expenses);

    res.json({
      success: true,
      trip: {
        ...trip.toObject(),
        forecast,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update trip
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found.' });
      return;
    }

    const { name, destination, startDate, endDate, travelersCount, totalBudgetMinor, emergencyReserveMinor } =
      req.body;

    if (name) trip.name = name;
    if (destination) trip.destination = destination;
    if (startDate) trip.startDate = new Date(startDate);
    if (endDate) trip.endDate = new Date(endDate);
    if (travelersCount) trip.travelersCount = travelersCount;
    if (typeof totalBudgetMinor === 'number') trip.totalBudgetMinor = totalBudgetMinor;
    if (typeof emergencyReserveMinor === 'number') trip.emergencyReserveMinor = emergencyReserveMinor;

    await trip.save();

    // Invalidate pending recovery runs as stale
    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.json({ success: true, trip });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete trip with cascading cleanup
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found.' });
      return;
    }

    await Promise.all([
      ItineraryItem.deleteMany({ tripId: trip._id }),
      Booking.deleteMany({ tripId: trip._id }),
      Expense.deleteMany({ tripId: trip._id }),
      RecoveryRun.deleteMany({ tripId: trip._id }),
      AuditEvent.deleteMany({ tripId: trip._id }),
    ]);

    res.json({ success: true, message: 'Trip and associated records successfully removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

