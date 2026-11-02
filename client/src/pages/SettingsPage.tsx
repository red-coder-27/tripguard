import React, { useState } from 'react';
import { Settings as SettingsIcon, User as UserIcon, Shield, Wallet, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [baseCurrency, setBaseCurrency] = useState(user?.baseCurrency || 'INR');
  const [emergencyReservePercentage, setEmergencyReservePercentage] = useState(
    user?.emergencyReservePercentage || 10
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsSaved(false);
    try {
      const res = await api.updateSettings({
        name,
        baseCurrency: baseCurrency as any,
        emergencyReservePercentage,
      });
      updateUser(res.user);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#172033]">Account & Financial Settings</h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Configure personal preferences, default currency, and safety buffers.
        </p>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="p-6 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs">
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider mb-1">
              Personal Information
            </h3>
            <p className="text-xs text-[#64748B]">Profile details associated with your trip portfolio.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5EAF0]">
            <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider mb-1">
              Financial Configuration
            </h3>
            <p className="text-xs text-[#64748B]">Defaults applied to new trip portfolios.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Base Display Currency
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value as any)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Default Emergency Reserve (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={emergencyReservePercentage}
                onChange={(e) => setEmergencyReservePercentage(parseInt(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Percentage of total budget sequestered as non-depletable buffer.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5EAF0] flex justify-between items-center">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
