import React from 'react';
import {
  Compass,
  Wallet,
  Receipt,
  TrendingUp,
  AlertOctagon,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { useAuth } from '../context/AuthContext.js';
import { StatCard } from '../components/common/StatCard.js';
import { RiskBadge } from '../components/common/Badge.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

interface OverviewPageProps {
  onNavigate: (path: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { trips, activeTrip, forecast } = useTrip();

  const currency = forecast?.currency || 'INR';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
            Welcome back, {user?.name || 'Traveler'}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time travel budget forecasting and recovery intelligence •{' '}
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('/trips')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-[#E5EAF0] rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
          >
            Manage Trips
          </button>
          <button
            onClick={() => onNavigate('/recovery')}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" /> Open Recovery Center
          </button>
        </div>
      </div>

      {/* Financial Health Critical Alert if Over Budget */}
      {forecast && forecast.riskStatus === 'OVER_BUDGET' && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0 mt-0.5">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-red-950">
                  Financial Infeasibility Detected: {activeTrip?.name}
                </h3>
                <RiskBadge status={forecast.riskStatus} />
              </div>
              <p className="mt-1 text-xs text-red-800 leading-relaxed">
                {forecast.riskReason}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/recovery')}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5"
          >
            Review Recovery Plans <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Travel Portfolios"
          value={trips.length.toString()}
          subtitle={`${trips.filter((t) => t.status === 'ACTIVE').length} currently active`}
          icon={Compass}
        />
        <StatCard
          label="Total Assigned Budget"
          value={forecast ? formatCurrency(forecast.totalBudgetMinor, currency) : '₹0'}
          subtitle={`Usable: ${
            forecast ? formatCurrency(forecast.usableBudgetMinor, currency) : '₹0'
          }`}
          icon={Wallet}
        />
        <StatCard
          label="Settled Expenditures"
          value={forecast ? formatCurrency(forecast.settledExpensesMinor, currency) : '₹0'}
          subtitle="Cleared ledger payments"
          icon={Receipt}
        />
        <StatCard
          label="Projected Final Cost"
          value={forecast ? formatCurrency(forecast.projectedFinalCostMinor, currency) : '₹0'}
          subtitle={
            forecast && forecast.overspendingGapMinor > 0
              ? `Deficit: ${formatCurrency(forecast.overspendingGapMinor, currency)}`
              : 'Within budget'
          }
          icon={TrendingUp}
          variant={forecast && forecast.overspendingGapMinor > 0 ? 'critical' : 'emerald'}
        />
      </div>

      {/* Budget Breakdown & Health Card */}
      {forecast && (
        <div className="p-6 bg-white rounded-2xl border border-[#E5EAF0] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E5EAF0] gap-2">
            <div>
              <h2 className="text-base font-bold text-[#172033]">
                Canonical Financial Ledger Allocation
              </h2>
              <p className="text-xs text-[#64748B]">
                Obligations grouped into non-overlapping pools to eliminate double-counting.
              </p>
            </div>
            <div className="text-xs font-medium text-slate-500">
              Trip Version: <span className="font-bold text-[#172033]">v{activeTrip?.currentVersion}</span>
            </div>
          </div>

          {/* Allocation Progress Bar */}
          <div className="mt-5">
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {/* Settled */}
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (forecast.settledExpensesMinor / forecast.totalBudgetMinor) * 100
                  )}%`,
                }}
                className="bg-emerald-600 h-full"
                title={`Settled: ${formatCurrency(forecast.settledExpensesMinor, currency)}`}
              />
              {/* Commitments */}
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (forecast.outstandingCommitmentsMinor / forecast.totalBudgetMinor) * 100
                  )}%`,
                }}
                className="bg-blue-500 h-full"
                title={`Commitments: ${formatCurrency(forecast.outstandingCommitmentsMinor, currency)}`}
              />
              {/* Estimates */}
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (forecast.futureEstimatesMinor / forecast.totalBudgetMinor) * 100
                  )}%`,
                }}
                className="bg-amber-400 h-full"
                title={`Estimates: ${formatCurrency(forecast.futureEstimatesMinor, currency)}`}
              />
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                <div>
                  <span className="text-[#64748B] block text-[11px]">Settled Expenses</span>
                  <span className="font-bold tabular-nums text-[#172033]">
                    {formatCurrency(forecast.settledExpensesMinor, currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <span className="text-[#64748B] block text-[11px]">Outstanding Bookings</span>
                  <span className="font-bold tabular-nums text-[#172033]">
                    {formatCurrency(forecast.outstandingCommitmentsMinor, currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <span className="text-[#64748B] block text-[11px]">Future Estimates</span>
                  <span className="font-bold tabular-nums text-[#172033]">
                    {formatCurrency(forecast.futureEstimatesMinor, currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
                <div>
                  <span className="text-[#64748B] block text-[11px]">Protected Reserve</span>
                  <span className="font-bold tabular-nums text-[#172033]">
                    {formatCurrency(forecast.emergencyReserveMinor, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Trip Spotlight Card */}
      {activeTrip && (
        <div className="p-6 bg-white rounded-2xl border border-[#E5EAF0] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-[#172033]">{activeTrip.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {activeTrip.destination}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#64748B] flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(activeTrip.startDate)} – {formatDate(activeTrip.endDate)} •{' '}
                  {activeTrip.travelersCount} Traveler
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('/itinerary')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-[#E5EAF0] rounded-xl transition-colors"
              >
                View Itinerary
              </button>
              <button
                onClick={() => onNavigate('/recovery')}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                Recovery Engine <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

