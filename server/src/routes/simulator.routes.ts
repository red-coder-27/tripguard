import { Router, Response } from 'express';
import { z } from 'zod';
import { Trip } from '../models/Trip.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { Booking } from '../models/Booking.js';
import { Expense } from '../models/Expense.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';

const router = Router();

const adjustmentSchema = z.object({
  targetItemId: z.string().min(1),
  action: z.enum(['REPLACE', 'REMOVE', 'ADJUST_COST']),
  simulatedCostMinor: z.number().int().min(0).optional(),
  simulatedTitle: z.string().optional(),
});

const simulatorPayloadSchema = z.object({
  adjustments: z.array(adjustmentSchema),
});

// Evaluate what-if simulation scenario without database mutation
router.post(
  '/trip/:tripId/evaluate',
  authenticate,
  validateBody(simulatorPayloadSchema),
  async (req: AuthRequest, res: Response) => {
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

      const originalForecast = calculateFinancialForecast(trip, items, bookings, expenses);

      // Clone items in memory
      const simulatedItems = items.map((i) => i.toObject());
      const { adjustments } = req.body;

      for (const adj of adjustments) {
        const itemIdx = simulatedItems.findIndex(
          (i) => i._id.toString() === adj.targetItemId
        );
        if (itemIdx >= 0) {
          if (adj.action === 'REMOVE') {
            simulatedItems[itemIdx].isRemoved = true;
          } else if (adj.action === 'REPLACE' || adj.action === 'ADJUST_COST') {
            if (typeof adj.simulatedCostMinor === 'number') {
              simulatedItems[itemIdx].estimatedCostMinor = adj.simulatedCostMinor;
            }
            if (adj.simulatedTitle) {
              simulatedItems[itemIdx].title = adj.simulatedTitle;
            }
          }
        }
      }

      const simulatedForecast = calculateFinancialForecast(
        trip,
        simulatedItems as any,
        bookings,
        expenses
      );

      const netDeltaMinor =
        originalForecast.projectedFinalCostMinor - simulatedForecast.projectedFinalCostMinor;

      res.json({
        success: true,
        simulationNotice: 'Simulation only — no booking or itinerary record has been modified.',
        originalForecast,
        simulatedForecast,
        netDeltaMinor,
        isSavings: netDeltaMinor > 0,
        adjustedItemsCount: adjustments.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;

