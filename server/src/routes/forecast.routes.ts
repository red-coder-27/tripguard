import { Router, Response } from 'express';
import { Trip } from '../models/Trip.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { Booking } from '../models/Booking.js';
import { Expense } from '../models/Expense.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';
import { buildCanonicalLedger } from '../financial/accounting.js';

const router = Router();

router.get('/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const [items, bookings, expenses] = await Promise.all([
      ItineraryItem.find({ tripId: trip._id, isRemoved: false }),
      Booking.find({ tripId: trip._id }),
      Expense.find({ tripId: trip._id }),
    ]);

    const forecast = calculateFinancialForecast(trip, items, bookings, expenses);
    const ledger = buildCanonicalLedger(trip, items, bookings, expenses);

    res.json({
      success: true,
      forecast,
      obligations: ledger.obligations,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

