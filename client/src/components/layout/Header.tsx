import React from 'react';
import { Menu, ChevronDown, ShieldCheck, LogOut, User as UserIcon, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTrip } from '../../context/TripContext.js';
import { RiskBadge } from '../common/Badge.js';
import { formatCurrency } from '../../utils/formatters.js';

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
        </div>
      </div>

      {/* Right: Quick actions, Reserve status & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
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
    </header>
  );
};
