import { Router, Response } from 'express';
import { Trip } from '../models/Trip.js';
import { RecoveryRun } from '../models/RecoveryRun.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get recovery decision ledger for trip
router.get('/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const [runs, auditEvents] = await Promise.all([
      RecoveryRun.find({ tripId: trip._id }).sort({ createdAt: -1 }),
      AuditEvent.find({ tripId: trip._id }).sort({ timestamp: -1 }),
    ]);

    res.json({
      success: true,
      currentVersion: trip.currentVersion,
      runs,
      auditEvents,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get specific recovery run details
router.get('/run/:runId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const run = await RecoveryRun.findOne({ runId: req.params.runId });
    if (!run) {
      res.status(404).json({ success: false, error: 'Recovery run not found.' });
      return;
    }

    const trip = await Trip.findOne({ _id: run.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(403).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    res.json({ success: true, run, currentTripVersion: trip.currentVersion });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

