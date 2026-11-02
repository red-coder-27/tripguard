import { ITrip } from '../models/Trip.js';
import { IItineraryItem } from '../models/ItineraryItem.js';
import { IBooking } from '../models/Booking.js';
import { IExpense } from '../models/Expense.js';
import { FinancialForecastBreakdown, BudgetRiskStatus } from '../types/index.js';
import { buildCanonicalLedger } from './accounting.js';

export function calculateFinancialForecast(
  trip: ITrip,
  itineraryItems: IItineraryItem[],
  bookings: IBooking[],
  expenses: IExpense[]
): FinancialForecastBreakdown {
  const ledger = buildCanonicalLedger(trip, itineraryItems, bookings, expenses);

  const totalBudgetMinor = trip.totalBudgetMinor;
  const emergencyReserveMinor =
    typeof trip.emergencyReserveMinor === 'number'
      ? trip.emergencyReserveMinor
      : Math.round(totalBudgetMinor * 0.10); // default 10% reserve

  const usableBudgetMinor = Math.max(0, totalBudgetMinor - emergencyReserveMinor);
  const projectedFinalCostMinor = ledger.projectedFinalCostMinor;
  const remainingUsableBudgetMinor = usableBudgetMinor - projectedFinalCostMinor;
  const overspendingGapMinor = Math.max(0, projectedFinalCostMinor - usableBudgetMinor);

  // Risk Classification
  let riskStatus: BudgetRiskStatus;
  let riskReason: string;

  const currencySymbol = trip.currency === 'INR' ? '₹' : '$';
  const formatVal = (minor: number) => `${currencySymbol}${(minor / 100).toLocaleString()}`;

  if (projectedFinalCostMinor > totalBudgetMinor) {
    const overAmt = projectedFinalCostMinor - totalBudgetMinor;
    riskStatus = 'OVER_BUDGET';
    riskReason = `Critical: Projected cost (${formatVal(projectedFinalCostMinor)}) exceeds total budget (${formatVal(totalBudgetMinor)}) by ${formatVal(overAmt)}. Recovery required.`;
  } else if (projectedFinalCostMinor > usableBudgetMinor) {
    const encroached = projectedFinalCostMinor - usableBudgetMinor;
    riskStatus = 'AT_RISK';
    riskReason = `Warning: Projected cost (${formatVal(projectedFinalCostMinor)}) exhausts usable budget and encroaches on protected reserve by ${formatVal(encroached)}.`;
  } else if (projectedFinalCostMinor > usableBudgetMinor * 0.85) {
    const pct = Math.round((projectedFinalCostMinor / usableBudgetMinor) * 100);
    riskStatus = 'WATCH';
    riskReason = `Attention: Projected expenditure is at ${pct}% of usable budget. Approaching financial limit.`;
  } else {
    riskStatus = 'SAFE';
    riskReason = `Healthy: Projected expenditure (${formatVal(projectedFinalCostMinor)}) is within safe financial bounds of usable budget.`;
  }

  return {
    totalBudgetMinor,
    emergencyReserveMinor,
    usableBudgetMinor,
    settledExpensesMinor: ledger.settledExpensesMinor,
    outstandingCommitmentsMinor: ledger.outstandingCommitmentsMinor,
    futureEstimatesMinor: ledger.futureEstimatesMinor,
    projectedFinalCostMinor,
    remainingUsableBudgetMinor,
    overspendingGapMinor,
    riskStatus,
    riskReason,
    currency: trip.currency,
    computedAt: new Date().toISOString(),
  };
}
