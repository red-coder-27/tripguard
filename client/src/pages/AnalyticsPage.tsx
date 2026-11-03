import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Award, PieChart as PieIcon } from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';
import { StatCard } from '../components/common/StatCard.js';
import { formatCurrency } from '../utils/formatters.js';

const COLORS = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#DB2777', '#64748B'];

export const AnalyticsPage: React.FC = () => {
  const { activeTrip } = useTrip();
  const [data, setData] = useState<{
    forecast: any;
    categoryBreakdown: any[];
    dailyTrend: any[];
    recoverySavingsMinor: number;
    hasApprovedRecovery: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!activeTrip) return;
    setIsLoading(true);
    try {
      const res = await api.getAnalytics(activeTrip._id);
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTrip]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (!activeTrip) {
    return <div className="p-8 text-center text-slate-500">Please select a trip first.</div>;
  }

  const curr = activeTrip.currency;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Authoritative Financial Analytics
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#172033] mt-1">
          Travel Analytics: {activeTrip.name}
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Comprehensive breakdown of settled expenses, category distribution, and recovery efficacy.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Budget Utilization"
          value={
            data?.forecast
              ? `${Math.round(
                  (data.forecast.projectedFinalCostMinor / data.forecast.totalBudgetMinor) * 100
                )}%`
              : '0%'
          }
          subtitle={`Projected: ${
            data?.forecast ? formatCurrency(data.forecast.projectedFinalCostMinor, curr) : '—'
          }`}
          icon={TrendingUp}
        />

        <StatCard
          label="Settled Expenditures"
          value={
            data?.forecast ? formatCurrency(data.forecast.settledExpensesMinor, curr) : '—'
          }
          subtitle="Cleared from bank / card accounts"
          icon={DollarSign}
        />

        <StatCard
          label="Recovery Savings Realized"
          value={
            data && data.recoverySavingsMinor > 0
              ? `+${formatCurrency(data.recoverySavingsMinor, curr)}`
              : '₹0'
          }
          subtitle={
            data?.hasApprovedRecovery ? 'Approved recovery plan active' : 'No recovery plan executed'
          }
          icon={Award}
          variant={data && data.recoverySavingsMinor > 0 ? 'emerald' : 'default'}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="p-6 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Expenditures by Category
              </h3>
              <p className="text-xs text-[#64748B]">Planned vs Settled by travel category</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.categoryBreakdown || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => `₹${(val / 100).toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value: any) => [`₹${(Number(value) / 100).toLocaleString()}`, 'Amount']}
                />
                <Bar dataKey="settledMinor" name="Settled" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="plannedMinor" name="Estimated" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Proportion Pie Chart */}
        <div className="p-6 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Category Proportion
              </h3>
              <p className="text-xs text-[#64748B]">Share of total travel commitments</p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.categoryBreakdown.filter((c) => c.totalMinor > 0) || []}
                  dataKey="totalMinor"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {(data?.categoryBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`₹${(Number(value) / 100).toLocaleString()}`, 'Total']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {(data?.categoryBreakdown || []).map((cat, idx) => (
              <div key={cat.category} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-[#64748B] text-[11px]">{cat.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Spending Trend Area Chart */}
      <div className="p-6 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
              Settled Expenditure Velocity Over Time
            </h3>
            <p className="text-xs text-[#64748B]">Daily transaction burn rate in INR</p>
          </div>
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data?.dailyTrend || []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => `₹${(val / 100).toLocaleString()}`}
              />
              <Tooltip
                formatter={(val: any) => [`₹${(Number(val) / 100).toLocaleString()}`, 'Spent']}
              />
              <Area
                type="monotone"
                dataKey="amountMinor"
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

