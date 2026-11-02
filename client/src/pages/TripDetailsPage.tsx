import React, { useState } from 'react';
import {
  Compass,
  Calendar,
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  Zap,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { StatCard } from '../components/common/StatCard.js';
import { RiskBadge } from '../components/common/Badge.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

interface TripDetailsPageProps {
  onNavigate: (path: string) => void;
}

export const TripDetailsPage: React.FC<TripDetailsPageProps> = ({ onNavigate }) => {
  const { activeTrip, forecast } = useTrip();

  if (!activeTrip) {
    return <div className="p-8 text-center text-slate-500">Please select a trip first.</div>;
  }

  const curr = activeTrip.currency;

  return (
    <div className="space-y-6">
      {/* Trip Workspace Header */}
      <div className="p-6 bg-white rounded-2xl border border-[#E5EAF0] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-[#172033]">{activeTrip.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {activeTrip.destination}
                </span>
                {forecast && <RiskBadge status={forecast.riskStatus} />}
              </div>
              <p className="mt-1 text-xs text-[#64748B] flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(activeTrip.startDate)} – {formatDate(activeTrip.endDate)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {activeTrip.travelersCount} Traveler
                </span>
                <span>•</span>
                <span>Version: <strong>v{activeTrip.currentVersion}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('/itinerary')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-[#E5EAF0] rounded-xl transition-colors"
            >
              Open Itinerary
            </button>
            <button
              onClick={() => onNavigate('/recovery')}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" /> Recovery Center
            </button>
          </div>
        </div>
      </div>

      {/* Financial Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Budget"
          value={formatCurrency(activeTrip.totalBudgetMinor, curr)}
          subtitle={`Usable: ${
            forecast ? formatCurrency(forecast.usableBudgetMinor, curr) : '—'
          }`}
          icon={Wallet}
        />
        <StatCard
          label="Settled Expenses"
          value={
            forecast ? formatCurrency(forecast.settledExpensesMinor, curr) : '—'
          }
          subtitle="Bank cleared"
          icon={Receipt}
        />
        <StatCard
          label="Projected Final Cost"
          value={
            forecast ? formatCurrency(forecast.projectedFinalCostMinor, curr) : '—'
          }
          subtitle={
            forecast && forecast.overspendingGapMinor > 0
              ? `Deficit: ${formatCurrency(forecast.overspendingGapMinor, curr)}`
              : 'Within budget'
          }
          icon={TrendingUp}
          variant={forecast && forecast.overspendingGapMinor > 0 ? 'critical' : 'emerald'}
        />
        <StatCard
          label="Protected Reserve"
          value={
            forecast ? formatCurrency(forecast.emergencyReserveMinor, curr) : '—'
          }
          subtitle="Safety buffer"
          icon={Shield}
        />
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigate('/itinerary')}
          className="p-5 rounded-2xl bg-white border border-[#E5EAF0] shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Day Schedule</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-base font-bold text-[#172033] mt-2">Itinerary Planner</h3>
          <p className="mt-1 text-xs text-[#64748B]">
            Assign MUST_DO priorities and locks to protect key sights.
          </p>
        </div>

        <div
          onClick={() => onNavigate('/expenses')}
          className="p-5 rounded-2xl bg-white border border-[#E5EAF0] shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Ledger</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-base font-bold text-[#172033] mt-2">Expense Management</h3>
          <p className="mt-1 text-xs text-[#64748B]">
            Record cleared expenses linked to bookings and items.
          </p>
        </div>

        <div
          onClick={() => onNavigate('/recovery')}
          className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-700 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Engine
            </span>
            <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-base font-bold text-[#172033] mt-2">Recovery Center</h3>
          <p className="mt-1 text-xs text-[#64748B]">
            Generate and compare 3 deterministic recovery plans.
          </p>
        </div>
      </div>
    </div>
  );
};
