import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Plus,
  Building,
  Plane,
  AlertCircle,
  Calendar,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';
import { Booking, BookingCategory, BookingStatus } from '../types/index.js';
import { Modal } from '../components/common/Modal.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export const BookingsPage: React.FC = () => {
  const { activeTrip, refreshActiveTrip } = useTrip();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [provider, setProvider] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [category, setCategory] = useState<BookingCategory>('ACCOMMODATION');
  const [totalCost, setTotalCost] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [travelDate, setTravelDate] = useState('');
  const [isRefundable, setIsRefundable] = useState(true);
  const [cancellationFee, setCancellationFee] = useState('0');
  const [policyNotes, setPolicyNotes] = useState('Free cancellation up to 48 hours prior');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!activeTrip) return;
    try {
      const res = await api.getBookings(activeTrip._id);
      setBookings(res.bookings);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  }, [activeTrip]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    setIsSubmitting(true);
    try {
      const totalCostMinor = Math.round(parseFloat(totalCost) * 100);
      const paidAmountMinor = Math.round(parseFloat(paidAmount || '0') * 100);
      const cancellationFeeMinor = Math.round(parseFloat(cancellationFee || '0') * 100);

      await api.createBooking({
        tripId: activeTrip._id,
        provider,
        bookingReference,
        category,
        totalCostMinor,
        paidAmountMinor,
        travelDate: travelDate || activeTrip.startDate,
        currency: activeTrip.currency,
        status: 'CONFIRMED',
        cancellationPolicy: {
          isRefundable,
          cancellationFeeMinor,
          refundableAmountMinor: Math.max(0, paidAmountMinor - cancellationFeeMinor),
          policyNotes,
        },
      });

      await loadBookings();
      await refreshActiveTrip();
      setIsAddModalOpen(false);
      setProvider('');
      setBookingReference('');
      setTotalCost('');
      setPaidAmount('0');
    } catch (err: any) {
      alert(`Failed to add booking: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (confirm('Delete this booking record?')) {
      try {
        await api.deleteBooking(id);
        await loadBookings();
        await refreshActiveTrip();
      } catch (err: any) {
        alert(`Failed to delete booking: ${err.message}`);
      }
    }
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
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">Booking Commitments</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Confirmed accommodations, transit, and experiences for <strong className="text-[#172033]">{activeTrip.name}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Booking
        </button>
      </div>

      {/* Bookings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {bookings.map((booking) => {
          const isPendingAction = booking.status === 'MODIFICATION_PENDING_USER_ACTION';

          return (
            <div
              key={booking._id}
              className={`p-6 rounded-2xl border bg-white shadow-xs transition-all hover:shadow-sm flex flex-col justify-between ${isPendingAction ? 'border-amber-300 ring-1 ring-amber-300 bg-amber-50/20' : 'border-[#E5EAF0]'
                }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-slate-100 text-slate-700">
                      {booking.category === 'ACCOMMODATION' ? (
                        <Building className="w-4 h-4" />
                      ) : (
                        <Plane className="w-4 h-4" />
                      )}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {booking.category}
                      </span>
                      <h3 className="text-base font-bold text-[#172033]">{booking.provider}</h3>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${isPendingAction
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : booking.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                  >
                    {booking.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Booking details */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#64748B]">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Reference</span>
                    <span className="font-semibold text-slate-700 font-mono">
                      {booking.bookingReference || 'Pending Ref'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Travel Date</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(booking.travelDate)}
                    </span>
                  </div>
                </div>

                {/* Financial commitments */}
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Total Contract Cost:</span>
                    <span className="font-bold tabular-nums text-[#172033]">
                      {formatCurrency(booking.totalCostMinor, curr)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Paid to Date:</span>
                    <span className="font-semibold tabular-nums text-emerald-600">
                      {formatCurrency(booking.paidAmountMinor, curr)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">Outstanding Payable:</span>
                    <span className="font-bold tabular-nums text-[#172033]">
                      {formatCurrency(booking.outstandingAmountMinor, curr)}
                    </span>
                  </div>
                </div>

                {/* Cancellation Policy */}
                <div className="mt-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[#172033]">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cancellation Terms:</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] pl-5">
                    {booking.cancellationPolicy?.policyNotes ||
                      (booking.cancellationPolicy?.isRefundable ? 'Refundable' : 'Non-refundable')}
                  </p>
                </div>

                {/* Action Required Banner if Approved Recovery */}
                {isPendingAction && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Action Required by Traveler:</strong>
                      <span>{booking.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleDeleteBooking(booking._id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete booking"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Booking Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Confirmed Travel Booking"
        subtitle="Bookings represent legal obligations with defined cancellation and refund terms."
      >
        <form onSubmit={handleAddBooking} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Provider / Vendor</label>
            <input
              type="text"
              required
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. Grand Central Hotel & Suites"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              >
                <option value="ACCOMMODATION">Accommodation</option>
                <option value="TRANSPORT">Transport</option>
                <option value="ACTIVITY">Activity</option>
                <option value="RESTAURANT">Restaurant</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Booking Reference #
              </label>
              <input
                type="text"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value)}
                placeholder="e.g. BK-98214"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Total Contract Cost ({curr})
              </label>
              <input
                type="number"
                min="0"
                required
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="12000"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Amount Paid to Date ({curr})
              </label>
              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Travel Date</label>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Cancellation Policy Notes
            </label>
            <input
              type="text"
              value={policyNotes}
              onChange={(e) => setPolicyNotes(e.target.value)}
              placeholder="e.g. Free cancellation up to 48h prior"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-4 border-t border-[#E5EAF0] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Confirm Booking Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

