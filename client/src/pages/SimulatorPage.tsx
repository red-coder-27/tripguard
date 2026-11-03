import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  RotateCcw,
  Sparkles,
  TrendingDown,
  Info,
  CheckCircle2,
  Trash2,
  Building,
  Plane,
  Camera,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';
import { ItineraryItem, FinancialForecastBreakdown } from '../types/index.js';
import { StatCard } from '../components/common/StatCard.js';
import { formatCurrency } from '../utils/formatters.js';

export const SimulatorPage: React.FC = () => {
  const { activeTrip, forecast } = useTrip();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [adjustments, setAdjustments] = useState<
    Array<{
      targetItemId: string;
      action: 'REPLACE' | 'REMOVE' | 'ADJUST_COST';
      simulatedCostMinor?: number;
      simulatedTitle?: string;
    }>
  >([]);

  // Macro-variable simulation state
  const [simulatedBudgetInput, setSimulatedBudgetInput] = useState<string>('');
  const [extraDisruptionInput, setExtraDisruptionInput] = useState<string>('0');

  const [simulatedForecast, setSimulatedForecast] =
    useState<FinancialForecastBreakdown | null>(null);
  const [netDeltaMinor, setNetDeltaMinor] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadItems = useCallback(async () => {
    if (!activeTrip) return;
    try {
      const res = await api.getItinerary(activeTrip._id);
      setItems(res.items);
      if (!simulatedBudgetInput) {
        setSimulatedBudgetInput((activeTrip.totalBudgetMinor / 100).toString());
      }
    } catch (err) {
      console.error('Failed to load items for simulator:', err);
    }
  }, [activeTrip]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const runSimulation = useCallback(
    async (
      currentAdjustments: typeof adjustments,
      budgetStr: string = simulatedBudgetInput,
      extraStr: string = extraDisruptionInput
    ) => {
      if (!activeTrip) return;
      setIsLoading(true);
      try {
        const parsedBudget = parseFloat(budgetStr);
        const budgetMinor = !isNaN(parsedBudget) && parsedBudget > 0 ? Math.round(parsedBudget * 100) : undefined;
        const parsedExtra = parseFloat(extraStr);
        const extraMinor = !isNaN(parsedExtra) && parsedExtra > 0 ? Math.round(parsedExtra * 100) : undefined;

        const res = await api.evaluateSimulation(
          activeTrip._id,
          currentAdjustments,
          budgetMinor,
          extraMinor
        );
        setSimulatedForecast(res.simulatedForecast);
        setNetDeltaMinor(res.netDeltaMinor);
      } catch (err) {
        console.error('Simulation calculation failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTrip, simulatedBudgetInput, extraDisruptionInput]
  );

  const handleAdjustItemCost = (itemId: string, newCostMinor: number) => {
    const existingIdx = adjustments.findIndex((a) => a.targetItemId === itemId);
    let nextAdjustments = [...adjustments];
    if (existingIdx >= 0) {
      nextAdjustments[existingIdx] = {
        targetItemId: itemId,
        action: 'ADJUST_COST',
        simulatedCostMinor: newCostMinor,
      };
    } else {
      nextAdjustments.push({
        targetItemId: itemId,
        action: 'ADJUST_COST',
        simulatedCostMinor: newCostMinor,
      });
    }
    setAdjustments(nextAdjustments);
    runSimulation(nextAdjustments, simulatedBudgetInput, extraDisruptionInput);
  };

  const handleRemoveItem = (itemId: string) => {
    const nextAdjustments = adjustments.filter((a) => a.targetItemId !== itemId);
    nextAdjustments.push({
      targetItemId: itemId,
      action: 'REMOVE',
    });
    setAdjustments(nextAdjustments);
    runSimulation(nextAdjustments, simulatedBudgetInput, extraDisruptionInput);
  };

  const handleBudgetChange = (val: string) => {
    setSimulatedBudgetInput(val);
    runSimulation(adjustments, val, extraDisruptionInput);
  };

  const handleExtraDisruptionChange = (val: string) => {
    setExtraDisruptionInput(val);
    runSimulation(adjustments, simulatedBudgetInput, val);
  };

  const handleReset = () => {
    setAdjustments([]);
    if (activeTrip) {
      setSimulatedBudgetInput((activeTrip.totalBudgetMinor / 100).toString());
    }
    setExtraDisruptionInput('0');
    setSimulatedForecast(null);
    setNetDeltaMinor(0);
  };

  if (!activeTrip) {
    return <div className="p-8 text-center text-slate-500">Please select a trip first.</div>;
  }

  const curr = activeTrip.currency;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-blue-100 text-blue-800">
              <Sliders className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Interactive What-If Simulation
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] mt-1">
            Sandbox Simulator: {activeTrip.name}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Test hypothetical cost modifications in real-time. Live calculations powered by backend financial engine.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5EAF0] text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Variables
        </button>
      </div>

      {/* Prominent Simulation Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-center gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="font-semibold">
          Simulation Only — no booking, expense, or canonical itinerary record will be modified.
        </span>
      </div>

      {/* Comparison Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Original Projected Cost"
          value={
            forecast
              ? formatCurrency(forecast.projectedFinalCostMinor, curr)
              : '₹0'
          }
          subtitle={`Total Budget: ${formatCurrency(activeTrip.totalBudgetMinor, curr)}`}
          icon={Sliders}
        />

        <StatCard
          label="Simulated Projected Cost"
          value={
            simulatedForecast
              ? formatCurrency(simulatedForecast.projectedFinalCostMinor, curr)
              : forecast
              ? formatCurrency(forecast.projectedFinalCostMinor, curr)
              : '₹0'
          }
          subtitle={
            simulatedForecast && simulatedForecast.remainingUsableBudgetMinor >= 0
              ? 'Within usable budget!'
              : 'Simulated estimate'
          }
          icon={TrendingDown}
          variant={
            simulatedForecast && simulatedForecast.remainingUsableBudgetMinor >= 0
              ? 'emerald'
              : 'default'
          }
        />

        <StatCard
          label="Simulated Net Savings"
          value={netDeltaMinor > 0 ? `+${formatCurrency(netDeltaMinor, curr)}` : formatCurrency(0, curr)}
          subtitle={`${adjustments.length} hypothetical variable changes`}
          icon={Sparkles}
          variant={netDeltaMinor > 0 ? 'emerald' : 'default'}
        />
      </div>

      {/* Macro Scenario Controls */}
      <div className="p-5 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider flex items-center gap-2">
          <span>Macro Scenario Simulator</span>
          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Real-Time Engine Feedback
          </span>
        </h3>
        <p className="text-xs text-[#64748B]">
          Simulate macro budget contractions, unforeseen disruption expenses, or price inflation before tweaking individual items.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Simulated Total Trip Budget ({curr})
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="500"
                value={simulatedBudgetInput}
                onChange={(e) => handleBudgetChange(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter budget..."
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Original baseline: {formatCurrency(activeTrip.totalBudgetMinor, curr)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Simulate Unexpected Disruption / Emergency Cost ({curr})
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="500"
                value={extraDisruptionInput}
                onChange={(e) => handleExtraDisruptionChange(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500/20"
                placeholder="e.g. 5000 for emergency rerouting"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Simulate flight surge, medical deductible, or transit disruption fees.
            </span>
          </div>
        </div>
      </div>

      {/* Simulation Controls Grid */}
      <div className="p-6 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          <div>
            <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
              Adjustable Itinerary Commitments
            </h3>
            <p className="text-xs text-[#64748B]">
              Slide or adjust amounts to evaluate projected budget impact.
            </p>
          </div>
          {isLoading && (
            <span className="text-xs text-emerald-600 font-semibold animate-pulse">
              Recalculating forecast...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const currentAdjustment = adjustments.find((a) => a.targetItemId === item._id);
            const isRemovedInSim = currentAdjustment?.action === 'REMOVE';
            const effectiveCostMinor =
              isRemovedInSim
                ? 0
                : currentAdjustment?.simulatedCostMinor !== undefined
                ? currentAdjustment.simulatedCostMinor
                : item.estimatedCostMinor;

            return (
              <div
                key={item._id}
                className={`p-4 rounded-xl border transition-all ${
                  isRemovedInSim
                    ? 'bg-slate-100 border-slate-200 opacity-60'
                    : currentAdjustment
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Day {item.dayNumber} • {item.category}
                    </span>
                    <h4 className="text-xs font-bold text-[#172033]">{item.title}</h4>
                    <span className="text-[10px] text-slate-500 block">
                      Original: {formatCurrency(item.estimatedCostMinor, curr)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold tabular-nums text-[#172033] block">
                      {formatCurrency(effectiveCostMinor, curr)}
                    </span>
                    {item.priority === 'MUST_DO' && (
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                        MUST DO
                      </span>
                    )}
                  </div>
                </div>

                {/* Slider / Controls */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-3">
                  <input
                    type="range"
                    min="0"
                    max={item.estimatedCostMinor * 1.5}
                    step="50000"
                    disabled={isRemovedInSim}
                    value={effectiveCostMinor}
                    onChange={(e) =>
                      handleAdjustItemCost(item._id, parseInt(e.target.value))
                    }
                    className="flex-1 accent-emerald-600 h-1.5 cursor-pointer"
                  />

                  {item.priority !== 'MUST_DO' && (
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
                      title="Hypothetically remove activity"
                    >
                      {isRemovedInSim ? 'Removed' : 'Drop Item'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

