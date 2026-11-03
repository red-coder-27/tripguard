import React, { useState } from 'react';
import { Shield, ArrowRight, CheckCircle2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@tripguard.ai');
  const [password, setPassword] = useState('TripGuard2026!');
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register(name, email, password, baseCurrency);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = () => {
    setIsRegister(false);
    setEmail('demo@tripguard.ai');
    setPassword('TripGuard2026!');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-[#E5EAF0] overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left: Dark Navy Brand Showcase */}
        <div className="bg-[#101B2D] p-8 sm:p-10 flex flex-col justify-between text-white border-b md:border-b-0 md:border-r border-[#1E2D45]">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight block">TripGuard</span>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider block">
                  Adaptive Travel Recovery
                </span>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Save your trip. <br />
                <span className="text-emerald-400">Not just your budget.</span>
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#A7B4C8] leading-relaxed">
                When itineraries become financially infeasible, TripGuard’s deterministic optimization restores affordability with minimal experiential disruption.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#1E2D45] space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#A7B4C8]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Strict integer minor-unit financial ledger (no double-counting)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#A7B4C8]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Protects MUST_DO experiences and non-refundable commitments</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#A7B4C8]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Auditable decision ledger with immutable versioning</span>
            </div>
          </div>
        </div>

        {/* Right: Authentication Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center justify-between pb-4 border-b border-[#E5EAF0]">
            <div>
              <h3 className="text-xl font-bold text-[#172033]">
                {isRegister ? 'Create Traveler Account' : 'Sign in to TripGuard'}
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {isRegister ? 'Enter details to start recovery planning' : 'Access your active travel portfolios'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleQuickDemo}
              className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              Demo Credentials
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@tripguard.ai"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">Base Currency</label>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'Processing...'
              ) : isRegister ? (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-slate-600 hover:text-emerald-700 font-semibold"
            >
              {isRegister
                ? 'Already have an account? Sign in instead'
                : "Don't have an account? Register here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

