import { Router, Response } from 'express';
import { Trip } from '../models/Trip.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { Booking } from '../models/Booking.js';
import { Expense } from '../models/Expense.js';
import { RecoveryRun } from '../models/RecoveryRun.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';

const router = Router();

router.get('/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const [items, bookings, expenses, approvedRun] = await Promise.all([
      ItineraryItem.find({ tripId: trip._id, isRemoved: false }),
      Booking.find({ tripId: trip._id }),
      Expense.find({ tripId: trip._id }),
      RecoveryRun.findOne({ tripId: trip._id, status: 'APPROVED' }),
    ]);

    const forecast = calculateFinancialForecast(trip, items, bookings, expenses);

    // 1. Category Breakdown
    const categoryTotals: Record<string, { settled: number; planned: number }> = {
      ACCOMMODATION: { settled: 0, planned: 0 },
      TRANSPORT: { settled: 0, planned: 0 },
      ACTIVITY: { settled: 0, planned: 0 },
      FOOD_DINING: { settled: 0, planned: 0 },
      SHOPPING: { settled: 0, planned: 0 },
      MISC: { settled: 0, planned: 0 },
    };

    for (const exp of expenses) {
      if (exp.paymentStatus === 'SETTLED' && categoryTotals[exp.category]) {
        categoryTotals[exp.category].settled += exp.amountMinor;
      }
    }

    for (const item of items) {
      if (categoryTotals[item.category]) {
        categoryTotals[item.category].planned += item.estimatedCostMinor;
      }
    }

    const categoryBreakdown = Object.entries(categoryTotals).map(([category, amounts]) => ({
      category,
      settledMinor: amounts.settled,
      plannedMinor: amounts.planned,
      totalMinor: amounts.settled + amounts.planned,
      settledFormatted: (amounts.settled / 100).toLocaleString(),
      totalFormatted: ((amounts.settled + amounts.planned) / 100).toLocaleString(),
    }));

    // 2. Daily Spending Trend (from expenses)
    const dailyMap: Record<string, number> = {};
    for (const exp of expenses) {
      if (exp.paymentStatus === 'SETTLED') {
        const dateStr = new Date(exp.date).toISOString().split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + exp.amountMinor;
      }
    }

    const dailyTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amountMinor]) => ({
        date,
        amountMinor,
        amountFormatted: (amountMinor / 100).toLocaleString(),
      }));

    // 3. Recovery impact
    let recoverySavingsMinor = 0;
    if (approvedRun && approvedRun.selectedStrategyType) {
      const selected = approvedRun.strategies.find(
        (s) => s.strategyType === approvedRun.selectedStrategyType
      );
      if (selected) {
        recoverySavingsMinor = selected.netSavingsMinor;
      }
    }

    res.json({
      success: true,
      forecast,
      categoryBreakdown,
      dailyTrend,
      recoverySavingsMinor,
      currentVersion: trip.currentVersion,
      hasApprovedRecovery: !!approvedRun,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

