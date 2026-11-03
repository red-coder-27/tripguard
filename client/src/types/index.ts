export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export type ActivityPriority = 'MUST_DO' | 'FLEXIBLE' | 'OPTIONAL';

export type ActivityCategory = 
  | 'ACCOMMODATION'
  | 'TRANSPORT'
  | 'ACTIVITY'
  | 'FOOD_DINING'
  | 'SHOPPING'
  | 'MISC';

export type ExpenseCategory = ActivityCategory;

export type BookingCategory = 
  | 'ACCOMMODATION'
  | 'TRANSPORT'
  | 'ACTIVITY'
  | 'RESTAURANT'
  | 'OTHER';

export type BookingStatus = 
  | 'CONFIRMED'
  | 'PENDING'
  | 'CANCELLED'
  | 'MODIFIED'
  | 'MODIFICATION_PENDING_USER_ACTION';

export type BudgetRiskStatus = 'SAFE' | 'WATCH' | 'AT_RISK' | 'OVER_BUDGET';

export type RecoveryStrategyType = 
  | 'MINIMUM_DISRUPTION'
  | 'BALANCED_RECOVERY'
  | 'MAXIMUM_SAVINGS';

export type RecoveryRunStatus = 
  | 'GENERATED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'STALE'
  | 'SUPERSEDED';

export interface User {
  id: string;
  name: string;
  email: string;
  baseCurrency: Currency;
  emergencyReservePercentage: number;
}

export interface FinancialForecastBreakdown {
  totalBudgetMinor: number;
  emergencyReserveMinor: number;
  usableBudgetMinor: number;
  settledExpensesMinor: number;
  outstandingCommitmentsMinor: number;
  futureEstimatesMinor: number;
  projectedFinalCostMinor: number;
  remainingUsableBudgetMinor: number;
  overspendingGapMinor: number;
  riskStatus: BudgetRiskStatus;
  riskReason: string;
  currency: Currency;
  computedAt: string;
}

export interface Trip {
  _id: string;
  userId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelersCount: number;
  totalBudgetMinor: number;
  emergencyReserveMinor: number;
  currency: Currency;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  currentVersion: number;
  preferences?: {
    primaryInterests: string[];
    travelPace: 'RELAXED' | 'BALANCED' | 'PACKED';
    accommodationPreference: 'BUDGET' | 'BOUTIQUE' | 'LUXURY';
  };
  forecast?: FinancialForecastBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryItem {
  _id: string;
  tripId: string;
  dayNumber: number;
  date: string;
  title: string;
  description: string;
  category: ActivityCategory;
  startTime: string;
  endTime: string;
  location: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  estimatedCostMinor: number;
  priority: ActivityPriority;
  isLocked: boolean;
  bookingId?: string;
  version: number;
  isRemoved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  _id: string;
  tripId: string;
  itineraryItemId?: string;
  category: BookingCategory;
  provider: string;
  bookingReference: string;
  totalCostMinor: number;
  paidAmountMinor: number;
  outstandingAmountMinor: number;
  currency: Currency;
  travelDate: string;
  status: BookingStatus;
  cancellationPolicy: {
    isRefundable: boolean;
    freeCancellationDeadline?: string;
    cancellationFeeMinor: number;
    refundableAmountMinor: number;
    policyNotes: string;
  };
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  _id: string;
  tripId: string;
  itineraryItemId?: string;
  bookingId?: string;
  description: string;
  category: ExpenseCategory;
  amountMinor: number;
  currency: Currency;
  date: string;
  paymentMethod: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'UPI' | 'BANK_TRANSFER';
  paymentStatus: 'SETTLED' | 'PENDING' | 'REFUNDED';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposedModification {
  actionType: 'REPLACE' | 'REMOVE' | 'RETAIN';
  targetType: 'ACCOMMODATION' | 'TRANSPORT' | 'ACTIVITY';
  targetId: string;
  targetName: string;
  originalCostMinor: number;
  originalRemainingLiabilityMinor: number;
  replacementId?: string;
  replacementName?: string;
  replacementCostMinor?: number;
  cancellationFeeMinor: number;
  expectedRefundMinor: number;
  netSavingsMinor: number;
  disruptionScore: number;
  travelImpactDescription: string;
  justification: string;
  constraintValidated: boolean;
}

export interface RecoveryStrategyResult {
  strategyType: RecoveryStrategyType;
  title: string;
  tagline: string;
  description: string;
  isRecommended: boolean;
  originalProjectedCostMinor: number;
  revisedProjectedCostMinor: number;
  netSavingsMinor: number;
  savingsPercentage: number;
  disruptionScore: number;
  experiencePreservationScore: number;
  preservationBreakdown?: {
    mustDoScore: number;
    flexScore: number;
    transitEfficiencyScore: number;
    preferenceScore: number;
  };
  evidenceConfidence?: {
    level: 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'ESTIMATED';
    score: number;
    verifiedCount: number;
    totalCount: number;
  };
  affectedCount: number;
  modifications: ProposedModification[];
  constraintValidation: {
    mustDoProtected: boolean;
    lockedItemsProtected: boolean;
    budgetFeasible: boolean;
    reserveProtected: boolean;
    cancellationLiabilitiesHonored: boolean;
  };
  narrativeSummary: string;
}

export interface RecoveryRun {
  _id: string;
  tripId: string;
  runId: string;
  status: RecoveryRunStatus;
  snapshotHash: string;
  itineraryVersionBefore: number;
  itineraryVersionAfter?: number;
  originalForecast: FinancialForecastBreakdown;
  strategies: RecoveryStrategyResult[];
  selectedStrategyType?: string;
  approvalNotes?: string;
  isStale: boolean;
  supersededByRunId?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface AuditEvent {
  _id: string;
  tripId: string;
  userId: string;
  eventType: string;
  metadata: Record<string, any>;
  timestamp: string;
}

