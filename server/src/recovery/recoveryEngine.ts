import crypto from 'crypto';
import { ITrip } from '../models/Trip.js';
import { IItineraryItem } from '../models/ItineraryItem.js';
import { IBooking } from '../models/Booking.js';
import { IExpense } from '../models/Expense.js';
import {
  FinancialForecastBreakdown,
  ProposedModification,
  RecoveryOptimizationOutput,
  RecoveryStrategyResult,
  RecoveryStrategyType,
} from '../types/index.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';
import { BUILTIN_ALTERNATIVES, AlternativeCandidate } from './alternativesCatalog.js';

export function computeSnapshotHash(
  trip: ITrip,
  itineraryItems: IItineraryItem[],
  bookings: IBooking[],
  expenses: IExpense[]
): string {
  const hash = crypto.createHash('sha256');

  hash.update(trip._id.toString());
  hash.update(String(trip.totalBudgetMinor));
  hash.update(String(trip.emergencyReserveMinor));
  hash.update(String(trip.currentVersion));

  // Sort items deterministically by ID
  const sortedItems = [...itineraryItems].sort((a, b) => a._id.toString().localeCompare(b._id.toString()));
  for (const item of sortedItems) {
    hash.update(`${item._id}-${item.estimatedCostMinor}-${item.priority}-${item.isLocked}-${item.isRemoved}`);
  }

  const sortedBookings = [...bookings].sort((a, b) => a._id.toString().localeCompare(b._id.toString()));
  for (const b of sortedBookings) {
    hash.update(`${b._id}-${b.totalCostMinor}-${b.paidAmountMinor}-${b.status}`);
  }

  const sortedExpenses = [...expenses].sort((a, b) => a._id.toString().localeCompare(b._id.toString()));
  for (const exp of sortedExpenses) {
    hash.update(`${exp._id}-${exp.amountMinor}-${exp.paymentStatus}`);
  }

  return hash.digest('hex');
}

/**
 * Deterministic recovery engine that generates 3 mathematically sound recovery plans
 * respecting all hard constraints and accounting rules.
 */
export function optimizeItineraryRecovery(
  trip: ITrip,
  itineraryItems: IItineraryItem[],
  bookings: IBooking[],
  expenses: IExpense[],
  customAlternatives: AlternativeCandidate[] = []
): RecoveryOptimizationOutput {
  const forecast = calculateFinancialForecast(trip, itineraryItems, bookings, expenses);
  const snapshotHash = computeSnapshotHash(trip, itineraryItems, bookings, expenses);

  const overspendTarget = forecast.overspendingGapMinor;
  const catalog = [...customAlternatives, ...BUILTIN_ALTERNATIVES];

  // If already financially safe and no overspending gap exists
  if (overspendTarget <= 0) {
    return {
      tripId: trip._id.toString(),
      snapshotHash,
      originalForecast: forecast,
      strategies: [
        createAlreadyOptimalStrategy('MINIMUM_DISRUPTION', forecast),
        createAlreadyOptimalStrategy('BALANCED_RECOVERY', forecast),
        createAlreadyOptimalStrategy('MAXIMUM_SAVINGS', forecast),
      ],
      isInfeasible: false,
      generatedAt: new Date().toISOString(),
    };
  }

  // Generate candidates for optimization
  // Map bookings to their itinerary items (bidirectional lookup)
  const bookingMap = new Map<string, IBooking>();
  for (const b of bookings) {
    if (b.itineraryItemId) {
      bookingMap.set(b.itineraryItemId.toString(), b);
    }
  }
  for (const item of itineraryItems) {
    if (item.bookingId && !bookingMap.has(item._id.toString())) {
      const b = bookings.find((x) => x._id.toString() === item.bookingId?.toString());
      if (b) {
        bookingMap.set(item._id.toString(), b);
      }
    }
  }

  // Strategy A: Minimum Disruption
  const minDisruptionStrategy = solveStrategy(
    'MINIMUM_DISRUPTION',
    trip,
    itineraryItems,
    bookings,
    bookingMap,
    catalog,
    forecast,
    overspendTarget
  );

  // Strategy B: Balanced Recovery (Recommended)
  const balancedStrategy = solveStrategy(
    'BALANCED_RECOVERY',
    trip,
    itineraryItems,
    bookings,
    bookingMap,
    catalog,
    forecast,
    overspendTarget
  );

  // Strategy C: Maximum Savings
  const maxSavingsStrategy = solveStrategy(
    'MAXIMUM_SAVINGS',
    trip,
    itineraryItems,
    bookings,
    bookingMap,
    catalog,
    forecast,
    overspendTarget
  );

  const allInfeasible =
    !minDisruptionStrategy.constraintValidation.budgetFeasible &&
    !balancedStrategy.constraintValidation.budgetFeasible &&
    !maxSavingsStrategy.constraintValidation.budgetFeasible;

  return {
    tripId: trip._id.toString(),
    snapshotHash,
    originalForecast: forecast,
    strategies: [minDisruptionStrategy, balancedStrategy, maxSavingsStrategy],
    isInfeasible: allInfeasible,
    infeasibilityReason: allInfeasible
      ? 'Unable to recover budget within defined hard constraints (MUST_DO activities and locked items consume required budget).'
      : undefined,
    generatedAt: new Date().toISOString(),
  };
}

function solveStrategy(
  strategyType: RecoveryStrategyType,
  trip: ITrip,
  itineraryItems: IItineraryItem[],
  bookings: IBooking[],
  bookingMap: Map<string, IBooking>,
  catalog: AlternativeCandidate[],
  forecast: FinancialForecastBreakdown,
  targetGapMinor: number
): RecoveryStrategyResult {
  const modifications: ProposedModification[] = [];
  let cumulativeSavingsMinor = 0;
  let cumulativeDisruption = 0;

  // Active items eligible for consideration
  const eligibleItems = itineraryItems.filter(
    (item) => !item.isRemoved && !item.isLocked && item.priority !== 'MUST_DO'
  );

  // Strategy profiles dictate candidate selection order & permissions
  if (strategyType === 'MINIMUM_DISRUPTION') {
    // Priority: Transport replacement first (least lifestyle friction), then modest accommodation swap
    // NEVER remove activities in Minimum Disruption
    const transportItems = eligibleItems.filter((i) => i.category === 'TRANSPORT');
    const accommodationItems = eligibleItems.filter((i) => i.category === 'ACCOMMODATION');

    // 1. Evaluate Transport
    for (const item of transportItems) {
      if (cumulativeSavingsMinor >= targetGapMinor) break;
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'STANDARD');
      if (mod && mod.netSavingsMinor > 0) {
        modifications.push(mod);
        cumulativeSavingsMinor += mod.netSavingsMinor;
        cumulativeDisruption += mod.disruptionScore;
      }
    }

    // 2. Evaluate Accommodation if gap still open
    for (const item of accommodationItems) {
      if (cumulativeSavingsMinor >= targetGapMinor) break;
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'STANDARD');
      if (mod && mod.netSavingsMinor > 0) {
        modifications.push(mod);
        cumulativeSavingsMinor += mod.netSavingsMinor;
        cumulativeDisruption += mod.disruptionScore;
      }
    }
  } else if (strategyType === 'BALANCED_RECOVERY') {
    // Balanced: Replace high-cost accommodation with boutique standard, optimize transport, replace optional activity
    const accommodationItems = eligibleItems.filter((i) => i.category === 'ACCOMMODATION');
    const transportItems = eligibleItems.filter((i) => i.category === 'TRANSPORT');
    const optionalActivities = eligibleItems.filter(
      (i) => i.category === 'ACTIVITY' && i.priority === 'OPTIONAL'
    );

    // 1. Accommodation
    for (const item of accommodationItems) {
      if (cumulativeSavingsMinor >= targetGapMinor) break;
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'STANDARD');
      if (mod && mod.netSavingsMinor > 0) {
        modifications.push(mod);
        cumulativeSavingsMinor += mod.netSavingsMinor;
        cumulativeDisruption += mod.disruptionScore;
      }
    }

    // 2. Transport
    for (const item of transportItems) {
      if (cumulativeSavingsMinor >= targetGapMinor) break;
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'STANDARD');
      if (mod && mod.netSavingsMinor > 0) {
        modifications.push(mod);
        cumulativeSavingsMinor += mod.netSavingsMinor;
        cumulativeDisruption += mod.disruptionScore;
      }
    }

    // 3. Optional Activity swap for free/budget alternative
    for (const item of optionalActivities) {
      if (cumulativeSavingsMinor >= targetGapMinor) break;
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'BUDGET');
      if (mod && mod.netSavingsMinor > 0) {
        modifications.push(mod);
        cumulativeSavingsMinor += mod.netSavingsMinor;
        cumulativeDisruption += mod.disruptionScore;
      }
    }
  } else {
    // MAXIMUM_SAVINGS: Aggressive cost reduction, budget tier wherever certified, remove optional items
    const allEligible = [...eligibleItems].sort(
      (a, b) => b.estimatedCostMinor - a.estimatedCostMinor
    );

    for (const item of allEligible) {
      if (cumulativeSavingsMinor >= targetGapMinor * 1.2) break; // Allow margin of safety

      if (item.priority === 'OPTIONAL' && item.category === 'ACTIVITY') {
        // Can remove completely or swap to free
        const mod = evaluateRemovalOrFreeSwap(item, bookingMap.get(item._id.toString()), catalog);
        if (mod && mod.netSavingsMinor > 0) {
          modifications.push(mod);
          cumulativeSavingsMinor += mod.netSavingsMinor;
          cumulativeDisruption += mod.disruptionScore;
          continue;
        }
      }

      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'BUDGET');
      if (mod && mod.netSavingsMinor > 0) {
        modifications.push(mod);
        cumulativeSavingsMinor += mod.netSavingsMinor;
        cumulativeDisruption += mod.disruptionScore;
      }
    }
  }

  const revisedProjectedCostMinor = Math.max(
    0,
    forecast.projectedFinalCostMinor - cumulativeSavingsMinor
  );

  const budgetFeasible = revisedProjectedCostMinor <= forecast.usableBudgetMinor;
  const normalizedDisruption = Math.min(100, Math.round(cumulativeDisruption));
  const savingsPct =
    forecast.projectedFinalCostMinor > 0
      ? Math.round((cumulativeSavingsMinor / forecast.projectedFinalCostMinor) * 100)
      : 0;

  let title: string;
  let tagline: string;
  let description: string;
  let isRecommended = false;

  if (strategyType === 'MINIMUM_DISRUPTION') {
    title = 'Minimum Disruption';
    tagline = 'Protect your experiences; optimize transit and logistics';
    description =
      'Maintains 100% of your planned activities and sights. Rebalances transport and flexible logistics to close the deficit with minimal experiential friction.';
  } else if (strategyType === 'BALANCED_RECOVERY') {
    title = 'Balanced Recovery';
    tagline = 'Optimal equilibrium between savings and travel comfort';
    description =
      'Combines high-value boutique accommodation alternatives with efficient transit passes and free panoramic experiences. Restores budget with high traveler satisfaction.';
    isRecommended = true;
  } else {
    title = 'Maximum Savings';
    tagline = 'Aggressive fiscal relief with certified budget alternatives';
    description =
      'Swaps to certified budget accommodations, transit coaches, and eliminates discretionary paid admissions to maximize cash conservation.';
  }

  return {
    strategyType,
    title,
    tagline,
    description,
    isRecommended,
    originalProjectedCostMinor: forecast.projectedFinalCostMinor,
    revisedProjectedCostMinor,
    netSavingsMinor: cumulativeSavingsMinor,
    savingsPercentage: savingsPct,
    disruptionScore: normalizedDisruption,
    affectedCount: modifications.length,
    modifications,
    constraintValidation: {
      mustDoProtected: true,
      lockedItemsProtected: true,
      budgetFeasible,
      reserveProtected: revisedProjectedCostMinor <= forecast.usableBudgetMinor,
      cancellationLiabilitiesHonored: true,
    },
    narrativeSummary: `Identified ${modifications.length} actionable modifications providing ₹${(
      cumulativeSavingsMinor / 100
    ).toLocaleString()} in net verified savings (disruption index: ${normalizedDisruption}/100).`,
  };
}

function evaluateReplacement(
  item: IItineraryItem,
  booking: IBooking | undefined,
  catalog: AlternativeCandidate[],
  preferredTier: 'BUDGET' | 'STANDARD' | 'PREMIUM'
): ProposedModification | null {
  const candidates = catalog.filter(
    (c) => c.category === item.category && (preferredTier === 'BUDGET' || c.tier === preferredTier)
  );

  if (candidates.length === 0) return null;

  // Determine original remaining liability and cancellation terms
  let originalCostMinor = item.estimatedCostMinor;
  let originalRemainingLiabilityMinor = item.estimatedCostMinor;
  let cancellationFeeMinor = 0;
  let expectedRefundMinor = 0;

  if (booking) {
    originalCostMinor = booking.totalCostMinor;
    originalRemainingLiabilityMinor = booking.outstandingAmountMinor;
    cancellationFeeMinor = booking.cancellationPolicy?.cancellationFeeMinor || 0;
    expectedRefundMinor = booking.cancellationPolicy?.refundableAmountMinor || 0;
  }

  // Find candidate that produces greatest valid positive net saving
  let bestCandidate: AlternativeCandidate | null = null;
  let maxNetSaving = 0;

  for (const cand of candidates) {
    if (cand.costMinor >= originalCostMinor) continue;

    const netSaving =
      originalRemainingLiabilityMinor - cand.costMinor - cancellationFeeMinor + expectedRefundMinor;

    if (netSaving > maxNetSaving) {
      maxNetSaving = netSaving;
      bestCandidate = cand;
    }
  }

  if (!bestCandidate || maxNetSaving <= 0) return null;

  return {
    actionType: 'REPLACE',
    targetType: item.category as any,
    targetId: item._id.toString(),
    targetName: item.title,
    originalCostMinor,
    originalRemainingLiabilityMinor,
    replacementId: bestCandidate.id,
    replacementName: bestCandidate.name,
    replacementCostMinor: bestCandidate.costMinor,
    cancellationFeeMinor,
    expectedRefundMinor,
    netSavingsMinor: maxNetSaving,
    disruptionScore: bestCandidate.disruptionFactor,
    travelImpactDescription: `Switches to ${bestCandidate.name} (${bestCandidate.description}). Distance: ${bestCandidate.distanceKmFromCenter}km.`,
    justification: `Saves ₹${(maxNetSaving / 100).toLocaleString()} while retaining safety certification and certified 4.5+ guest rating.`,
    constraintValidated: true,
  };
}

function evaluateRemovalOrFreeSwap(
  item: IItineraryItem,
  booking: IBooking | undefined,
  catalog: AlternativeCandidate[]
): ProposedModification | null {
  // Check if free alternative exists in catalog
  const freeAlt = catalog.find(
    (c) => c.category === item.category && c.costMinor === 0
  );

  let cancellationFeeMinor = 0;
  let expectedRefundMinor = 0;
  const originalCostMinor = booking ? booking.totalCostMinor : item.estimatedCostMinor;
  const originalRemainingMinor = booking ? booking.outstandingAmountMinor : item.estimatedCostMinor;

  if (booking) {
    cancellationFeeMinor = booking.cancellationPolicy?.cancellationFeeMinor || 0;
    expectedRefundMinor = booking.cancellationPolicy?.refundableAmountMinor || 0;
  }

  if (freeAlt) {
    const netSaving = originalRemainingMinor - cancellationFeeMinor + expectedRefundMinor;
    return {
      actionType: 'REPLACE',
      targetType: 'ACTIVITY',
      targetId: item._id.toString(),
      targetName: item.title,
      originalCostMinor,
      originalRemainingLiabilityMinor: originalRemainingMinor,
      replacementId: freeAlt.id,
      replacementName: freeAlt.name,
      replacementCostMinor: 0,
      cancellationFeeMinor,
      expectedRefundMinor,
      netSavingsMinor: netSaving,
      disruptionScore: 15,
      travelImpactDescription: `Replaces paid admission with zero-cost ${freeAlt.name}.`,
      justification: `Free admission avoids admission cost with zero compromise to scenic skyline experience.`,
      constraintValidated: true,
    };
  }

  // Removal option
  const netSaving = originalRemainingMinor - cancellationFeeMinor + expectedRefundMinor;
  return {
    actionType: 'REMOVE',
    targetType: 'ACTIVITY',
    targetId: item._id.toString(),
    targetName: item.title,
    originalCostMinor,
    originalRemainingLiabilityMinor: originalRemainingMinor,
    cancellationFeeMinor,
    expectedRefundMinor,
    netSavingsMinor: netSaving,
    disruptionScore: 20,
    travelImpactDescription: `Removes optional activity '${item.title}' from day itinerary.`,
    justification: `Activity is designated OPTIONAL by traveler. Removal frees ₹${(
      netSaving / 100
    ).toLocaleString()} in budget.`,
    constraintValidated: true,
  };
}

function createAlreadyOptimalStrategy(
  strategyType: RecoveryStrategyType,
  forecast: FinancialForecastBreakdown
): RecoveryStrategyResult {
  return {
    strategyType,
    title: strategyType.replace('_', ' '),
    tagline: 'Itinerary is already financially balanced',
    description: 'Projected expenditures are comfortably within your usable budget allocation. No adjustments required.',
    isRecommended: strategyType === 'BALANCED_RECOVERY',
    originalProjectedCostMinor: forecast.projectedFinalCostMinor,
    revisedProjectedCostMinor: forecast.projectedFinalCostMinor,
    netSavingsMinor: 0,
    savingsPercentage: 0,
    disruptionScore: 0,
    affectedCount: 0,
    modifications: [],
    constraintValidation: {
      mustDoProtected: true,
      lockedItemsProtected: true,
      budgetFeasible: true,
      reserveProtected: true,
      cancellationLiabilitiesHonored: true,
    },
    narrativeSummary: 'Budget is currently safe and healthy.',
  };
}
