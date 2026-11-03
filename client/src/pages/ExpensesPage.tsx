import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CreditCard,
  Trash2,
  Calendar,
  Tag,
  Link as LinkIcon,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';
import { Expense, ExpenseCategory, Booking } from '../types/index.js';
import { Modal } from '../components/common/Modal.js';
import { StatCard } from '../components/common/StatCard.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export const ExpensesPage: React.FC = () => {
  const { activeTrip, forecast, refreshActiveTrip } = useTrip();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('MISC');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'UPI' | 'BANK_TRANSFER'>('CREDIT_CARD');
  const [bookingId, setBookingId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeTrip) return;
    try {
      const [expRes, bookRes] = await Promise.all([
        api.getExpenses(activeTrip._id),
        api.getBookings(activeTrip._id),
      ]);
      setExpenses(expRes.expenses);
      setBookings(bookRes.bookings);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    }
  }, [activeTrip]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalSpentMinor = expenses
    .filter((e) => e.paymentStatus === 'SETTLED')
    .reduce((sum, e) => sum + e.amountMinor, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    setIsSubmitting(true);
    try {
      await api.createExpense({
        tripId: activeTrip._id,
        description,
        category,
        amountMinor: Math.round(parseFloat(amount) * 100),
        currency: activeTrip.currency,
        paymentMethod,
        paymentStatus: 'SETTLED',
        bookingId: bookingId || undefined,
        notes,
      });

      await loadData();
      await refreshActiveTrip();
      setIsAddModalOpen(false);
      setDescription('');
      setAmount('');
      setBookingId('');
      setNotes('');
    } catch (err: any) {
      alert(`Failed to record expense: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Delete this settled expense record?')) {
      try {
        await api.deleteExpense(id);
        await loadData();
        await refreshActiveTrip();
      } catch (err: any) {
        alert(`Failed to delete expense: ${err.message}`);
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
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">Expense Ledger</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Settled transactions for <strong className="text-[#172033]">{activeTrip.name}</strong> • Minor-unit financial precision
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Record Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Settled Expenditures"
          value={formatCurrency(totalSpentMinor, curr)}
          subtitle={`${expenses.length} transaction records`}
          icon={Receipt}
          variant="emerald"
        />
        <StatCard
          label="Remaining Usable Budget"
          value={
            forecast
              ? formatCurrency(forecast.remainingUsableBudgetMinor, curr)
              : formatCurrency(activeTrip.totalBudgetMinor - totalSpentMinor, curr)
          }
          subtitle={`Total budget: ${formatCurrency(activeTrip.totalBudgetMinor, curr)}`}
          icon={CreditCard}
          variant={forecast && forecast.remainingUsableBudgetMinor < 0 ? 'critical' : 'default'}
        />
        <StatCard
          label="Protected Emergency Reserve"
          value={
            forecast
              ? formatCurrency(forecast.emergencyReserveMinor, curr)
              : formatCurrency(activeTrip.emergencyReserveMinor, curr)
          }
          subtitle="Non-depletable safety buffer"
          icon={Tag}
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-medium"
          >
            <option value="ALL">All Categories</option>
            <option value="ACCOMMODATION">Accommodation</option>
            <option value="TRANSPORT">Transport</option>
            <option value="ACTIVITY">Activity</option>
            <option value="FOOD_DINING">Food & Dining</option>
            <option value="SHOPPING">Shopping</option>
            <option value="MISC">Miscellaneous</option>
          </select>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-[#E5EAF0] text-[#64748B] uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-[#172033]">
                      <div>{exp.description}</div>
                      {exp.bookingId && (
                        <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                          <LinkIcon className="w-3 h-3" /> Linked to Booking
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{exp.paymentMethod}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {exp.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold tabular-nums text-base text-[#172033]">
                      {formatCurrency(exp.amountMinor, exp.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp._id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Cleared Expense"
        subtitle="Records are tracked in integer minor currency units to prevent floating-point drift."
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Narita Airport Limousine Express"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Amount ({curr})
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
            </div>
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
                <option value="FOOD_DINING">Food & Dining</option>
                <option value="SHOPPING">Shopping</option>
                <option value="MISC">Miscellaneous</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              >
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Link to Booking (Optional)
              </label>
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              >
                <option value="">No linked booking</option>
                {bookings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.provider} ({formatCurrency(b.totalCostMinor, b.currency)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Receipt details or notes..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
              rows={2}
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
              {isSubmitting ? 'Recording...' : 'Record to Ledger'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

