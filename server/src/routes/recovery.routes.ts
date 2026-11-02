import { Router, Response } from 'express';
import { z } from 'zod';
import { Trip } from '../models/Trip.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { Booking } from '../models/Booking.js';
import { Expense } from '../models/Expense.js';
import { RecoveryRun } from '../models/RecoveryRun.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { optimizeItineraryRecovery, computeSnapshotHash } from '../recovery/recoveryEngine.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';

const router = Router();

const approveSchema = z.object({
  runId: z.string().min(1),
  strategyType: z.enum(['MINIMUM_DISRUPTION', 'BALANCED_RECOVERY', 'MAXIMUM_SAVINGS']),
  approvalNotes: z.string().default('Approved by traveler'),
});

const rejectSchema = z.object({
  runId: z.string().min(1),
  rejectionReason: z.string().default('Declined by traveler'),
});

// Generate new recovery run
router.post('/trip/:tripId/generate', authenticate, async (req: AuthRequest, res: Response) => {
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

    const optimizationResult = optimizeItineraryRecovery(trip, items, bookings, expenses);

    const runId = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const recoveryRun = await RecoveryRun.create({
      tripId: trip._id,
      runId,
      status: 'GENERATED',
      snapshotHash: optimizationResult.snapshotHash,
      itineraryVersionBefore: trip.currentVersion,
      originalForecast: optimizationResult.originalForecast,
      strategies: optimizationResult.strategies,
      isStale: false,
    });

    await AuditEvent.create({
      tripId: trip._id,
      userId: req.user!.id,
      eventType: 'RECOVERY_GENERATED',
      metadata: {
        runId,
        strategiesCount: optimizationResult.strategies.length,
        isInfeasible: optimizationResult.isInfeasible,
      },
    });

    res.status(201).json({
      success: true,
      recoveryRun,
      strategies: optimizationResult.strategies,
      isInfeasible: optimizationResult.isInfeasible,
      infeasibilityReason: optimizationResult.infeasibilityReason,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List recovery runs for trip
router.get('/trip/:tripId/runs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const runs = await RecoveryRun.find({ tripId: trip._id }).sort({ createdAt: -1 });

    // Check if the latest run's snapshot is still fresh
    const [items, bookings, expenses] = await Promise.all([
      ItineraryItem.find({ tripId: trip._id, isRemoved: false }),
      Booking.find({ tripId: trip._id }),
      Expense.find({ tripId: trip._id }),
    ]);
    const currentHash = computeSnapshotHash(trip, items, bookings, expenses);

    const runsWithFreshness = runs.map((run) => {
      const isStale = run.isStale || (run.status === 'GENERATED' && run.snapshotHash !== currentHash);
      return {
        ...run.toObject(),
        isStale,
      };
    });

    res.json({ success: true, runs: runsWithFreshness });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Approve a recovery strategy and version the itinerary
router.post('/trip/:tripId/approve', authenticate, validateBody(approveSchema), async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const { runId, strategyType, approvalNotes } = req.body;

    const recoveryRun = await RecoveryRun.findOne({ runId, tripId: trip._id });
    if (!recoveryRun) {
      res.status(404).json({ success: false, error: 'Recovery run record not found.' });
      return;
    }

    // Verify staleness
    const [currentItems, currentBookings, currentExpenses] = await Promise.all([
      ItineraryItem.find({ tripId: trip._id, isRemoved: false }),
      Booking.find({ tripId: trip._id }),
      Expense.find({ tripId: trip._id }),
    ]);
    const currentHash = computeSnapshotHash(trip, currentItems, currentBookings, currentExpenses);

    if (recoveryRun.isStale || recoveryRun.snapshotHash !== currentHash) {
      res.status(409).json({
        success: false,
        error:
          'This recovery proposal is stale. The underlying itinerary or financial records have changed since generation. Please regenerate recovery to evaluate fresh data.',
      });
      return;
    }

    const selectedStrategy = recoveryRun.strategies.find((s) => s.strategyType === strategyType);
    if (!selectedStrategy) {
      res.status(400).json({ success: false, error: `Strategy ${strategyType} not found in this run.` });
      return;
    }

    // Apply modifications to create new itinerary version (currentVersion + 1)
    const nextVersion = trip.currentVersion + 1;

    for (const mod of selectedStrategy.modifications) {
      if (mod.actionType === 'REPLACE') {
        const item = await ItineraryItem.findById(mod.targetId);
        if (item) {
          // If linked booking exists, update old booking liability and unlink from active item
          if (item.bookingId) {
            await Booking.findByIdAndUpdate(item.bookingId, {
              itineraryItemId: null,
              status: 'MODIFIED',
              totalCostMinor: mod.cancellationFeeMinor,
              outstandingAmountMinor: mod.cancellationFeeMinor,
              notes: `TripGuard Recovery: Replaced with ${mod.replacementName}. Avoided liability: ₹${(
                mod.originalRemainingLiabilityMinor / 100
              ).toLocaleString()}. Contact vendor to complete cancellation/modification.`,
            });
            item.bookingId = null as any;
          }

          item.title = mod.replacementName || item.title;
          item.estimatedCostMinor = mod.replacementCostMinor ?? item.estimatedCostMinor;
          item.version = nextVersion;
          item.description = `${item.description} [TripGuard Recovery Replacement: ${mod.replacementName}]`;
          await item.save();
        }
      } else if (mod.actionType === 'REMOVE') {
        const item = await ItineraryItem.findById(mod.targetId);
        if (item) {
          item.isRemoved = true;
          item.version = nextVersion;
          await item.save();

          if (item.bookingId) {
            await Booking.findByIdAndUpdate(item.bookingId, {
              itineraryItemId: null,
              status: 'CANCELLED',
              totalCostMinor: mod.cancellationFeeMinor,
              outstandingAmountMinor: mod.cancellationFeeMinor,
              notes: `TripGuard Recovery: Cancel booking. Expected refund: ₹${(
                mod.expectedRefundMinor / 100
              ).toLocaleString()}.`,
            });
          }
        }
      }
    }

    // Update Trip version
    trip.currentVersion = nextVersion;
    await trip.save();

    // Mark current run as APPROVED
    recoveryRun.status = 'APPROVED';
    recoveryRun.approvedAt = new Date();
    recoveryRun.selectedStrategyType = strategyType;
    recoveryRun.approvalNotes = approvalNotes;
    recoveryRun.itineraryVersionAfter = nextVersion;
    await recoveryRun.save();

    // Supersede any older runs
    await RecoveryRun.updateMany(
      { tripId: trip._id, runId: { $ne: runId }, status: 'GENERATED' },
      { status: 'SUPERSEDED' }
    );

    // Write audit event
    await AuditEvent.create({
      tripId: trip._id,
      userId: req.user!.id,
      eventType: 'RECOVERY_APPROVED',
      metadata: {
        runId,
        strategyType,
        netSavingsMinor: selectedStrategy.netSavingsMinor,
        newItineraryVersion: nextVersion,
      },
    });

    // Recompute fresh forecast
    const [updatedItems, updatedBookings, updatedExpenses] = await Promise.all([
      ItineraryItem.find({ tripId: trip._id, isRemoved: false }),
      Booking.find({ tripId: trip._id }),
      Expense.find({ tripId: trip._id }),
    ]);
    const updatedForecast = calculateFinancialForecast(trip, updatedItems, updatedBookings, updatedExpenses);

    res.json({
      success: true,
      message: `Recovery plan '${selectedStrategy.title}' approved successfully. Itinerary upgraded to v${nextVersion}.`,
      approvedRun: recoveryRun,
      newVersion: nextVersion,
      updatedForecast,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reject a recovery strategy
router.post('/trip/:tripId/reject', authenticate, validateBody(rejectSchema), async (req: AuthRequest, res: Response) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user!.id });
    if (!trip) {
      res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      return;
    }

    const { runId, rejectionReason } = req.body;
    const recoveryRun = await RecoveryRun.findOne({ runId, tripId: trip._id });
    if (!recoveryRun) {
      res.status(404).json({ success: false, error: 'Recovery run not found.' });
      return;
    }

    recoveryRun.status = 'REJECTED';
    recoveryRun.approvalNotes = rejectionReason;
    await recoveryRun.save();

    await AuditEvent.create({
      tripId: trip._id,
      userId: req.user!.id,
      eventType: 'RECOVERY_REJECTED',
      metadata: { runId, rejectionReason },
    });

    res.json({ success: true, message: 'Recovery plan rejected.', recoveryRun });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
