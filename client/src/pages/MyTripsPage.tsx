import React, { useState } from 'react';
import {
  Compass,
  Plus,
  Search,
  Calendar,
  Users,
  Wallet,
  TrendingUp,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';
import { Modal } from '../components/common/Modal.js';
import { RiskBadge } from '../components/common/Badge.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

interface MyTripsPageProps {
  onNavigate: (path: string) => void;
}

export const MyTripsPage: React.FC<MyTripsPageProps> = ({ onNavigate }) => {
  const { trips, setActiveTripId, refreshTrips } = useTrip();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelersCount, setTravelersCount] = useState(1);
  const [totalBudget, setTotalBudget] = useState('50000');
  const [emergencyReserve, setEmergencyReserve] = useState('5000');
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const totalBudgetMinor = Math.round(parseFloat(totalBudget) * 100);
      const emergencyReserveMinor = emergencyReserve
        ? Math.round(parseFloat(emergencyReserve) * 100)
        : Math.round(totalBudgetMinor * 0.10);

      const res = await api.createTrip({
        name,
        destination,
        startDate: startDate as any,
        endDate: endDate as any,
        travelersCount,
        totalBudgetMinor,
        emergencyReserveMinor,
        currency,
      });

      await refreshTrips();
      setActiveTripId(res.trip._id);
      setIsCreateModalOpen(false);
      // Reset form
      setName('');
      setDestination('');
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      alert(`Error creating trip: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrip = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the trip "${name}" and all its records?`)) {
      try {
        await api.deleteTrip(id);
        await refreshTrips();
      } catch (err: any) {
        alert(`Failed to delete trip: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">My Travel Portfolios</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage your itineraries, monitor budget forecasts, and trigger recovery actions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create New Trip
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search destination or trip name..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'ACTIVE', 'PLANNING', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-[#101B2D] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTrips.map((trip) => {
          const forecast = trip.forecast;
          const curr = trip.currency;

          return (
            <div
              key={trip._id}
              className="bg-white rounded-2xl border border-[#E5EAF0] shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                    {trip.destination}
                  </span>
                  {forecast && <RiskBadge status={forecast.riskStatus} />}
                </div>

                <h3 className="text-lg font-bold text-[#172033] mt-2.5">{trip.name}</h3>

                <div className="mt-2 text-xs text-[#64748B] flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(trip.startDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {trip.travelersCount} Traveler
                  </span>
                </div>

                {/* Financial Summary */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B] flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-slate-400" /> Total Budget
                    </span>
                    <span className="font-bold tabular-nums text-[#172033]">
                      {formatCurrency(trip.totalBudgetMinor, curr)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64748B] flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-slate-400" /> Projected Final
                    </span>
                    <span
                      className={`font-bold tabular-nums ${
                        forecast && forecast.overspendingGapMinor > 0
                          ? 'text-red-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {forecast ? formatCurrency(forecast.projectedFinalCostMinor, curr) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3.5 bg-slate-50/60 border-t border-[#E5EAF0] flex items-center justify-between">
                <button
                  onClick={() => handleDeleteTrip(trip._id, trip.name)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Delete Trip"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveTripId(trip._id);
                      onNavigate('/itinerary');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Itinerary
                  </button>
                  <button
                    onClick={() => {
                      setActiveTripId(trip._id);
                      onNavigate('/recovery');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-xs"
                  >
                    Recovery <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Trip Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Travel Itinerary Portfolio"
        subtitle="Set up your destination, dates, and strict financial budget constraints."
      >
        <form onSubmit={handleCreateTrip} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Trip Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kyoto Cultural Immersion"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Destination</label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Kyoto, Japan"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Total Budget</label>
              <input
                type="number"
                required
                min="100"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Emergency Reserve
              </label>
              <input
                type="number"
                min="0"
                value={emergencyReserve}
                onChange={(e) => setEmergencyReserve(e.target.value)}
                placeholder="10% default"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5EAF0] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {isSubmitting ? 'Creating...' : 'Initialize Trip'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
