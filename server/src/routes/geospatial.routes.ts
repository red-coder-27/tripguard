import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { Trip } from '../models/Trip.js';
import {
  analyzeDayBacktracking,
  findNearbyAlternatives,
  compareTransportModes,
} from '../geospatial/geoService.js';

const router = Router();

// GET /api/v1/geo/trip/:tripId/map-data
router.get('/trip/:tripId/map-data', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });
    }

    const items = await ItineraryItem.find({ tripId, isRemoved: false }).sort({ dayNumber: 1, startTime: 1 });

    // Group items by day
    const dayGroups: Record<number, typeof items> = {};
    for (const item of items) {
      if (!dayGroups[item.dayNumber]) {
        dayGroups[item.dayNumber] = [];
      }
      dayGroups[item.dayNumber].push(item);
    }

    // Run backtracking detection for each day
    const backtrackingReports = Object.keys(dayGroups).map((dayStr) => {
      const dayNum = Number(dayStr);
      return analyzeDayBacktracking(dayNum, dayGroups[dayNum]);
    });

    res.json({
      success: true,
      data: {
        tripId,
        destination: trip.destination,
        totalDays: Object.keys(dayGroups).length,
        items,
        backtrackingReports,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/geo/nearby?lat=..&lng=..&radius=..&category=..&currency=..
router.get('/nearby', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lat = Number(req.query.lat) || 48.8566;
    const lng = Number(req.query.lng) || 2.3522;
    const radius = Number(req.query.radius) || 10;
    const category = req.query.category as string | undefined;
    const currency = (req.query.currency as string) || 'INR';

    const alternatives = await findNearbyAlternatives(lat, lng, radius, category, currency);
    res.json({
      success: true,
      data: alternatives,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/geo/transit-compare?distanceKm=..&currency=..
router.get('/transit-compare', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const distanceKm = Number(req.query.distanceKm) || 8.5;
    const currency = (req.query.currency as string) || 'INR';
    const options = compareTransportModes(distanceKm, currency);
    res.json({
      success: true,
      data: {
        distanceKm,
        options,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
