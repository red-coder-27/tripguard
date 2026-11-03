import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { optimizeItineraryRecovery, computeSnapshotHash } from '../src/recovery/recoveryEngine.js';
import { BUILTIN_ALTERNATIVES } from '../src/recovery/alternativesCatalog.js';

describe('TripGuard Deterministic Recovery Engine', () => {
  const tripId = new mongoose.Types.ObjectId();
  const trip: any = {
    _id: tripId,
    name: 'Tokyo Test Scenario',
    currency: 'INR',
    totalBudgetMinor: 5000000, // ₹50,000
    emergencyReserveMinor: 0, // Usable = ₹50,000
    currentVersion: 1,
  };

  const hotelBookingId = new mongoose.Types.ObjectId();
  const hotelItemId = new mongoose.Types.ObjectId();
  const taxiBookingId = new mongoose.Types.ObjectId();
  const taxiItemId = new mongoose.Types.ObjectId();
  const optionalItemId = new mongoose.Types.ObjectId();
  const mustDoItemId = new mongoose.Types.ObjectId();

  const bookings: any[] = [
    {
      _id: hotelBookingId,
      category: 'ACCOMMODATION',
      provider: 'Grand Luxury Hotel',
      totalCostMinor: 1200000, // ₹12,000
      paidAmountMinor: 0,
      outstandingAmountMinor: 1200000,
      itineraryItemId: hotelItemId,
      status: 'CONFIRMED',
      cancellationPolicy: {
        isRefundable: true,
        cancellationFeeMinor: 0,
        refundableAmountMinor: 0,
      },
    },
    {
      _id: taxiBookingId,
      category: 'TRANSPORT',
      provider: 'Private VIP Chauffeur',
      totalCostMinor: 450000, // ₹4,500
      paidAmountMinor: 0,
      outstandingAmountMinor: 450000,
      itineraryItemId: taxiItemId,
      status: 'CONFIRMED',
      cancellationPolicy: {
        isRefundable: true,
        cancellationFeeMinor: 0,
        refundableAmountMinor: 0,
      },
    },
  ];

  const expenses: any[] = [
    {
      _id: new mongoose.Types.ObjectId(),
      description: 'Prepaid Visa & Health Insurance',
      category: 'MISC',
      amountMinor: 1000000, // ₹10,000 settled
      paymentStatus: 'SETTLED',
    },
  ];

  const items: any[] = [
    {
      _id: hotelItemId,
      title: 'Luxury Hotel Stay',
      category: 'ACCOMMODATION',
      estimatedCostMinor: 1200000,
      priority: 'FLEXIBLE',
      isLocked: false,
      bookingId: hotelBookingId,
      isRemoved: false,
    },
    {
      _id: taxiItemId,
      title: 'Private Taxi Transfer',
      category: 'TRANSPORT',
      estimatedCostMinor: 450000,
      priority: 'FLEXIBLE',
      isLocked: false,
      bookingId: taxiBookingId,
      isRemoved: false,
    },
    {
      _id: optionalItemId,
      title: 'Shibuya Sky Deck Observation Ticket',
      category: 'ACTIVITY',
      estimatedCostMinor: 150000, // ₹1,500
      priority: 'OPTIONAL',
      isLocked: false,
      isRemoved: false,
    },
    {
      _id: mustDoItemId,
      title: 'Senso-ji Sunrise Heritage Tour',
      category: 'ACTIVITY',
      estimatedCostMinor: 0,
      priority: 'MUST_DO',
      isLocked: true, // Non-negotiable constraint
      isRemoved: false,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      title: 'Tsukiji Market & Other Unbooked Sights',
      category: 'ACTIVITY',
      estimatedCostMinor: 2900000, // ₹29,000
      priority: 'MUST_DO',
      isLocked: false,
      isRemoved: false,
    },
  ];

  it('strictly protects MUST_DO and locked items from being modified or removed', () => {
    const result = optimizeItineraryRecovery(trip, items, bookings, expenses);

    expect(result.isInfeasible).toBe(false);
    expect(result.strategies.length).toBe(3);

    for (const strategy of result.strategies) {
      expect(strategy.constraintValidation.mustDoProtected).toBe(true);
      expect(strategy.constraintValidation.lockedItemsProtected).toBe(true);

      const modifiedIds = strategy.modifications.map((m) => m.targetId);
      expect(modifiedIds).not.toContain(mustDoItemId.toString());
    }
  });

  it('produces bitwise identical outputs for identical inputs (determinism)', () => {
    const run1 = optimizeItineraryRecovery(trip, items, bookings, expenses);
    const run2 = optimizeItineraryRecovery(trip, items, bookings, expenses);

    expect(run1.snapshotHash).toBe(run2.snapshotHash);
    expect(run1.strategies[0].netSavingsMinor).toBe(run2.strategies[0].netSavingsMinor);
    expect(run1.strategies[1].netSavingsMinor).toBe(run2.strategies[1].netSavingsMinor);
    expect(run1.strategies[2].netSavingsMinor).toBe(run2.strategies[2].netSavingsMinor);
    expect(run1.strategies[1].modifications.length).toBe(run2.strategies[1].modifications.length);
  });

  it('recovers exactly ₹7,000 in the Balanced Recovery strategy to restore ₹50,000 budget', () => {
    const result = optimizeItineraryRecovery(trip, items, bookings, expenses);
    const balanced = result.strategies.find((s) => s.strategyType === 'BALANCED_RECOVERY');

    expect(balanced).toBeDefined();
    // Balanced strategy nets ₹3,500 (hotel) + ₹2,000 (taxi -> rail) + ₹1,500 (sky deck -> free observatory) = ₹7,000!
    expect(balanced!.netSavingsMinor).toBe(700000); // 700,000 paise = ₹7,000
    expect(balanced!.revisedProjectedCostMinor).toBe(5000000); // Exactly ₹50,000
    expect(balanced!.constraintValidation.budgetFeasible).toBe(true);
  });

  it('honestly reports infeasibility when all items are MUST_DO or locked', () => {
    // Lock all items
    const allLockedItems = items.map((i) => ({ ...i, priority: 'MUST_DO', isLocked: true }));
    const result = optimizeItineraryRecovery(trip, allLockedItems, bookings, expenses);

    expect(result.isInfeasible).toBe(true);
    expect(result.infeasibilityReason).toBeDefined();
  });
});

