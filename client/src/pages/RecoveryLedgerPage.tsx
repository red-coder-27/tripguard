import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';
import { RecoveryRun, AuditEvent } from '../types/index.js';
import { Modal } from '../components/common/Modal.js';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';

export const RecoveryLedgerPage: React.FC = () => {
  const { activeTrip } = useTrip();
  const [runs, setRuns] = useState<RecoveryRun[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedRun, setSelectedRun] = useState<RecoveryRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadLedger = useCallback(async () => {
    if (!activeTrip) return;
    setIsLoading(true);
    try {
      const res = await api.getLedger(activeTrip._id);
      setRuns(res.runs);
      setAuditEvents(res.auditEvents);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTrip]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  if (!activeTrip) {
    return <div className="p-8 text-center text-slate-500">Please select a trip first.</div>;
  }

  const curr = activeTrip.currency;

  const getStatusBadge = (status: string, isStale: boolean) => {
    if (status === 'APPROVED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> APPROVED
        </span>
      );
    }
    if (isStale) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          STALE
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
          REJECTED
        </span>
      );
    }
    if (status === 'SUPERSEDED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
          SUPERSEDED
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
        GENERATED
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-slate-100 text-slate-700">
              <History className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Auditable Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] mt-1">
            Recovery Decision Ledger
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Immutable snapshot log for <strong className="text-[#172033]">{activeTrip.name}</strong> • Current Version: v{activeTrip.currentVersion}
          </p>
        </div>
      </div>

      {/* Runs Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E5EAF0] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
              Optimization History & Snapshot Runs ({runs.length})
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Historical runs retain original mathematical conditions and can never be mutated.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-[#E5EAF0] text-[#64748B] uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Run ID & Snapshot Hash</th>
                <th className="px-5 py-3.5">Generated Timestamp</th>
                <th className="px-5 py-3.5">Version Transition</th>
                <th className="px-5 py-3.5">Strategy Evaluated</th>
                <th className="px-5 py-3.5 text-right">Original Projected</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Snapshot Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No recovery decisions recorded yet.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-[#172033]">{run.runId}</div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Hash className="w-3 h-3" /> {run.snapshotHash.substring(0, 16)}...
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      {formatDateTime(run.createdAt)}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-700">
                        v{run.itineraryVersionBefore}
                      </span>{' '}
                      {run.itineraryVersionAfter && (
                        <span className="text-emerald-600 font-bold">
                          → v{run.itineraryVersionAfter}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-semibold text-[#172033]">
                      {run.selectedStrategyType ? (
                        <span className="text-emerald-700">
                          {run.selectedStrategyType.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-500">3 Profiles Evaluated</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold tabular-nums text-slate-800">
                      {formatCurrency(run.originalForecast.projectedFinalCostMinor, curr)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {getStatusBadge(run.status, run.isStale)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedRun(run)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Event Timeline */}
      <div className="p-6 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs">
        <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider mb-4">
          Chronological Audit Stream ({auditEvents.length})
        </h3>

        <div className="space-y-3">
          {auditEvents.slice(0, 10).map((event) => (
            <div
              key={event._id}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
            >
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172033]">{event.eventType}</span>
                  <span className="text-[10px] text-slate-400">{formatDateTime(event.timestamp)}</span>
                </div>
                <div className="mt-0.5 text-[#64748B] text-[11px] font-mono">
                  {JSON.stringify(event.metadata)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Snapshot Inspect Modal */}
      {selectedRun && (
        <Modal
          isOpen={!!selectedRun}
          onClose={() => setSelectedRun(null)}
          title={`Snapshot Inspection: ${selectedRun.runId}`}
          subtitle={`Captured at ${formatDateTime(selectedRun.createdAt)}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-100 rounded-xl font-mono text-xs text-slate-700 break-all">
              <strong>Snapshot Hash:</strong> {selectedRun.snapshotHash}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Original Projected Cost
                </span>
                <span className="text-base font-bold tabular-nums text-[#172033]">
                  {formatCurrency(selectedRun.originalForecast.projectedFinalCostMinor, curr)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Overspending Gap at Generation
                </span>
                <span className="text-base font-bold tabular-nums text-red-600">
                  {formatCurrency(selectedRun.originalForecast.overspendingGapMinor, curr)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Evaluated Recovery Profiles
              </h4>
              <div className="space-y-2">
                {selectedRun.strategies.map((strat) => (
                  <div
                    key={strat.strategyType}
                    className="p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-[#172033]">{strat.title}</span>
                      <span className="text-slate-500 block text-[11px]">{strat.tagline}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 tabular-nums">
                        +{formatCurrency(strat.netSavingsMinor, curr)} net
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Disruption: {strat.disruptionScore}/100
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedRun.approvalNotes && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                <strong>Approval Record:</strong> {selectedRun.approvalNotes} (Approved on{' '}
                {selectedRun.approvedAt ? formatDateTime(selectedRun.approvedAt) : 'N/A'})
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

