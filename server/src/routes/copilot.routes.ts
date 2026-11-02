import { Router, Response } from 'express';
import { z } from 'zod';
import { Trip } from '../models/Trip.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { Booking } from '../models/Booking.js';
import { Expense } from '../models/Expense.js';
import { RecoveryRun } from '../models/RecoveryRun.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';
import { askTripGuardCopilot } from '../copilot/copilotService.js';
import { optimizeItineraryRecovery } from '../recovery/recoveryEngine.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

router.post(
  '/trip/:tripId/chat',
  authenticate,
  validateBody(chatSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
      if (!trip) {
        res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
        return;
      }

      const [items, bookings, expenses, latestRun] = await Promise.all([
        ItineraryItem.find({ tripId: trip._id, isRemoved: false }).sort({ dayNumber: 1 }),
        Booking.find({ tripId: trip._id }),
        Expense.find({ tripId: trip._id }),
        RecoveryRun.findOne({ tripId: trip._id }).sort({ createdAt: -1 }),
      ]);

      const forecast = calculateFinancialForecast(trip, items, bookings, expenses);

      // Get strategies from latest run or compute fresh
      let strategies = latestRun?.strategies;
      if (!strategies || strategies.length === 0) {
        const optimization = optimizeItineraryRecovery(trip, items, bookings, expenses);
        strategies = optimization.strategies;
      }

      const itineraryOverview = items.map((i) => ({
        day: i.dayNumber,
        title: i.title,
        category: i.category,
        priority: i.priority,
        cost: `₹${(i.estimatedCostMinor / 100).toLocaleString()}`,
      }));

      const context = {
        tripName: trip.name,
        destination: trip.destination,
        forecast,
        strategies,
        itineraryOverview,
      };

      const copilotResult = await askTripGuardCopilot(req.body.message, context);

      res.json({
        success: true,
        response: copilotResult,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;
