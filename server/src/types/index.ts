// Core Domain Types for TripGuard

export type Currency = string;

export type AlternativeSourcingKind = 
  | 'REAL_PROVIDER'
  | 'VERIFIED_CATALOG'
  | 'HYPOTHETICAL_PROPOSAL'
  | 'DEMO_FIXTURE';

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
  alternativeKind?: AlternativeSourcingKind;
  isHypothetical?: boolean;
  isPriceVerified?: boolean;
  providerIdentity?: string;
  sourceId?: string;
  evidenceSource?: string;
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
  disruptionScore: number; // 0 - 100
  experiencePreservationScore: number; // 0 - 100
  preservationBreakdown?: {
    mustDoScore: number;
    flexScore: number;
    transitEfficiencyScore: number;
    preferenceScore: number;
  };
  evidenceConfidence: {
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

export interface RecoveryOptimizationOutput {
  tripId: string;
  snapshotHash: string;
  originalForecast: FinancialForecastBreakdown;
  strategies: RecoveryStrategyResult[];
  isInfeasible: boolean;
  infeasibilityReason?: string;
  generatedAt: string;
}

