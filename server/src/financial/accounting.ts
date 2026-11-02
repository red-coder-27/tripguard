// Canonical Financial Accounting Engine for TripGuard
// Enforces integer minor units (paise/cents) and strict single-obligation canonical identity

import { IBooking } from '../models/Booking.js';
import { IExpense } from '../models/Expense.js';
import { IItineraryItem } from '../models/ItineraryItem.js';
import { ITrip } from '../models/Trip.js';
import { FinancialForecastBreakdown, BudgetRiskStatus } from '../types/index.js';
import { RISK_THRESHOLDS } from '../config/constants.js';

export interface CanonicalObligation {
  id: string;
  sourceType: 'BOOKING' | 'EXPENSE' | 'ITINERARY_ESTIMATE';
  sourceId: string;
  category: string;
  title: string;
  settledAmountMinor: number;
  outstandingAmountMinor: number;
  futureEstimateMinor: number;
  totalProjectedMinor: number;
}

export interface CanonicalLedgerState {
  tripId: string;
  currency: string;
  obligations: CanonicalObligation[];
  settledExpensesMinor: number;
  outstandingCommitmentsMinor: number;
  futureEstimatesMinor: number;
  projectedFinalCostMinor: number;
}

/**
 * Computes canonical obligations without double counting across bookings, expenses, and itinerary items.
 *
 * Rules:
 * 1. Confirmed bookings represent legal obligations:
 *    - `paidAmountMinor` is settled.
 *    - `outstandingAmountMinor = max(0, totalCostMinor - paidAmountMinor)`.
 *    - Itinerary items linked to this booking inherit their cost from the booking (not counted separately).
 * 2. Standalone expenses (not linked to any booking) are settled expenditures:
 *    - `amountMinor` is settled.
 *    - Itinerary items linked to this standalone expense inherit their settled state.
 * 3. Unbooked, unsettled itinerary items represent future estimates:
 *    - `estimatedCostMinor` is counted as a future estimate only if the item has NO linked booking
 *      and NO settled expense associated with it.
 */
export function buildCanonicalLedger(
  trip: ITrip,
  itineraryItems: IItineraryItem[],
  bookings: IBooking[],
  expenses: IExpense[]
): CanonicalLedgerState {
  const obligations: CanonicalObligation[] = [];

  // Track which itinerary items and bookings have been accounted for
  const bookedItineraryItemIds = new Set<string>();
  const expensedBookingIds = new Set<string>();
  const expensedItineraryItemIds = new Set<string>();

  // 1. Process Bookings
  for (const b of bookings) {
    if (b.status === 'CANCELLED') continue;

    if (b.itineraryItemId) {
      bookedItineraryItemIds.add(b.itineraryItemId.toString());
    }

    // Find settled expenses directly linked to this booking
    const linkedExpenses = expenses.filter(
      (e) => e.bookingId && e.bookingId.toString() === b._id.toString() && e.paymentStatus === 'SETTLED'
    );

    const expenseSettledSum = linkedExpenses.reduce((sum, e) => sum + e.amountMinor, 0);
    // Paid amount is the maximum of recorded booking paidAmount and linked settled expenses
    const effectivePaid = Math.max(b.paidAmountMinor || 0, expenseSettledSum);
    const effectiveOutstanding = Math.max(0, b.totalCostMinor - effectivePaid);

    obligations.push({
      id: `booking-${b._id}`,
      sourceType: 'BOOKING',
      sourceId: b._id.toString(),
      category: b.category,
      title: `${b.category}: ${b.provider} (${b.bookingReference || 'Ref PENDING'})`,
      settledAmountMinor: effectivePaid,
      outstandingAmountMinor: effectiveOutstanding,
      futureEstimateMinor: 0,
      totalProjectedMinor: effectivePaid + effectiveOutstanding,
    });

    if (linkedExpenses.length > 0) {
      expensedBookingIds.add(b._id.toString());
    }
  }

  // 2. Process Standalone Expenses (not linked to a booking)
  for (const exp of expenses) {
    if (exp.paymentStatus !== 'SETTLED') continue;

    // Skip if already counted as part of a booking
    if (exp.bookingId && expensedBookingIds.has(exp.bookingId.toString())) {
      continue;
    }

    if (exp.itineraryItemId) {
      expensedItineraryItemIds.add(exp.itineraryItemId.toString());
    }

    obligations.push({
      id: `expense-${exp._id}`,
      sourceType: 'EXPENSE',
      sourceId: exp._id.toString(),
      category: exp.category,
      title: exp.description,
      settledAmountMinor: exp.amountMinor,
      outstandingAmountMinor: 0,
      futureEstimateMinor: 0,
      totalProjectedMinor: exp.amountMinor,
    });
  }

  // 3. Process Itinerary Items (only unbooked, unexpensed, and non-removed items)
  for (const item of itineraryItems) {
    if (item.isRemoved) continue;

    const itemIdStr = item._id.toString();

    // If item is already covered by a booking (via booking.itineraryItemId or item.bookingId)
    // or a standalone expense, do NOT double-count
    if (
      bookedItineraryItemIds.has(itemIdStr) ||
      expensedItineraryItemIds.has(itemIdStr) ||
      item.bookingId
    ) {
      continue;
    }

    // Unbooked item is a future estimate
    obligations.push({
      id: `itin-${item._id}`,
      sourceType: 'ITINERARY_ESTIMATE',
      sourceId: item._id.toString(),
      category: item.category,
      title: item.title,
      settledAmountMinor: 0,
      outstandingAmountMinor: 0,
      futureEstimateMinor: item.estimatedCostMinor,
      totalProjectedMinor: item.estimatedCostMinor,
    });
  }

  // Compute canonical totals
  let settledExpensesMinor = 0;
  let outstandingCommitmentsMinor = 0;
  let futureEstimatesMinor = 0;

  for (const ob of obligations) {
    settledExpensesMinor += ob.settledAmountMinor;
    outstandingCommitmentsMinor += ob.outstandingAmountMinor;
    futureEstimatesMinor += ob.futureEstimateMinor;
  }

  const projectedFinalCostMinor =
    settledExpensesMinor + outstandingCommitmentsMinor + futureEstimatesMinor;

  return {
    tripId: trip._id.toString(),
    currency: trip.currency,
    obligations,
    settledExpensesMinor,
    outstandingCommitmentsMinor,
    futureEstimatesMinor,
    projectedFinalCostMinor,
  };
}
