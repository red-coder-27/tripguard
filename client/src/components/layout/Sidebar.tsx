import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Calendar,
  Receipt,
  Ticket,
  Zap,
  History,
  Sliders,
  BarChart3,
  Bot,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import { useTrip } from '../../context/TripContext.js';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isMobileDrawer?: boolean;
}

export const SidebarContent: React.FC<{
  currentPath: string;
  onNavigate: (path: string) => void;
  onClose?: () => void;
}> = ({ currentPath, onNavigate, onClose }) => {
  const { forecast } = useTrip();

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Trips', path: '/trips', icon: Compass },
    { label: 'Itinerary', path: '/itinerary', icon: Calendar },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
    { label: 'Bookings', path: '/bookings', icon: Ticket },
    {
      label: 'Recovery Center',
      path: '/recovery',
      icon: Zap,
      isHighlighted: true,
      badge:
        forecast?.overspendingGapMinor && forecast.overspendingGapMinor > 0
          ? 'Deficit'
          : undefined,
    },
    { label: 'Recovery Ledger', path: '/ledger', icon: History },
    { label: 'What-If Simulator', path: '/simulator', icon: Sliders },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'TripGuard Copilot', path: '/copilot', icon: Bot, isAi: true },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleItemClick = (path: string) => {
    onNavigate(path);
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-[#101B2D] text-white">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#1E2D45] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-white block leading-tight">
              TripGuard
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block">
              Fintech Recovery
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-[#A7B4C8] hover:text-white rounded-lg hover:bg-[#1E2D45]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Product Tagline */}
      <div className="px-5 py-2.5 bg-[#17243A]/60 border-b border-[#1E2D45]/50 shrink-0">
        <p className="text-[11px] text-[#A7B4C8] font-medium leading-snug">
          Save your trip. <br />
          <span className="text-emerald-400 font-semibold">Not just your budget.</span>
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => handleItemClick(item.path)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-[#22354A] text-white shadow-sm'
                  : 'text-[#A7B4C8] hover:bg-[#192A40] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-[#22C58B]'
                      : item.isHighlighted
                      ? 'text-emerald-400 group-hover:text-emerald-300'
                      : item.isAi
                      ? 'text-purple-400 group-hover:text-purple-300'
                      : 'text-[#A7B4C8] group-hover:text-white'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  {item.badge}
                </span>
              )}
              {item.isHighlighted && !item.badge && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-[#1E2D45] bg-[#17243A]/40 text-[11px] text-[#A7B4C8] shrink-0">
        <div className="flex items-center justify-between">
          <span>Engine Status</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Deterministic
          </span>
        </div>
        <div className="mt-1 text-[10px] text-slate-500">TripGuard v1.0 • Enterprise Core</div>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Permanent Desktop/Tablet Sidebar: always visible for screens >= md (768px) */}
      <aside className="hidden md:flex flex-col w-[250px] shrink-0 min-h-screen h-screen sticky top-0 bg-[#101B2D] border-r border-[#1E2D45] z-30">
        <SidebarContent currentPath={currentPath} onNavigate={onNavigate} />
      </aside>

      {/* Mobile Drawer (screens < 768px) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-[260px] max-w-[85vw] h-full z-50 shadow-2xl">
            <SidebarContent
              currentPath={currentPath}
              onNavigate={onNavigate}
              onClose={onCloseMobile}
            />
          </div>
        </div>
      )}
    </>
  );
};
