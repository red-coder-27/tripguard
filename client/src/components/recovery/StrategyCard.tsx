import React from 'react';
import { CheckCircle2, Shield, ArrowRight, Zap, Eye } from 'lucide-react';
import { RecoveryStrategyResult, Currency } from '../../types/index.js';
import { formatCurrency } from '../../utils/formatters.js';

interface StrategyCardProps {
  strategy: RecoveryStrategyResult;
  currency: Currency;
  onViewDetails: (strategy: RecoveryStrategyResult) => void;
  onApprove: (strategy: RecoveryStrategyResult) => void;
  isCurrentApproved?: boolean;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  currency,
  onViewDetails,
  onApprove,
  isCurrentApproved,
}) => {
  const getDisruptionColor = (score: number) => {
    if (score <= 30) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score <= 60) return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getCardHeaderColor = () => {
    if (strategy.strategyType === 'BALANCED_RECOVERY') {
      return 'border-t-4 border-t-emerald-600';
    }
    if (strategy.strategyType === 'MINIMUM_DISRUPTION') {
      return 'border-t-4 border-t-teal-500';
    }
    return 'border-t-4 border-t-blue-600';
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-[#E5EAF0] shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative ${getCardHeaderColor()}`}
    >
      {/* Recommended Pill */}
      {strategy.isRecommended && (
        <div className="absolute top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
          <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
          Recommended
        </div>
      )}

      {/* Card Content */}
      <div className="p-6">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {strategy.strategyType.replace('_', ' ')}
          </span>
          <h3 className="text-xl font-bold text-[#172033] mt-0.5">{strategy.title}</h3>
          <p className="mt-1 text-xs text-[#64748B] leading-relaxed line-clamp-2">
            {strategy.description}
          </p>
        </div>

        {/* Financial Highlights */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50/80 border border-[#E5EAF0] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Revised Projected Cost</span>
            <span className="font-bold tabular-nums text-base text-[#172033]">
              {formatCurrency(strategy.revisedProjectedCostMinor, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/70">
            <span className="text-emerald-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Net Savings
            </span>
            <span className="font-bold tabular-nums text-base text-emerald-600">
              +{formatCurrency(strategy.netSavingsMinor, currency)}
            </span>
          </div>
        </div>

        {/* Experience Preservation Score & Evidence Indicator */}
        <div className="mt-3.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-950 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Experience Preservation
            </span>
            <span className="font-black text-sm text-emerald-800">
              {strategy.experiencePreservationScore ?? 88} / 100
            </span>
          </div>

          <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{ width: `${strategy.experiencePreservationScore ?? 88}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-emerald-800 pt-1 font-medium">
            <span>Evidence: <strong className="font-bold text-emerald-900">{strategy.evidenceConfidence?.level || 'VERIFIED'} ({strategy.evidenceConfidence?.score || 95}%)</strong></span>
            <span>40% Must-Do + 25% Flex</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
          <div className={`p-2.5 rounded-lg border ${getDisruptionColor(strategy.disruptionScore)}`}>
            <span className="text-[10px] font-medium block uppercase tracking-wider">
              Disruption Index
            </span>
            <span className="text-sm font-bold tabular-nums">
              {strategy.disruptionScore} / 100
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
            <span className="text-[10px] font-medium block uppercase tracking-wider">
              Affected Items
            </span>
            <span className="text-sm font-bold tabular-nums">
              {strategy.affectedCount} adjustments
            </span>
          </div>
        </div>

        {/* Constraint badges */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {strategy.constraintValidation.mustDoProtected && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
              <Shield className="w-2.5 h-2.5" /> MUST_DO Protected
            </span>
          )}
          {strategy.constraintValidation.budgetFeasible && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-2.5 h-2.5" /> Budget Feasible
            </span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="p-4 bg-slate-50/50 border-t border-[#E5EAF0] flex items-center gap-2">
        <button
          onClick={() => onViewDetails(strategy)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          View Details
        </button>

        <button
          onClick={() => onApprove(strategy)}
          disabled={isCurrentApproved}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors shadow-xs ${
            isCurrentApproved
              ? 'bg-emerald-100 text-emerald-800 cursor-default'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isCurrentApproved ? (
            'Approved'
          ) : (
            <>
              Approve Plan <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

