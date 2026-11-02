import { Router, Response } from 'express';
import { z } from 'zod';
import { Booking } from '../models/Booking.js';
import { Trip } from '../models/Trip.js';
import { RecoveryRun } from '../models/RecoveryRun.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createBookingSchema = z.object({
  tripId: z.string().min(1),
  itineraryItemId: z.string().optional(),
  category: z.enum(['ACCOMMODATION', 'TRANSPORT', 'ACTIVITY', 'RESTAURANT', 'OTHER']),
  provider: z.string().min(1, 'Provider is required'),
  bookingReference: z.string().default(''),
  totalCostMinor: z.number().int().min(0),
  paidAmountMinor: z.number().int().min(0).default(0),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).default('INR'),
  travelDate: z.string().transform((val) => new Date(val)),
  status: z
    .enum(['CONFIRMED', 'PENDING', 'CANCELLED', 'MODIFIED', 'MODIFICATION_PENDING_USER_ACTION'])
    .default('CONFIRMED'),
  cancellationPolicy: z
    .object({
      isRefundable: z.boolean().default(true),
      freeCancellationDeadline: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
      cancellationFeeMinor: z.number().int().min(0).default(0),
      refundableAmountMinor: z.number().int().min(0).default(0),
      policyNotes: z.string().default(''),
    })
    .optional(),
  notes: z.string().default(''),
});

// List bookings for trip
router.get('/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const bookings = await Booking.find({ tripId: trip._id }).sort({ travelDate: 1 });
    res.json({ success: true, bookings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create booking
router.post('/', authenticate, validateBody(createBookingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.body.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const booking = await Booking.create(req.body);

    await AuditEvent.create({
      tripId: trip._id,
      userId: req.user!.id,
      eventType: 'BOOKING_CREATED',
      metadata: {
        provider: booking.provider,
        totalCostMinor: booking.totalCostMinor,
        category: booking.category,
      },
    });

    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.status(201).json({ success: true, booking });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update booking
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found.' });
      return;
    }

    const trip = await Trip.findOne({ _id: booking.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(403).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const {
      provider,
      bookingReference,
      totalCostMinor,
      paidAmountMinor,
      status,
      cancellationPolicy,
      travelDate,
      notes,
    } = req.body;

    if (provider) booking.provider = provider;
    if (bookingReference !== undefined) booking.bookingReference = bookingReference;
    if (typeof totalCostMinor === 'number') booking.totalCostMinor = totalCostMinor;
    if (typeof paidAmountMinor === 'number') booking.paidAmountMinor = paidAmountMinor;
    if (status) booking.status = status;
    if (cancellationPolicy) booking.cancellationPolicy = { ...booking.cancellationPolicy, ...cancellationPolicy };
    if (travelDate) booking.travelDate = new Date(travelDate);
    if (notes !== undefined) booking.notes = notes;

    await booking.save();

    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.json({ success: true, booking });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete booking
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found.' });
      return;
    }

    const trip = await Trip.findOne({ _id: booking.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(403).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    await booking.deleteOne();

    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.json({ success: true, message: 'Booking deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
