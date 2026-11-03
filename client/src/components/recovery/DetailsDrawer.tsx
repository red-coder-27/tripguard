import React from 'react';
import { X, CheckCircle2, ArrowRight, Shield, AlertTriangle } from 'lucide-react';
import { RecoveryStrategyResult, Currency } from '../../types/index.js';
import { formatCurrency } from '../../utils/formatters.js';

interface DetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: RecoveryStrategyResult | null;
  currency: Currency;
  onApprove: (strategy: RecoveryStrategyResult) => void;
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  isOpen,
  onClose,
  strategy,
  currency,
  onApprove,
}) => {
  if (!isOpen || !strategy) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#101B2D]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-[#E5EAF0]">
          {/* Header */}
          <div className="px-6 py-5 bg-[#101B2D] text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                Deterministic Recovery Strategy
              </span>
              <h2 className="text-xl font-bold">{strategy.title}</h2>
              <p className="mt-0.5 text-xs text-[#A7B4C8]">{strategy.tagline}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#A7B4C8] hover:text-white rounded-lg hover:bg-[#1E2D45] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Financial Summary Bar */}
          <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-200 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-[10px] font-semibold text-emerald-800 uppercase block">
                Net Savings
              </span>
              <span className="text-lg font-bold text-emerald-700 tabular-nums">
                +{formatCurrency(strategy.netSavingsMinor, currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-emerald-800 uppercase block">
                Revised Cost
              </span>
              <span className="text-lg font-bold text-[#172033] tabular-nums">
                {formatCurrency(strategy.revisedProjectedCostMinor, currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-emerald-800 uppercase block">
                Disruption Score
              </span>
              <span className="text-lg font-bold text-slate-800 tabular-nums">
                {strategy.disruptionScore} / 100
              </span>
            </div>
          </div>

          {/* Modifications Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Actionable Itinerary Modifications ({strategy.modifications.length})
              </h3>
              <p className="mt-0.5 text-xs text-[#64748B]">
                Every proposed alternative is verified for date, safety, and constraint validity.
              </p>
            </div>

            <div className="space-y-4">
              {strategy.modifications.map((mod, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl border border-[#E5EAF0] bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all"
                >
                  {/* Action Badge & Category */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        mod.actionType === 'REPLACE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {mod.actionType} • {mod.targetType}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 tabular-nums">
                      Net Saving: +{formatCurrency(mod.netSavingsMinor, currency)}
                    </span>
                  </div>

                  {/* Side by side comparison */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Original */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Original Commitment
                      </span>
                      <div className="text-xs font-semibold text-[#172033] mt-0.5">
                        {mod.targetName}
                      </div>
                      <div className="text-xs font-bold text-red-600 mt-1 tabular-nums line-through">
                        {formatCurrency(mod.originalCostMinor, currency)}
                      </div>
                    </div>

                    {/* Replacement */}
                    <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                        Proposed Replacement
                      </span>
                      <div className="text-xs font-semibold text-emerald-950 mt-0.5">
                        {mod.replacementName || 'Remove Optional Activity'}
                      </div>
                      <div className="text-xs font-bold text-emerald-700 mt-1 tabular-nums">
                        {mod.replacementCostMinor !== undefined
                          ? formatCurrency(mod.replacementCostMinor, currency)
                          : '₹0'}
                      </div>
                    </div>
                  </div>

                  {/* Financial Math Breakdown */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-[11px] text-[#64748B] space-y-1">
                    <div className="flex justify-between">
                      <span>Avoided Original Liability:</span>
                      <span className="font-semibold tabular-nums text-[#172033]">
                        {formatCurrency(mod.originalRemainingLiabilityMinor, currency)}
                      </span>
                    </div>
                    {mod.cancellationFeeMinor > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Cancellation Penalty:</span>
                        <span className="font-semibold tabular-nums">
                          -{formatCurrency(mod.cancellationFeeMinor, currency)}
                        </span>
                      </div>
                    )}
                    {mod.expectedRefundMinor > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Expected Refund:</span>
                        <span className="font-semibold tabular-nums">
                          +{formatCurrency(mod.expectedRefundMinor, currency)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Travel Impact & Justification */}
                  <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200/80 text-xs text-[#64748B] space-y-1">
                    <div>
                      <strong className="text-[#172033]">Travel Impact:</strong>{' '}
                      {mod.travelImpactDescription}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <strong className="text-slate-700">Financial Justification:</strong>{' '}
                      {mod.justification}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Constraint Guarantees */}
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <Shield className="w-4 h-4 text-purple-700" /> Hard Constraint Guarantees
              </div>
              <ul className="mt-2 text-xs text-purple-800 space-y-1 list-disc list-inside">
                <li>MUST_DO and locked experiences strictly protected.</li>
                <li>Emergency financial reserve preserved without depletion.</li>
                <li>Vendor cancellation policies and deposits accounted for.</li>
              </ul>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-5 border-t border-[#E5EAF0] bg-slate-50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
            <button
              onClick={() => {
                onApprove(strategy);
                onClose();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Approve & Create Version Upgrade <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

