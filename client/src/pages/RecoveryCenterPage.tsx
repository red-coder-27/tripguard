import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  Shield,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';
import {
  RecoveryRun,
  RecoveryStrategyResult,
  ProposedModification,
} from '../types/index.js';
import { StrategyCard } from '../components/recovery/StrategyCard.js';
import { DetailsDrawer } from '../components/recovery/DetailsDrawer.js';
import { Modal } from '../components/common/Modal.js';
import { formatCurrency } from '../utils/formatters.js';

export const RecoveryCenterPage: React.FC = () => {
  const { activeTrip, forecast, refreshActiveTrip } = useTrip();
  const [strategies, setStrategies] = useState<RecoveryStrategyResult[]>([]);
  const [activeRun, setActiveRun] = useState<RecoveryRun | null>(null);
  const [isInfeasible, setIsInfeasible] = useState(false);
  const [infeasibilityReason, setInfeasibilityReason] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Drawer state
  const [selectedStrategyForDetails, setSelectedStrategyForDetails] =
    useState<RecoveryStrategyResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Approval Modal state
  const [strategyToApprove, setStrategyToApprove] = useState<RecoveryStrategyResult | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('Approved traveler recovery plan');
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approvalSuccessMessage, setApprovalSuccessMessage] = useState<string | null>(null);

  const loadLatestRecovery = useCallback(async () => {
    if (!activeTrip) return;
    setIsLoading(true);
    try {
      const res = await api.getRecoveryRuns(activeTrip._id);
      if (res.runs.length > 0) {
        const latest = res.runs[0];
        setActiveRun(latest);
        setStrategies(latest.strategies);
      } else {
        // Automatically generate initial recovery analysis
        await handleGenerateRecovery();
      }
    } catch (err) {
      console.error('Failed to load recovery runs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTrip]);

  useEffect(() => {
    loadLatestRecovery();
  }, [loadLatestRecovery]);

  const handleGenerateRecovery = async () => {
    if (!activeTrip) return;
    setIsLoading(true);
    setApprovalSuccessMessage(null);
    try {
      const res = await api.generateRecovery(activeTrip._id);
      setActiveRun(res.recoveryRun);
      setStrategies(res.strategies);
      setIsInfeasible(res.isInfeasible);
      setInfeasibilityReason(res.infeasibilityReason);
      await refreshActiveTrip();
    } catch (err: any) {
      alert(`Recovery generation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetails = (strategy: RecoveryStrategyResult) => {
    setSelectedStrategyForDetails(strategy);
    setIsDrawerOpen(true);
  };

  const handlePromptApprove = (strategy: RecoveryStrategyResult) => {
    setStrategyToApprove(strategy);
    setIsApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!activeTrip || !activeRun || !strategyToApprove) return;
    setIsSubmittingApproval(true);
    try {
      const res = await api.approveRecovery(
        activeTrip._id,
        activeRun.runId,
        strategyToApprove.strategyType,
        approvalNotes
      );

      setApprovalSuccessMessage(res.message);
      setIsApprovalModalOpen(false);
      await refreshActiveTrip();
      await loadLatestRecovery();
    } catch (err: any) {
      alert(`Failed to approve strategy: ${err.message}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  if (!activeTrip) {
    return (
      <div className="p-8 text-center text-slate-500">
        Please select a trip to access the Recovery Center.
      </div>
    );
  }

  const curr = forecast?.currency || 'INR';
  const overspend = forecast?.overspendingGapMinor || 0;

  return (
    <div className="space-y-6">
      {/* Recovery Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
              <Zap className="w-4 h-4 fill-emerald-600" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">
              Deterministic Intelligence Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] mt-1">
            Recovery Center: {activeTrip.name}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Evaluate, compare, and execute explainable budget restoration strategies.
          </p>
        </div>

        <button
          onClick={handleGenerateRecovery}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#101B2D] hover:bg-[#1E2D45] text-white text-xs font-bold transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Computing Alternatives...' : 'Regenerate Analysis'}
        </button>
      </div>

      {/* Success notification if approved */}
      {approvalSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="font-semibold">{approvalSuccessMessage}</div>
        </div>
      )}

      {/* Staleness Alert if proposal snapshot is out of date */}
      {activeRun && activeRun.isStale && activeRun.status !== 'APPROVED' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Proposal is Stale:</strong> Underlying itinerary items or expenses have changed since this analysis was generated.
            </span>
          </div>
          <button
            onClick={handleGenerateRecovery}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 whitespace-nowrap"
          >
            Refresh Now
          </button>
        </div>
      )}

      {/* Financial Health Diagnosis Card */}
      {forecast && (
        <div
          className={`p-6 rounded-2xl border ${
            overspend > 0
              ? 'bg-red-50/50 border-red-200'
              : 'bg-emerald-50/50 border-emerald-200'
          } shadow-xs`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Financial Diagnosis
              </span>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[#172033]">
                  {overspend > 0 ? (
                    <span className="text-red-700">Budget Deficit: {formatCurrency(overspend, curr)}</span>
                  ) : (
                    <span className="text-emerald-700">Itinerary is Financially Balanced</span>
                  )}
                </h2>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed max-w-2xl">
                {forecast.riskReason}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 text-center bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Total Budget
                </span>
                <span className="text-sm font-bold tabular-nums text-[#172033]">
                  {formatCurrency(forecast.totalBudgetMinor, curr)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Projected Cost
                </span>
                <span className="text-sm font-bold tabular-nums text-red-600">
                  {formatCurrency(forecast.projectedFinalCostMinor, curr)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Usable Budget
                </span>
                <span className="text-sm font-bold tabular-nums text-emerald-700">
                  {formatCurrency(forecast.usableBudgetMinor, curr)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Infeasibility Card if engine cannot satisfy constraints */}
      {isInfeasible && (
        <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <AlertOctagon className="w-8 h-8 text-amber-400 shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-white">Honest Infeasibility Report</h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {infeasibilityReason ||
                  'The optimization engine evaluated all candidate options, but cannot close the financial gap without violating traveler-mandated MUST_DO activities, breaking locked items, or forfeiting non-refundable deposits.'}
              </p>
              <div className="mt-4 p-3 rounded-lg bg-slate-800 text-xs text-amber-300">
                <strong>Recommendation:</strong> Unlock flexible items in the Itinerary Planner or consider adjusting your total budget limit.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strategies Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#172033]">
              Deterministic Recovery Strategies ({strategies.length})
            </h2>
            <p className="text-xs text-[#64748B]">
              Generated by pure algorithmic constraint evaluation. Never hallucinated by an LLM.
            </p>
          </div>
          {activeRun && (
            <span className="text-[10px] font-mono text-slate-400">
              Run: {activeRun.runId} • Snapshot: {activeRun.snapshotHash.substring(0, 10)}...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {strategies.map((strat) => (
            <StrategyCard
              key={strat.strategyType}
              strategy={strat}
              currency={curr}
              onViewDetails={handleOpenDetails}
              onApprove={handlePromptApprove}
              isCurrentApproved={
                activeRun?.status === 'APPROVED' &&
                activeRun.selectedStrategyType === strat.strategyType
              }
            />
          ))}
        </div>
      </div>

      {/* Details Slide-Over Drawer */}
      <DetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        strategy={selectedStrategyForDetails}
        currency={curr}
        onApprove={handlePromptApprove}
      />

      {/* Approval Confirmation Modal */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title={`Approve Recovery Plan: ${strategyToApprove?.title}`}
        subtitle="This will upgrade the itinerary to a new version and record an immutable decision."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="flex justify-between font-bold text-sm">
              <span>Verified Net Savings:</span>
              <span className="tabular-nums">
                +{strategyToApprove && formatCurrency(strategyToApprove.netSavingsMinor, curr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Revised Projected Expenditure:</span>
              <span className="tabular-nums font-semibold text-[#172033]">
                {strategyToApprove &&
                  formatCurrency(strategyToApprove.revisedProjectedCostMinor, curr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Disruption Score:</span>
              <span className="tabular-nums">{strategyToApprove?.disruptionScore} / 100</span>
            </div>
          </div>

          <div className="text-xs text-[#64748B] space-y-2">
            <p>
              TripGuard maintains an <strong>immutable audit trail</strong>. Approving this plan will:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2">
              <li>Upgrade itinerary to <strong>v{(activeTrip.currentVersion || 1) + 1}</strong>.</li>
              <li>Apply {strategyToApprove?.affectedCount} verified item modifications.</li>
              <li>Mark confirmed bookings as <em>MODIFICATION PENDING USER ACTION</em> with vendor instructions.</li>
              <li>Archive the previous itinerary snapshot in the Recovery Ledger.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Decision Approval Notes
            </label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Approved balanced budget recovery before final booking deadline."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
              rows={2}
            />
          </div>

          <div className="pt-4 border-t border-[#E5EAF0] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsApprovalModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingApproval}
              onClick={handleConfirmApproval}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {isSubmittingApproval ? 'Applying Upgrades...' : 'Confirm Approval & Version'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
