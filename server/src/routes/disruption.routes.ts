import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Trip } from '../models/Trip.js';
import { Booking } from '../models/Booking.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';
import { Expense } from '../models/Expense.js';
import { getDestinationWeatherForecast, TripDisruptionAlert } from '../disruption/weatherService.js';

const router = Router();

// GET /api/v1/disruptions/trip/:tripId/weather
router.get('/trip/:tripId/weather', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    // Find destination center (default Tokyo)
    const firstItemWithCoord = await ItineraryItem.findOne({
      tripId,
      latitude: { $ne: null },
      longitude: { $ne: null },
    });

    const lat = firstItemWithCoord?.latitude || 35.6938;
    const lng = firstItemWithCoord?.longitude || 139.7034;

    const daysCount = Math.max(
      1,
      Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000)
    );

    const weatherForecast = await getDestinationWeatherForecast(lat, lng, Math.min(daysCount, 7));

    res.json({
      success: true,
      data: {
        destination: trip.destination,
        coordinates: { lat, lng },
        forecast: weatherForecast,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/disruptions/trip/:tripId/alerts
router.get('/trip/:tripId/alerts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    const items = await ItineraryItem.find({ tripId });
    const bookings = await Booking.find({ tripId });
    const expenses = await Expense.find({ tripId });

    const forecast = calculateFinancialForecast(trip, items, bookings, expenses);
    const alerts: TripDisruptionAlert[] = [];

    // 1. Budget overrun alert
    if (forecast.riskStatus === 'OVER_BUDGET') {
      alerts.push({
        id: 'alert-budget-overrun',
        type: 'BUDGET_OVERRUN',
        severity: 'HIGH',
        title: 'Projected Budget Infeasibility Detected',
        description: `Your trip is projected to exceed the budget by ₹${(
          forecast.overspendingGapMinor / 100
        ).toLocaleString()}. Review deterministic recovery solutions immediately to rebalance cash reserves.`,
        actionUrl: '/recovery',
        actionText: 'View Recovery Plans',
        timestamp: new Date().toISOString(),
      });
    } else if (forecast.riskStatus === 'AT_RISK') {
      alerts.push({
        id: 'alert-budget-at-risk',
        type: 'BUDGET_OVERRUN',
        severity: 'MEDIUM',
        title: 'Emergency Reserve Buffer Threatened',
        description: 'Remaining projected expenditures are dipping into your emergency cash reserve threshold.',
        actionUrl: '/recovery',
        actionText: 'Optimize Expenditures',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Cancellation deadline alerts for bookings
    for (const b of bookings) {
      if (b.status === 'CONFIRMED' && b.cancellationPolicy.isRefundable) {
        alerts.push({
          id: `alert-cancel-${b._id}`,
          type: 'BOOKING_DEADLINE',
          severity: 'INFO',
          title: `Free Cancellation Deadline: ${b.provider}`,
          description: `Policy terms: ${b.cancellationPolicy.policyNotes || 'Free cancellation deadline approaching.'} Review before commitment becomes non-refundable.`,
          actionUrl: '/bookings',
          actionText: 'Inspect Booking',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 3. Weather Disruption Alerts
    const weatherList = await getDestinationWeatherForecast(35.6938, 139.7034, 7);
    const rainDay = weatherList.find((w) => w.isOutdoorWarning);
    if (rainDay) {
      alerts.push({
        id: `alert-weather-${rainDay.dayNumber}`,
        type: 'WEATHER_DISRUPTION',
        severity: 'MEDIUM',
        title: `Precipitation Alert: Day ${rainDay.dayNumber} (${rainDay.condition})`,
        description: `${rainDay.precipitationProbability}% chance of rain. ${rainDay.recommendation}`,
        actionUrl: '/itinerary',
        actionText: 'View Day Schedule',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: alerts,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
