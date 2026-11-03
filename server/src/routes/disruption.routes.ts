import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Trip } from '../models/Trip.js';
import { Booking } from '../models/Booking.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';
import { Expense } from '../models/Expense.js';
import { getDestinationWeatherForecast, TripDisruptionAlert } from '../disruption/weatherService.js';
import { GeoapifyProvider } from '../providers/geoapify.provider.js';

const router = Router();

// GET /api/v1/disruptions/trip/:tripId/weather
router.get('/trip/:tripId/weather', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    // Resolve destination coordinates dynamically
    let lat = trip.destinationLatitude;
    let lng = trip.destinationLongitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      const firstItemWithCoord = await ItineraryItem.findOne({
        tripId,
        latitude: { $ne: null },
        longitude: { $ne: null },
      });
      if (firstItemWithCoord && typeof firstItemWithCoord.latitude === 'number' && typeof firstItemWithCoord.longitude === 'number') {
        lat = firstItemWithCoord.latitude;
        lng = firstItemWithCoord.longitude;
      } else {
        try {
          const geo = await GeoapifyProvider.geocode(trip.destination);
          if (geo.isResolved && typeof geo.lat === 'number' && typeof geo.lon === 'number') {
            lat = geo.lat;
            lng = geo.lon;
          }
        } catch {
          // Leave lat and lng undefined
        }
      }
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.json({
        success: true,
        data: {
          destination: trip.destination,
          coordinates: null,
          isResolved: false,
          forecast: [],
          message: 'Destination coordinates could not be resolved.',
        },
      });
    }

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

    const sym = trip.currency === 'INR' ? '₹' : trip.currency === 'USD' ? '$' : trip.currency === 'EUR' ? '€' : trip.currency === 'GBP' ? '£' : `${trip.currency} `;

    // 1. Budget overrun alert
    if (forecast.riskStatus === 'OVER_BUDGET') {
      alerts.push({
        id: 'alert-budget-overrun',
        type: 'BUDGET_OVERRUN',
        severity: 'HIGH',
        title: 'Projected Budget Infeasibility Detected',
        description: `Your trip is projected to exceed the budget by ${sym}${(
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

    // 3. Weather Disruption Alerts (anchored to trip's real destination coordinates)
    let weatherLat = trip.destinationLatitude;
    let weatherLng = trip.destinationLongitude;
    if (typeof weatherLat !== 'number' || typeof weatherLng !== 'number') {
      const firstItem = items.find((i) => typeof i.latitude === 'number' && typeof i.longitude === 'number');
      if (firstItem && typeof firstItem.latitude === 'number' && typeof firstItem.longitude === 'number') {
        weatherLat = firstItem.latitude;
        weatherLng = firstItem.longitude;
      } else {
        try {
          const geo = await GeoapifyProvider.geocode(trip.destination);
          if (geo.isResolved && typeof geo.lat === 'number' && typeof geo.lon === 'number') {
            weatherLat = geo.lat;
            weatherLng = geo.lon;
          }
        } catch {
          // Unresolved
        }
      }
    }

    if (typeof weatherLat === 'number' && typeof weatherLng === 'number') {
      const weatherList = await getDestinationWeatherForecast(weatherLat, weatherLng, 7);
      const rainDay = weatherList.find((w) => w.isOutdoorWarning);
      if (rainDay) {
        alerts.push({
          id: `alert-weather-${rainDay.dayNumber}`,
          type: 'WEATHER_DISRUPTION',
          severity: 'MEDIUM',
          title: `Precipitation Alert: Day ${rainDay.dayNumber} (${rainDay.condition})`,
          description: `${rainDay.precipitationProbability}% chance of rain in ${trip.destination}. ${rainDay.recommendation}`,
          actionUrl: '/itinerary',
          actionText: 'View Day Schedule',
          timestamp: new Date().toISOString(),
        });
      }
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
