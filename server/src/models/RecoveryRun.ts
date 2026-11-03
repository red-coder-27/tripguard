import mongoose, { Schema, Document } from 'mongoose';
import { RecoveryRunStatus, RecoveryStrategyResult, FinancialForecastBreakdown } from '../types/index.js';

export interface IRecoveryRun extends Document {
  tripId: mongoose.Types.ObjectId;
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
  createdAt: Date;
  approvedAt?: Date;
}

const ProposedModificationSchema = new Schema(
  {
    actionType: { type: String, required: true, enum: ['REPLACE', 'REMOVE', 'RETAIN'] },
    targetType: { type: String, required: true, enum: ['ACCOMMODATION', 'TRANSPORT', 'ACTIVITY'] },
    targetId: { type: String, required: true },
    targetName: { type: String, required: true },
    originalCostMinor: { type: Number, required: true },
    originalRemainingLiabilityMinor: { type: Number, required: true },
    replacementId: { type: String },
    replacementName: { type: String },
    replacementCostMinor: { type: Number },
    cancellationFeeMinor: { type: Number, default: 0 },
    expectedRefundMinor: { type: Number, default: 0 },
    netSavingsMinor: { type: Number, required: true },
    disruptionScore: { type: Number, required: true },
    travelImpactDescription: { type: String, required: true },
    justification: { type: String, required: true },
    constraintValidated: { type: Boolean, default: true },
  },
  { _id: false }
);

const RecoveryStrategyResultSchema = new Schema(
  {
    strategyType: {
      type: String,
      required: true,
      enum: ['MINIMUM_DISRUPTION', 'BALANCED_RECOVERY', 'MAXIMUM_SAVINGS'],
    },
    title: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    isRecommended: { type: Boolean, default: false },
    originalProjectedCostMinor: { type: Number, required: true },
    revisedProjectedCostMinor: { type: Number, required: true },
    netSavingsMinor: { type: Number, required: true },
    savingsPercentage: { type: Number, required: true },
    disruptionScore: { type: Number, required: true },
    affectedCount: { type: Number, required: true },
    modifications: { type: [ProposedModificationSchema], default: [] },
    constraintValidation: {
      mustDoProtected: { type: Boolean, default: true },
      lockedItemsProtected: { type: Boolean, default: true },
      budgetFeasible: { type: Boolean, default: true },
      reserveProtected: { type: Boolean, default: true },
      cancellationLiabilitiesHonored: { type: Boolean, default: true },
    },
    narrativeSummary: { type: String, default: '' },
  },
  { _id: false }
);

const RecoveryRunSchema = new Schema<IRecoveryRun>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    runId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      default: 'GENERATED',
      enum: ['GENERATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'STALE', 'SUPERSEDED'],
      index: true,
    },
    snapshotHash: { type: String, required: true },
    itineraryVersionBefore: { type: Number, required: true },
    itineraryVersionAfter: { type: Number },
    originalForecast: { type: Schema.Types.Mixed, required: true },
    strategies: { type: [RecoveryStrategyResultSchema], required: true },
    selectedStrategyType: { type: String },
    approvalNotes: { type: String, default: '' },
    isStale: { type: Boolean, default: false, index: true },
    supersededByRunId: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export const RecoveryRun = mongoose.model<IRecoveryRun>('RecoveryRun', RecoveryRunSchema);

