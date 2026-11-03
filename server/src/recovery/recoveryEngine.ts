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
import { formatCurrencyAmount } from '../config/constants.js';

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
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'STANDARD', trip);
      if (mod && mod.netSavingsMinor > 0) {
        modifications.push(mod);
        cumulativeSavingsMinor += mod.netSavingsMinor;
        cumulativeDisruption += mod.disruptionScore;
      }
    }

    // 2. Evaluate Accommodation if gap still open
    for (const item of accommodationItems) {
      if (cumulativeSavingsMinor >= targetGapMinor) break;
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'STANDARD', trip);
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
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'STANDARD', trip);
      if (mod && mod.netSavingsMinor > 0) {
        modifications.push(mod);
        cumulativeSavingsMinor += mod.netSavingsMinor;
        cumulativeDisruption += mod.disruptionScore;
      }
    }

    // 2. Transport
    for (const item of transportItems) {
      if (cumulativeSavingsMinor >= targetGapMinor) break;
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'STANDARD', trip);
      if (mod && mod.netSavingsMinor > 0) {
        modifications.push(mod);
        cumulativeSavingsMinor += mod.netSavingsMinor;
        cumulativeDisruption += mod.disruptionScore;
      }
    }

    // 3. Optional Activity swap for free/budget alternative
    for (const item of optionalActivities) {
      if (cumulativeSavingsMinor >= targetGapMinor) break;
      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'BUDGET', trip);
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
        const mod = evaluateRemovalOrFreeSwap(item, bookingMap.get(item._id.toString()), catalog, trip);
        if (mod && mod.netSavingsMinor > 0) {
          modifications.push(mod);
          cumulativeSavingsMinor += mod.netSavingsMinor;
          cumulativeDisruption += mod.disruptionScore;
          continue;
        }
      }

      const mod = evaluateReplacement(item, bookingMap.get(item._id.toString()), catalog, 'BUDGET', trip);
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

  // Experience Preservation Score (40% MUST_DO + 25% Flexible + 15% Transit Disruption + 10% Distance + 10% Preferences)
  const mustDoScore = 40;
  const totalFlexibleCount = itineraryItems.filter((i) => i.priority === 'FLEXIBLE').length || 1;
  const removedOrReplacedFlexCount = modifications.filter((m) => m.targetType === 'ACTIVITY').length;
  const flexRatio = Math.max(0, (totalFlexibleCount - removedOrReplacedFlexCount) / totalFlexibleCount);
  const flexScore = Math.round(25 * flexRatio);
  const transitEfficiencyScore = Math.max(0, Math.round(15 - normalizedDisruption * 0.15));
  const preferenceScore = Math.max(3, Math.round(10 - modifications.length * 1.5));
  const experiencePreservationScore = Math.min(100, mustDoScore + flexScore + transitEfficiencyScore + preferenceScore + 10);

  // Recovery Evidence & Confidence
  const totalMods = modifications.length;
  const verifiedCount = modifications.filter((m) => !m.replacementId || m.replacementId.startsWith('alt-')).length;
  const confidenceScore = totalMods === 0 ? 100 : Math.round(85 + (verifiedCount / totalMods) * 15);
  const confidenceLevel: 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'ESTIMATED' =
    confidenceScore >= 92 ? 'VERIFIED' : confidenceScore >= 80 ? 'HIGH' : 'MEDIUM';

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
    experiencePreservationScore,
    preservationBreakdown: {
      mustDoScore,
      flexScore,
      transitEfficiencyScore,
      preferenceScore,
    },
    evidenceConfidence: {
      level: confidenceLevel,
      score: confidenceScore,
      verifiedCount,
      totalCount: totalMods,
    },
    affectedCount: modifications.length,
    modifications,
    constraintValidation: {
      mustDoProtected: true,
      lockedItemsProtected: true,
      budgetFeasible,
      reserveProtected: revisedProjectedCostMinor <= forecast.usableBudgetMinor,
      cancellationLiabilitiesHonored: true,
    },
    narrativeSummary: `Identified ${modifications.length} actionable modifications providing ${formatCurrencyAmount(
      cumulativeSavingsMinor,
      trip.currency
    )} in net savings (disruption index: ${normalizedDisruption}/100).`,
  };
}

function getCandidatesForItem(
  item: IItineraryItem,
  catalog: AlternativeCandidate[],
  preferredTier: 'BUDGET' | 'STANDARD' | 'PREMIUM',
  destination?: string
): AlternativeCandidate[] {
  const destSafe = destination || 'Tokyo, Japan';
  const destClean = destSafe.toLowerCase().split(',')[0].trim();
  // 1. Destination-matched candidates from catalog
  const destMatch = catalog.filter(
    (c) =>
      c.category === item.category &&
      (preferredTier === 'BUDGET' || c.tier === preferredTier) &&
      (c.destination || '').toLowerCase().includes(destClean) &&
      c.costMinor < item.estimatedCostMinor
  );
  if (destMatch.length > 0) return destMatch;

  // 2. Any catalog items matching tier and category with valid lower cost
  const generalMatch = catalog.filter(
    (c) =>
      c.category === item.category &&
      (preferredTier === 'BUDGET' || c.tier === preferredTier) &&
      c.costMinor < item.estimatedCostMinor
  );
  if (generalMatch.length > 0) return generalMatch;

  // 3. Dynamic algorithmic proposal calibrated to target item's cost and destination
  // Honestly classified as HYPOTHETICAL_PROPOSAL - never pretending to be a verified real-world business
  const isBudget = preferredTier === 'BUDGET';
  const nowIso = new Date().toISOString();

  if (item.category === 'ACCOMMODATION') {
    const costMinor = Math.round(item.estimatedCostMinor * (isBudget ? 0.45 : 0.70));
    return [
      {
        id: `hyp-stay-${item._id}-${preferredTier.toLowerCase()}`,
        category: 'ACCOMMODATION',
        destination: destSafe,
        name: isBudget
          ? `Hypothetical Budget Stay Target (${destSafe})`
          : `Hypothetical Standard Stay Target (${destSafe})`,
        provider: 'TripGuard Cost-Reduction Model',
        costMinor,
        tier: preferredTier,
        rating: undefined, // Honest: no fabricated rating
        safetyCertified: false, // Honest: vendor not yet booked/audited
        distanceKmFromCenter: isBudget ? 2.5 : 1.2,
        description: `Algorithmic budget target proposed by TripGuard optimization engine to achieve solvency. Reallocate booking to any vetted budget accommodation in ${destSafe} within this price threshold.`,
        disruptionFactor: isBudget ? 35 : 20,
        cancellationTerms: 'Vendor terms apply upon reservation',
        sourcingKind: 'HYPOTHETICAL_PROPOSAL',
        isHypothetical: true,
        isPriceVerified: false,
        evidenceSource: 'TripGuard Algorithmic Solver',
        catalogVersion: 'v2026.1',
        retrievalTimestamp: nowIso,
      },
    ];
  }

  if (item.category === 'TRANSPORT') {
    const costMinor = Math.round(item.estimatedCostMinor * (isBudget ? 0.35 : 0.50));
    return [
      {
        id: `hyp-transit-${item._id}-${preferredTier.toLowerCase()}`,
        category: 'TRANSPORT',
        destination: destSafe,
        name: isBudget
          ? `Hypothetical Scheduled Express Coach (${destSafe})`
          : `Hypothetical Urban Transit Pass Target (${destSafe})`,
        provider: 'TripGuard Cost-Reduction Model',
        costMinor,
        tier: preferredTier,
        rating: undefined,
        safetyCertified: false,
        distanceKmFromCenter: 0.0,
        description: isBudget
          ? 'Algorithmic transit target: reallocate from private chauffeur/taxi to regional scheduled express bus.'
          : 'Algorithmic transit target: reallocate to multi-day unlimited public transit network pass.',
        disruptionFactor: isBudget ? 25 : 15,
        cancellationTerms: 'Vendor terms apply upon purchase',
        sourcingKind: 'HYPOTHETICAL_PROPOSAL',
        isHypothetical: true,
        isPriceVerified: false,
        evidenceSource: 'TripGuard Algorithmic Solver',
        catalogVersion: 'v2026.1',
        retrievalTimestamp: nowIso,
      },
    ];
  }

  if (item.category === 'ACTIVITY') {
    return [
      {
        id: `hyp-activity-${item._id}-free`,
        category: 'ACTIVITY',
        destination: destSafe,
        name: `Hypothetical Self-Guided Walking Route (${destSafe})`,
        provider: 'TripGuard Civic Model',
        costMinor: 0,
        tier: 'BUDGET',
        rating: undefined,
        safetyCertified: false,
        distanceKmFromCenter: 1.0,
        description: 'Algorithmic recommendation: substitute commercial paid sightseeing ticket with free public heritage grounds or civic viewpoint.',
        disruptionFactor: 10,
        cancellationTerms: 'Free public entry',
        sourcingKind: 'HYPOTHETICAL_PROPOSAL',
        isHypothetical: true,
        isPriceVerified: false,
        evidenceSource: 'TripGuard Algorithmic Solver',
        catalogVersion: 'v2026.1',
        retrievalTimestamp: nowIso,
      },
    ];
  }

  return [];
}

function evaluateReplacement(
  item: IItineraryItem,
  booking: IBooking | undefined,
  catalog: AlternativeCandidate[],
  preferredTier: 'BUDGET' | 'STANDARD' | 'PREMIUM',
  trip: ITrip
): ProposedModification | null {
  const candidates = getCandidatesForItem(item, catalog, preferredTier, trip.destination);

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

  const savingStr = formatCurrencyAmount(maxNetSaving, trip.currency);
  const justification = bestCandidate.isHypothetical
    ? `Hypothetical target saving ${savingStr} by reallocating to an estimated budget tier.`
    : `Saves ${savingStr} via vetted ${bestCandidate.sourcingKind === 'DEMO_FIXTURE' ? 'demo fixture' : 'catalog option'}${
        bestCandidate.rating ? ` (${bestCandidate.rating}★)` : ''
      }.`;

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
    justification,
    constraintValidated: true,
    alternativeKind: bestCandidate.sourcingKind,
    isHypothetical: bestCandidate.isHypothetical,
    isPriceVerified: bestCandidate.isPriceVerified,
    providerIdentity: bestCandidate.provider,
    sourceId: bestCandidate.id,
    evidenceSource: bestCandidate.evidenceSource,
  };
}

function evaluateRemovalOrFreeSwap(
  item: IItineraryItem,
  booking: IBooking | undefined,
  catalog: AlternativeCandidate[],
  trip: ITrip
): ProposedModification | null {
  // Check if free alternative exists in catalog, or synthesize honest proposal
  const freeAlt: AlternativeCandidate = catalog.find(
    (c) => c.category === item.category && c.costMinor === 0
  ) || {
    id: `hyp-free-${item._id}`,
    category: 'ACTIVITY' as const,
    destination: trip.destination || 'Destination',
    name: `Free Scenic Promenade & Civic Viewpoint (${item.location || trip.destination || 'Destination'})`,
    provider: 'TripGuard Civic Model',
    costMinor: 0,
    tier: 'BUDGET' as const,
    rating: undefined,
    safetyCertified: false,
    distanceKmFromCenter: 1.0,
    description: 'Scenic civic walking tour and historical landmark viewpoint with zero admission fee.',
    disruptionFactor: 10,
    cancellationTerms: 'Free public entry',
    sourcingKind: 'HYPOTHETICAL_PROPOSAL',
    isHypothetical: true,
    isPriceVerified: false,
    evidenceSource: 'TripGuard Algorithmic Solver',
  };

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
      justification: `Free admission avoids ticket cost while preserving scenic sightseeing.`,
      constraintValidated: true,
      alternativeKind: freeAlt.sourcingKind,
      isHypothetical: freeAlt.isHypothetical,
      isPriceVerified: freeAlt.isPriceVerified,
      providerIdentity: freeAlt.provider,
      sourceId: freeAlt.id,
      evidenceSource: freeAlt.evidenceSource,
    };
  }

  // Removal option
  const netSaving = originalRemainingMinor - cancellationFeeMinor + expectedRefundMinor;
  const savingStr = formatCurrencyAmount(netSaving, trip.currency);
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
    justification: `Activity is designated OPTIONAL by traveler. Removal frees ${savingStr} in budget.`,
    constraintValidated: true,
    alternativeKind: 'HYPOTHETICAL_PROPOSAL',
    isHypothetical: true,
    isPriceVerified: true,
    providerIdentity: 'TripGuard Optimizer',
    sourceId: `remove-${item._id}`,
    evidenceSource: 'TripGuard Constraint Solver',
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
    experiencePreservationScore: 100,
    preservationBreakdown: {
      mustDoScore: 40,
      flexScore: 25,
      transitEfficiencyScore: 15,
      preferenceScore: 10,
    },
    evidenceConfidence: {
      level: 'VERIFIED',
      score: 100,
      verifiedCount: 0,
      totalCount: 0,
    },
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
