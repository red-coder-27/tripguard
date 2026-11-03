import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Lock,
  Unlock,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';
import { ItineraryItem, ActivityCategory, ActivityPriority } from '../types/index.js';
import { PriorityBadge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export const ItineraryPage: React.FC = () => {
  const { activeTrip, forecast, refreshActiveTrip } = useTrip();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('ACTIVITY');
  const [dayNumber, setDayNumber] = useState(1);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('1500');
  const [priority, setPriority] = useState<ActivityPriority>('FLEXIBLE');
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    if (!activeTrip) return;
    setIsLoading(true);
    try {
      const res = await api.getItinerary(activeTrip._id);
      setItems(res.items);
    } catch (err) {
      console.error('Failed to load itinerary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTrip]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const daysList = Array.from(new Set(items.map((i) => i.dayNumber))).sort((a, b) => a - b);
  const currentDayItems = items
    .filter((i) => i.dayNumber === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const dayTotalMinor = currentDayItems.reduce((sum, i) => sum + i.estimatedCostMinor, 0);

  const handleToggleLock = async (item: ItineraryItem) => {
    try {
      await api.updateItineraryItem(item._id, { isLocked: !item.isLocked });
      await loadItems();
      await refreshActiveTrip();
    } catch (err: any) {
      alert(`Failed to update item: ${err.message}`);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to remove this activity from the itinerary?')) {
      try {
        await api.deleteItineraryItem(id);
        await loadItems();
        await refreshActiveTrip();
      } catch (err: any) {
        alert(`Failed to delete item: ${err.message}`);
      }
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    setIsSubmitting(true);
    try {
      const date = new Date(activeTrip.startDate);
      date.setDate(date.getDate() + (dayNumber - 1));

      await api.createItineraryItem({
        tripId: activeTrip._id,
        dayNumber,
        date: date.toISOString(),
        title,
        description,
        category,
        startTime,
        endTime,
        location,
        estimatedCostMinor: Math.round(parseFloat(estimatedCost) * 100),
        priority,
        isLocked,
      });

      await loadItems();
      await refreshActiveTrip();
      setIsAddModalOpen(false);
      setTitle('');
      setDescription('');
      setLocation('');
    } catch (err: any) {
      alert(`Failed to add item: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeTrip) {
    return (
      <div className="p-8 text-center text-slate-500">
        Please select or create a trip first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">Itinerary Planner</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Day-by-day scheduling for <strong className="text-[#172033]">{activeTrip.name}</strong> • Version v{activeTrip.currentVersion}
          </p>
        </div>

        <button
          onClick={() => {
            setDayNumber(selectedDay);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Activity
        </button>
      </div>

      {/* Day Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E5EAF0]">
        {(daysList.length > 0 ? daysList : [1]).map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedDay === day
                ? 'bg-[#101B2D] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-[#E5EAF0]'
            }`}
          >
            Day {day}
          </button>
        ))}
      </div>

      {/* Daily Summary Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>
            Scheduled Activities on Day {selectedDay}: <strong>{currentDayItems.length}</strong>
          </span>
        </div>
        <div className="text-xs">
          <span className="text-[#64748B] mr-2">Estimated Day Total:</span>
          <span className="font-bold tabular-nums text-sm text-[#172033]">
            {formatCurrency(dayTotalMinor, forecast?.currency || 'INR')}
          </span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        {currentDayItems.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="mt-2 text-sm font-semibold text-slate-700">No activities on Day {selectedDay}</h4>
            <p className="mt-1 text-xs text-slate-500">Click "Add Activity" to plan your schedule.</p>
          </div>
        ) : (
          currentDayItems.map((item) => (
            <div
              key={item._id}
              className={`p-5 rounded-2xl border bg-white shadow-xs transition-all hover:shadow-sm ${
                item.priority === 'MUST_DO'
                  ? 'border-purple-200'
                  : item.isLocked
                  ? 'border-slate-300'
                  : 'border-[#E5EAF0]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={item.priority} isLocked={item.isLocked} />
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#172033]">{item.title}</h3>

                  {item.description && (
                    <p className="text-xs text-[#64748B] leading-relaxed max-w-2xl">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {item.startTime} – {item.endTime}
                    </span>
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {item.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Cost & Controls */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-sm font-bold tabular-nums text-[#172033]">
                    {formatCurrency(item.estimatedCostMinor, forecast?.currency || 'INR')}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleLock(item)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        item.isLocked
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800'
                      }`}
                      title={item.isLocked ? 'Unlock item' : 'Lock item against recovery'}
                    >
                      {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleDeleteItem(item._id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                      title="Remove activity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Activity Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Scheduled Itinerary Activity"
        subtitle="Assign priority and flexibility flags to govern recovery behavior."
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Tsukiji Market Tasting Tour"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                <option value="ACTIVITY">Activity</option>
                <option value="ACCOMMODATION">Accommodation</option>
                <option value="TRANSPORT">Transport</option>
                <option value="FOOD_DINING">Food & Dining</option>
                <option value="SHOPPING">Shopping</option>
                <option value="MISC">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Day Number</label>
              <input
                type="number"
                min="1"
                required
                value={dayNumber}
                onChange={(e) => setDayNumber(parseInt(e.target.value))}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:30"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">End Time</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="11:30"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Asakusa, Tokyo"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Estimated Cost ({forecast?.currency || 'INR'})
              </label>
              <input
                type="number"
                min="0"
                required
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Priority Rule</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              >
                <option value="MUST_DO">MUST_DO (Protected from modification)</option>
                <option value="FLEXIBLE">FLEXIBLE (Replaceable with alternative)</option>
                <option value="OPTIONAL">OPTIONAL (Removable if needed)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="lockCheckbox"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="lockCheckbox" className="text-xs font-medium text-[#172033]">
              Lock item (Recovery engine cannot suggest changing this activity)
            </label>
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
              {isSubmitting ? 'Saving...' : 'Add to Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

