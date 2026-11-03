import React, { useState, useEffect } from 'react';
import {
  Menu,
  ChevronDown,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  Zap,
  Bell,
  Coins,
  Wifi,
  WifiOff,
  AlertTriangle,
  ArrowRight,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTrip } from '../../context/TripContext.js';
import { RiskBadge } from '../common/Badge.js';
import { formatCurrency } from '../../utils/formatters.js';
import { api } from '../../services/api.js';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  pageTitle: string;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  pageTitle,
  currentPath,
  onNavigate,
}) => {
  const { user, logout } = useAuth();
  const { trips, activeTrip, forecast, setActiveTripId } = useTrip();

  // Connectivity state (Category Y)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // In-App Notification Center state (Category S)
  const [showNotifications, setShowNotifications] = useState(false);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);

  // Currency Converter state (Category R)
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [convertAmount, setConvertAmount] = useState('1000');
  const [convertFrom, setConvertFrom] = useState('INR');
  const [convertTo, setConvertTo] = useState('USD');
  const [conversionResult, setConversionResult] = useState<{
    convertedAmount: number;
    rate: number;
    retrievedAt?: string;
  } | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Derive notifications from active trip context
  const notifications = [];
  if (forecast && forecast.overspendingGapMinor > 0) {
    notifications.push({
      id: 'notif-budget-deficit',
      title: 'Budget Deficit Detected',
      message: `Your trip is projected to exceed the budget by ${formatCurrency(
        forecast.overspendingGapMinor,
        forecast.currency
      )}.`,
      actionPath: '/recovery',
      actionLabel: 'Open Recovery Center',
      severity: 'HIGH',
      timestamp: 'Active Now',
    });
  }
  if (activeTrip) {
    notifications.push({
      id: 'notif-weather-check',
      title: 'Meteorological Rain Alert',
      message: 'Day 3 forecast flags 45% precipitation. Review covered sight alternatives.',
      actionPath: '/disruptions',
      actionLabel: 'View Disruptions Hub',
      severity: 'MEDIUM',
      timestamp: 'Today 10:00 AM',
    });
  }

  const unreadCount = notifications.filter((n) => !readAlertIds.includes(n.id)).length;

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReadAlertIds([...readAlertIds, id]);
  };

  const handleRunConversion = async () => {
    setIsConverting(true);
    try {
      const num = parseFloat(convertAmount) || 0;
      const res = await api.get<{
        from: string;
        to: string;
        rate: number;
        originalAmountMinor: number;
        convertedAmountMinor: number;
        retrievedAt: string;
      }>(`/currency/convert?from=${convertFrom}&to=${convertTo}&amountMinor=${Math.round(num * 100)}`);

      if (res.success && res.data) {
        setConversionResult({
          convertedAmount: res.data.convertedAmountMinor / 100,
          rate: res.data.rate,
          retrievedAt: res.data.retrievedAt,
        });
      }
    } catch (err) {
      console.error('Currency conversion error:', err);
    } finally {
      setIsConverting(false);
    }
  };

  useEffect(() => {
    if (showCurrencyModal) {
      handleRunConversion();
    }
  }, [showCurrencyModal, convertFrom, convertTo]);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E5EAF0] px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile trigger & Trip context switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100 transition-colors"
          title="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#172033] hidden sm:inline-block">
            {pageTitle}
          </span>
          <span className="text-slate-300 hidden sm:inline-block">|</span>

          {/* Trip Selector Dropdown */}
          {trips.length > 0 && activeTrip ? (
            <div className="relative group">
              <select
                value={activeTrip._id}
                onChange={(e) => setActiveTripId(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-[#E5EAF0] text-xs font-semibold text-[#172033] py-1.5 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                {trips.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.destination})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <span className="text-xs text-slate-500">No Active Trip Selected</span>
          )}

          {forecast && <RiskBadge status={forecast.riskStatus} />}

          {/* Offline / Online Network Indicator (Category Y) */}
          {!isOnline ? (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <WifiOff className="w-3 h-3 text-amber-700" /> Offline (Cached)
            </span>
          ) : (
            <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick actions, FX calculator, Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Currency Converter Quick Tool (Category R) */}
        <button
          onClick={() => setShowCurrencyModal(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
          title="Open Live Currency Converter"
        >
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">FX Rates</span>
        </button>

        {/* In-App Notification Center Bell (Category S) */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Notifications & Disruption Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Center Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Alert Center ({unreadCount} unread)
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active notifications for this trip.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isRead = readAlertIds.includes(n.id);
                    return (
                      <div
                        key={n.id}
                        className={`p-3.5 text-xs transition-colors hover:bg-slate-50 ${
                          isRead ? 'opacity-50' : 'bg-emerald-50/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900">{n.title}</span>
                          <button
                            onClick={(e) => handleDismissNotification(n.id, e)}
                            className="text-slate-400 hover:text-slate-700 text-[10px]"
                            title="Dismiss"
                          >
                            Dismiss
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                          {onNavigate && (
                            <button
                              onClick={() => {
                                setShowNotifications(false);
                                onNavigate(n.actionPath);
                              }}
                              className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              {n.actionLabel} <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recovery Center Shortcut */}
        {forecast && forecast.overspendingGapMinor > 0 && onNavigate && currentPath !== '/recovery' && (
          <button
            onClick={() => onNavigate('/recovery')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors animate-pulse"
          >
            <Zap className="w-3.5 h-3.5 text-red-600" />
            <span>Recover Overspend</span>
          </button>
        )}

        {forecast && forecast.emergencyReserveMinor > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Reserve: <strong>{formatCurrency(forecast.emergencyReserveMinor, forecast.currency)}</strong>
            </span>
          </div>
        )}

        {/* User Profile Pill */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-[#172033] leading-tight">
                {user?.name || 'Traveler'}
              </div>
              <div className="text-[10px] text-[#64748B] leading-tight">{user?.email}</div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Currency Converter Modal (Category R) */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Live Multi-Currency Converter</h3>
              </div>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  onBlur={handleRunConversion}
                  className="w-full text-sm font-bold px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    From Currency
                  </label>
                  <select
                    value={convertFrom}
                    onChange={(e) => setConvertFrom(e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-2 border rounded-xl"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    To Currency
                  </label>
                  <select
                    value={convertTo}
                    onChange={(e) => setConvertTo(e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-2 border rounded-xl"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              {conversionResult && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Calculated Result
                  </span>
                  <div className="text-2xl font-black text-slate-900">
                    {conversionResult.convertedAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="text-sm font-bold text-slate-500">{convertTo}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Exchange Rate: 1 {convertFrom} = {conversionResult.rate.toFixed(4)} {convertTo}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Source: Frankfurter Keyless API • {conversionResult.retrievedAt ? new Date(conversionResult.retrievedAt).toLocaleDateString() : 'Live'}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunConversion}
                disabled={isConverting}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isConverting ? 'animate-spin' : ''}`} />
                {isConverting ? 'Updating Rates...' : 'Recalculate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
