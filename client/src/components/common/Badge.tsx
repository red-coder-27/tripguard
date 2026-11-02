import React from 'react';
import { Shield, Sparkles, RefreshCw, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { ActivityPriority, BudgetRiskStatus } from '../../types/index.js';

interface PriorityBadgeProps {
  priority: ActivityPriority;
  isLocked?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, isLocked }) => {
  if (priority === 'MUST_DO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-200">
        <Shield className="w-3 h-3 text-purple-700" />
        MUST DO {isLocked && '• LOCKED'}
      </span>
    );
  }

  if (priority === 'FLEXIBLE') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200">
        <RefreshCw className="w-3 h-3 text-blue-700" />
        FLEXIBLE
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
      <Sparkles className="w-3 h-3 text-slate-500" />
      OPTIONAL
    </span>
  );
};

export const RiskBadge: React.FC<{ status: BudgetRiskStatus }> = ({ status }) => {
  if (status === 'SAFE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        SAFE
      </span>
    );
  }

  if (status === 'WATCH') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        BUDGET WATCH
      </span>
    );
  }

  if (status === 'AT_RISK') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-900 border border-orange-200">
        <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
        AT RISK
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-900 border border-red-200 animate-pulse">
      <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
      OVER BUDGET
    </span>
  );
};
