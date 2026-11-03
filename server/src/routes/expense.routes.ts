import { Router, Response } from 'express';
import { z } from 'zod';
import { Expense } from '../models/Expense.js';
import { Booking } from '../models/Booking.js';
import { Trip } from '../models/Trip.js';
import { RecoveryRun } from '../models/RecoveryRun.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createExpenseSchema = z.object({
  tripId: z.string().min(1),
  itineraryItemId: z.string().optional(),
  bookingId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['ACCOMMODATION', 'TRANSPORT', 'ACTIVITY', 'FOOD_DINING', 'SHOPPING', 'MISC']),
  amountMinor: z.number().int().min(1, 'Amount must be greater than 0'),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).default('INR'),
  date: z.string().optional().transform((val) => (val ? new Date(val) : new Date())),
  paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'UPI', 'BANK_TRANSFER']).default('CREDIT_CARD'),
  paymentStatus: z.enum(['SETTLED', 'PENDING', 'REFUNDED']).default('SETTLED'),
  notes: z.string().default(''),
});

// List expenses for trip
router.get('/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const expenses = await Expense.find({ tripId: trip._id }).sort({ date: -1 });
    res.json({ success: true, expenses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create expense
router.post('/', authenticate, validateBody(createExpenseSchema), async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.body.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const expense = await Expense.create(req.body);

    // If linked to a booking and settled, update booking paid amount
    if (expense.bookingId && expense.paymentStatus === 'SETTLED') {
      const booking = await Booking.findById(expense.bookingId);
      if (booking) {
        booking.paidAmountMinor += expense.amountMinor;
        booking.outstandingAmountMinor = Math.max(0, booking.totalCostMinor - booking.paidAmountMinor);
        await booking.save();
      }
    }

    await AuditEvent.create({
      tripId: trip._id,
      userId: req.user!.id,
      eventType: 'EXPENSE_RECORDED',
      metadata: {
        description: expense.description,
        amountMinor: expense.amountMinor,
        category: expense.category,
      },
    });

    // Invalidate recovery runs
    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.status(201).json({ success: true, expense });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update expense
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      res.status(404).json({ success: false, error: 'Expense not found.' });
      return;
    }

    const trip = await Trip.findOne({ _id: expense.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(403).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const { description, category, amountMinor, date, paymentMethod, paymentStatus, notes } = req.body;

    if (description) expense.description = description;
    if (category) expense.category = category;
    if (typeof amountMinor === 'number') expense.amountMinor = amountMinor;
    if (date) expense.date = new Date(date);
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (paymentStatus) expense.paymentStatus = paymentStatus;
    if (notes !== undefined) expense.notes = notes;

    await expense.save();

    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.json({ success: true, expense });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete expense
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      res.status(404).json({ success: false, error: 'Expense not found.' });
      return;
    }

    const trip = await Trip.findOne({ _id: expense.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(403).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    await expense.deleteOne();

    await RecoveryRun.updateMany({ tripId: trip._id, isStale: false }, { isStale: true });

    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

