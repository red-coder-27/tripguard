import React, { useEffect, useState } from 'react';
import {
  FileText,
  CheckSquare,
  Users,
  Leaf,
  Trash2,
  Download,
  Plus,
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
  Plane,
  Train,
  X,
  Eye,
  Edit3,
  Calendar,
  Lock,
  UserPlus,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';
import { formatCurrency, getCurrencyDivisor } from '../utils/formatters.js';

interface TransitItem {
  _id: string;
  type: 'FLIGHT' | 'TRAIN' | 'BUS';
  carrier: string;
  code: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'BOARDING' | 'ARRIVED';
  delayMinutes: number;
  terminal?: string;
  gate?: string;
  seat?: string;
  trackingMode: 'MANUAL_VERIFIED' | 'ESTIMATED';
  notes?: string;
}

interface TravelDoc {
  _id: string;
  title: string;
  category: string;
  fileName: string;
  fileSize: string;
  bookingRef?: string;
  notes?: string;
  createdAt: string;
}

interface PackingItemData {
  _id: string;
  name: string;
  category: string;
  isPacked: boolean;
  quantity: number;
  isRecommendedByWeather?: boolean;
}

interface GroupMemberData {
  memberId: string;
  name: string;
  email?: string;
  role: string;
  sharePercentage: number;
  contributedMinor: number;
  fairShareMinor: number;
  balanceMinor: number;
  status: string;
}

interface EcoData {
  totalEmissionsKg: number;
  breakdown: { category: string; emissionsKg: number; percentage: number }[];
  greenSavingsPossibleKg: number;
  ecoRating: string;
  carbonOffsetCostMinor: number;
  recommendationText?: string;
  metadata?: {
    isProviderVerified: boolean;
    estimationModel: string;
    methodologyNotes: string;
  };
}

export const TravelerToolsPage: React.FC = () => {
  const { activeTrip } = useTrip();
  const [activeTab, setActiveTab] = useState<'VAULT' | 'PACKING' | 'TRANSIT' | 'GROUP' | 'ECO'>('VAULT');

  // Vault state
  const [docs, setDocs] = useState<TravelDoc[]>([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('HOTEL');
  const [newDocBookingRef, setNewDocBookingRef] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<TravelDoc | null>(null);

  // Packing state
  const [packingItems, setPackingItems] = useState<PackingItemData[]>([]);
  const [packingProgress, setPackingProgress] = useState(0);
  const [newPackingName, setNewPackingName] = useState('');
  const [newPackingCategory, setNewPackingCategory] = useState('ESSENTIALS');

  // Transit state
  const [transits, setTransits] = useState<TransitItem[]>([]);
  const [showAddTransitModal, setShowAddTransitModal] = useState(false);
  const [newCarrier, setNewCarrier] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTransitType, setNewTransitType] = useState<'FLIGHT' | 'TRAIN' | 'BUS'>('FLIGHT');
  const [newDepCity, setNewDepCity] = useState('');
  const [newArrCity, setNewArrCity] = useState('');
  const [newGate, setNewGate] = useState('');
  const [newSeat, setNewSeat] = useState('');

  // Group state
  const [groupMembers, setGroupMembers] = useState<GroupMemberData[]>([]);
  const [totalExpensesMinor, setTotalExpensesMinor] = useState(0);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'CO_TRAVELER' | 'LEAD_ORGANIZER' | 'VIEWER'>('CO_TRAVELER');
  const [newMemberSharePct, setNewMemberSharePct] = useState(25);
  const [newMemberContributionMajor, setNewMemberContributionMajor] = useState(0);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Edit Member Modal
  const [editingMember, setEditingMember] = useState<GroupMemberData | null>(null);
  const [editMemberSharePct, setEditMemberSharePct] = useState(0);
  const [editMemberContributionMajor, setEditMemberContributionMajor] = useState(0);

  // Eco state
  const [eco, setEco] = useState<EcoData | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Stale state reset and cancellation guard
  useEffect(() => {
    if (!activeTrip) return;

    let isCancelled = false;

    // Reset current active states immediately to prevent stale flashing
    setDocs([]);
    setPackingItems([]);
    setTransits([]);
    setGroupMembers([]);
    setEco(null);
    setIsLoading(true);

    const loadAllData = async () => {
      try {
        const [vaultRes, packRes, transitRes, groupRes, ecoRes] = await Promise.allSettled([
          api.get<TravelDoc[]>(`/traveler-tools/vault/trip/${activeTrip._id}`),
          api.get<{ items: PackingItemData[]; progressPercentage: number }>(`/traveler-tools/packing/trip/${activeTrip._id}`),
          api.get<TransitItem[]>(`/traveler-tools/transit/trip/${activeTrip._id}`),
          api.get<{ settlementSummary: GroupMemberData[]; totalExpensesMinor: number }>(`/traveler-tools/group/trip/${activeTrip._id}`),
          api.get<EcoData>(`/traveler-tools/eco/trip/${activeTrip._id}`),
        ]);

        if (isCancelled) return;

        if (vaultRes.status === 'fulfilled' && vaultRes.value.success && vaultRes.value.data) {
          setDocs(vaultRes.value.data);
        }
        if (packRes.status === 'fulfilled' && packRes.value.success && packRes.value.data) {
          setPackingItems(packRes.value.data.items);
          setPackingProgress(packRes.value.data.progressPercentage);
        }
        if (transitRes.status === 'fulfilled' && transitRes.value.success && transitRes.value.data) {
          setTransits(transitRes.value.data);
        }
        if (groupRes.status === 'fulfilled' && groupRes.value.success && groupRes.value.data) {
          setGroupMembers(groupRes.value.data.settlementSummary);
          setTotalExpensesMinor(groupRes.value.data.totalExpensesMinor);
        }
        if (ecoRes.status === 'fulfilled' && ecoRes.value.success && ecoRes.value.data) {
          setEco(ecoRes.value.data);
        }
      } catch (err) {
        if (!isCancelled) console.error('Error loading traveler tools data:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadAllData();

    return () => {
      isCancelled = true;
    };
  }, [activeTrip?._id]);

  // Refresh group settlement after mutation
  const refreshGroupData = async () => {
    if (!activeTrip) return;
    try {
      const res = await api.get<{ settlementSummary: GroupMemberData[]; totalExpensesMinor: number }>(
        `/traveler-tools/group/trip/${activeTrip._id}`
      );
      if (res.success && res.data) {
        setGroupMembers(res.data.settlementSummary);
        setTotalExpensesMinor(res.data.totalExpensesMinor);
      }
    } catch (err) {
      console.error('Failed to refresh group split data:', err);
    }
  };

  // --- Document Vault Handlers ---
  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newDocTitle.trim()) return;
    try {
      const res = await api.post<TravelDoc>(
        `/traveler-tools/vault/trip/${activeTrip._id}`,
        {
          title: newDocTitle.trim(),
          category: newDocCategory,
          fileName: `${newDocTitle.trim().replace(/\s+/g, '-')}.pdf`,
          fileSize: '240 KB',
          bookingRef: newDocBookingRef.trim(),
          notes: newDocNotes.trim(),
        }
      );
      if (res.success && res.data) {
        setDocs([res.data, ...docs]);
        setNewDocTitle('');
        setNewDocBookingRef('');
        setNewDocNotes('');
        setShowAddDocModal(false);
      }
    } catch (err) {
      console.error('Failed to add document:', err);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!activeTrip) return;
    try {
      await api.delete(`/traveler-tools/vault/trip/${activeTrip._id}/${docId}`);
      setDocs(docs.filter((d) => d._id !== docId));
      if (viewingDoc?._id === docId) setViewingDoc(null);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // --- Packing Handlers ---
  const handleTogglePacking = async (itemId: string) => {
    if (!activeTrip) return;
    try {
      const res = await api.patch<PackingItemData>(
        `/traveler-tools/packing/trip/${activeTrip._id}/${itemId}/toggle`,
        {}
      );
      if (res.success && res.data) {
        const updated = packingItems.map((item) =>
          item._id === itemId ? res.data : item
        );
        setPackingItems(updated);
        const packed = updated.filter((i) => i.isPacked).length;
        setPackingProgress(Math.round((packed / updated.length) * 100));
      }
    } catch (err) {
      console.error('Failed to toggle packing item:', err);
    }
  };

  const handleAddPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newPackingName.trim()) return;
    try {
      const res = await api.post<PackingItemData>(
        `/traveler-tools/packing/trip/${activeTrip._id}`,
        {
          name: newPackingName.trim(),
          category: newPackingCategory,
          quantity: 1,
        }
      );
      if (res.success && res.data) {
        const updated = [...packingItems, res.data];
        setPackingItems(updated);
        setNewPackingName('');
        const packed = updated.filter((i) => i.isPacked).length;
        setPackingProgress(Math.round((packed / updated.length) * 100));
      }
    } catch (err) {
      console.error('Failed to add packing item:', err);
    }
  };

  const handleDeletePackingItem = async (itemId: string) => {
    if (!activeTrip) return;
    try {
      await api.delete(`/traveler-tools/packing/trip/${activeTrip._id}/${itemId}`);
      const updated = packingItems.filter((i) => i._id !== itemId);
      setPackingItems(updated);
      const packed = updated.filter((i) => i.isPacked).length;
      setPackingProgress(updated.length > 0 ? Math.round((packed / updated.length) * 100) : 0);
    } catch (err) {
      console.error('Failed to delete packing item:', err);
    }
  };

  // --- Transit Handlers ---
  const handleTransitStatusChange = async (itemId: string, status: string, delayMinutes: number = 0) => {
    if (!activeTrip) return;
    try {
      const res = await api.patch<TransitItem>(
        `/traveler-tools/transit/trip/${activeTrip._id}/${itemId}/status`,
        { status, delayMinutes }
      );
      if (res.success && res.data) {
        setTransits(transits.map((t) => (t._id === itemId ? res.data : t)));
      }
    } catch (err) {
      console.error('Failed to update transit status:', err);
    }
  };

  const handleDeleteTransit = async (itemId: string) => {
    if (!activeTrip) return;
    try {
      await api.delete(`/traveler-tools/transit/trip/${activeTrip._id}/${itemId}`);
      setTransits(transits.filter((t) => t._id !== itemId));
    } catch (err) {
      console.error('Failed to delete transit segment:', err);
    }
  };

  const handleAddTransit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newCarrier.trim() || !newCode.trim() || !newDepCity.trim() || !newArrCity.trim()) return;
    try {
      const res = await api.post<TransitItem>(
        `/traveler-tools/transit/trip/${activeTrip._id}`,
        {
          type: newTransitType,
          carrier: newCarrier.trim(),
          code: newCode.trim().toUpperCase(),
          departureCity: newDepCity.trim(),
          arrivalCity: newArrCity.trim(),
          departureTime: new Date().toISOString(),
          arrivalTime: new Date().toISOString(),
          status: 'ON_TIME',
          delayMinutes: 0,
          gate: newGate.trim(),
          seat: newSeat.trim(),
        }
      );
      if (res.success && res.data) {
        setTransits([...transits, res.data]);
        setShowAddTransitModal(false);
        setNewCarrier('');
        setNewCode('');
        setNewDepCity('');
        setNewArrCity('');
        setNewGate('');
        setNewSeat('');
      }
    } catch (err) {
      console.error('Failed to add transit item:', err);
    }
  };

  // --- Group Collaboration Handlers ---
  const handleAddGroupMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newMemberName.trim() || !newMemberEmail.trim()) return;
    setGroupError(null);
    try {
      const divisor = getCurrencyDivisor(activeTrip.currency);
      const contributedMinor = Math.round(Number(newMemberContributionMajor || 0) * divisor);

      const res = await api.post<any>(
        `/traveler-tools/group/trip/${activeTrip._id}/member`,
        {
          name: newMemberName.trim(),
          email: newMemberEmail.trim(),
          role: newMemberRole,
          sharePercentage: Number(newMemberSharePct) || 25,
          contributedAmountMinor: contributedMinor,
        }
      );
      if (res.success) {
        setShowAddMemberModal(false);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberContributionMajor(0);
        await refreshGroupData();
      }
    } catch (err: any) {
      console.error('Failed to add group member:', err);
      setGroupError(err.message || 'Failed to add group member');
    }
  };

  const handleOpenEditMember = (m: GroupMemberData) => {
    const divisor = getCurrencyDivisor(activeTrip?.currency || 'INR');
    setGroupError(null);
    setEditingMember(m);
    setEditMemberSharePct(m.sharePercentage);
    setEditMemberContributionMajor(m.contributedMinor / divisor);
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !editingMember) return;
    setGroupError(null);
    try {
      const divisor = getCurrencyDivisor(activeTrip.currency);
      const contributedAmountMinor = Math.round(Number(editMemberContributionMajor || 0) * divisor);

      const res = await api.put<any>(
        `/traveler-tools/group/trip/${activeTrip._id}/member/${editingMember.memberId}`,
        {
          sharePercentage: Number(editMemberSharePct),
          contributedAmountMinor,
        }
      );
      if (res.success) {
        setEditingMember(null);
        await refreshGroupData();
      }
    } catch (err: any) {
      console.error('Failed to update group member:', err);
      setGroupError(err.message || 'Failed to update group member');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!activeTrip) return;
    if (!confirm('Are you sure you want to remove this traveler from the group?')) return;
    setGroupError(null);
    try {
      const res = await api.delete(`/traveler-tools/group/trip/${activeTrip._id}/member/${memberId}`);
      if (res.success) {
        await refreshGroupData();
      }
    } catch (err: any) {
      console.error('Failed to remove group member:', err);
      setGroupError(err.message || 'Failed to remove group member');
    }
  };

  const currency = activeTrip?.currency || 'INR';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Traveler Intelligence Suite
            </span>
            <span className="text-xs text-slate-500 font-medium">TripGuard Companion</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Traveler Tools & Trip Collaboration
          </h1>
          <p className="text-xs text-slate-500">
            {activeTrip?.name || 'Selected Trip'} • Secure document storage, dynamic weather packing, group expense splitting, and eco emissions.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('VAULT')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'VAULT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Vault ({docs.length})
          </button>
          <button
            onClick={() => setActiveTab('PACKING')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'PACKING' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Packing ({packingProgress}%)
          </button>
          <button
            onClick={() => setActiveTab('TRANSIT')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'TRANSIT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-blue-600" />
            Flights & Rail ({transits.length})
          </button>
          <button
            onClick={() => setActiveTab('GROUP')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'GROUP' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Group Split ({groupMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('ECO')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'ECO' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            Eco Carbon
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-xs text-slate-500 animate-pulse">Syncing traveler intelligence data...</p>
        </div>
      )}

      {/* TAB 1: DOCUMENT VAULT */}
      {!isLoading && activeTab === 'VAULT' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Travel Document Vault & Booking Reference Manager</h2>
              <p className="text-xs text-slate-500">Boarding passes, reservation vouchers, and travel insurance stored with multi-tenant access control.</p>
            </div>
            <button
              onClick={() => setShowAddDocModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Document
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <div
                key={doc._id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                      {doc.category}
                    </span>
                    <button
                      onClick={() => handleDeleteDoc(doc._id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-2">{doc.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{doc.fileName} • {doc.fileSize}</p>
                  {doc.notes && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg mt-2 border border-slate-100">
                      {doc.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-400">Ref: {doc.bookingRef || 'None'}</span>
                  <button
                    onClick={() => setViewingDoc(doc)}
                    className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Document Modal */}
          {showAddDocModal && (
            <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Add Travel Document</h3>
                  <button
                    onClick={() => setShowAddDocModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleAddDoc} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Document Title</label>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="e.g. Express Train Voucher / Flight Ticket"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                    <select
                      value={newDocCategory}
                      onChange={(e) => setNewDocCategory(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="FLIGHT">Flight / Airline Ticket</option>
                      <option value="HOTEL">Hotel / Accommodation Voucher</option>
                      <option value="INSURANCE">Insurance Policy</option>
                      <option value="VISA">Visa / Embassy Document</option>
                      <option value="PASS">Transit Pass</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Booking / Confirmation Ref</label>
                    <input
                      type="text"
                      value={newDocBookingRef}
                      onChange={(e) => setNewDocBookingRef(e.target.value)}
                      placeholder="e.g. BKG-99214-X"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Instructions</label>
                    <input
                      type="text"
                      value={newDocNotes}
                      onChange={(e) => setNewDocNotes(e.target.value)}
                      placeholder="e.g. Non-refundable, show QR code at gate"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAddDocModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                    >
                      Save Document
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Document Modal */}
          {viewingDoc && (
            <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{viewingDoc.title}</h3>
                      <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {viewingDoc.category}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingDoc(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">File Name:</span>
                    <span className="font-semibold text-slate-800">{viewingDoc.fileName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">File Size:</span>
                    <span className="font-semibold text-slate-800">{viewingDoc.fileSize}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Booking Reference:</span>
                    <span className="font-mono font-bold text-slate-800">{viewingDoc.bookingRef || 'None'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Access Control:</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Multi-Tenant Isolated
                    </span>
                  </div>
                </div>

                {viewingDoc.notes && (
                  <div className="text-xs bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-amber-900">
                    <strong className="block text-[11px] mb-0.5">Notes:</strong>
                    {viewingDoc.notes}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setViewingDoc(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `TripGuard Travel Document Record (Vault Reference)\nTitle: ${viewingDoc.title}\nCategory: ${viewingDoc.category}\nBooking Ref: ${viewingDoc.bookingRef || 'None'}\nFile Name: ${viewingDoc.fileName}\nNotes: ${viewingDoc.notes || 'None'}\nExported At: ${new Date().toISOString()}`;
                      const blob = new Blob([text], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${viewingDoc.fileName.replace(/\.pdf$/i, '')}-record.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Record Details (.txt)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SMART PACKING ASSISTANT */}
      {!isLoading && activeTab === 'PACKING' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Weather-Adaptive Packing Checklist</h2>
              <p className="text-xs text-slate-500">Automatically incorporates meteorological forecast for {activeTrip?.destination || 'your destination'} and outdoor protection.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${packingProgress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-700">{packingProgress}% Packed</span>
            </div>
          </div>

          {/* Add item bar */}
          <form onSubmit={handleAddPackingItem} className="flex gap-2">
            <input
              type="text"
              value={newPackingName}
              onChange={(e) => setNewPackingName(e.target.value)}
              placeholder="Add packing item..."
              className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={newPackingCategory}
              onChange={(e) => setNewPackingCategory(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="ESSENTIALS">Essentials</option>
              <option value="CLOTHING">Clothing</option>
              <option value="ELECTRONICS">Electronics</option>
              <option value="WEATHER_SPECIFIC">Weather-Specific</option>
              <option value="HEALTH">Health & Care</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shrink-0"
            >
              Add
            </button>
          </form>

          {/* Packing checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {packingItems.map((item) => (
              <div
                key={item._id}
                onClick={() => handleTogglePacking(item._id)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  item.isPacked
                    ? 'border-emerald-200 bg-emerald-50/40 text-slate-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      item.isPacked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {item.isPacked && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span
                      className={`text-xs font-medium ${
                        item.isPacked ? 'line-through text-slate-400' : 'text-slate-900 font-semibold'
                      }`}
                    >
                      {item.name}
                    </span>
                    {item.isRecommendedByWeather && (
                      <span className="ml-2 text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                        🌧️ Weather Alert
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">
                    {item.category}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePackingItem(item._id);
                    }}
                    className="text-slate-300 hover:text-red-500 p-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FLIGHT & RAIL TRANSIT INTELLIGENCE */}
      {!isLoading && activeTab === 'TRANSIT' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Flight & Rail Transit Intelligence</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  Manual Verified Tracker
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative schedule monitoring, terminals, gate tracking, and delay alerts for flights, express rail, and connections.
              </p>
            </div>
            <button
              onClick={() => setShowAddTransitModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Log Transit Segment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transits.map((item) => (
              <div
                key={item._id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      {item.type === 'FLIGHT' ? (
                        <Plane className="w-4 h-4" />
                      ) : (
                        <Train className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                        {item.type} • {item.code}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900">{item.carrier}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(e) => handleTransitStatusChange(item._id, e.target.value)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                        item.status === 'ON_TIME'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : item.status === 'DELAYED'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : item.status === 'CANCELLED'
                          ? 'bg-red-50 text-red-800 border-red-300'
                          : 'bg-blue-50 text-blue-800 border-blue-300'
                      }`}
                    >
                      <option value="ON_TIME">🟢 On Time</option>
                      <option value="DELAYED">🟡 Delayed</option>
                      <option value="BOARDING">🔵 Boarding</option>
                      <option value="ARRIVED">⚪ Arrived</option>
                      <option value="CANCELLED">🔴 Cancelled</option>
                    </select>

                    <button
                      onClick={() => handleDeleteTransit(item._id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Remove record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl space-y-2 text-xs border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Origin</span>
                      <strong className="text-slate-800">{item.departureCity}</strong>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Destination</span>
                      <strong className="text-slate-800">{item.arrivalCity}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Terminal</span>
                      <span className="font-semibold text-slate-700">{item.terminal || 'Main'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Gate</span>
                      <span className="font-semibold text-slate-700">{item.gate || 'TBA'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Seat</span>
                      <span className="font-semibold text-slate-700">{item.seat || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-[11px] text-slate-500 italic">
                    ℹ️ {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Add Transit Modal */}
          {showAddTransitModal && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h3 className="text-sm font-bold text-slate-900">Log Flight or Train Segment</h3>
                  <button
                    onClick={() => setShowAddTransitModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAddTransit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Transit Type
                      </label>
                      <select
                        value={newTransitType}
                        onChange={(e) => setNewTransitType(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      >
                        <option value="FLIGHT">Flight</option>
                        <option value="TRAIN">Train / Rail</option>
                        <option value="BUS">Bus / Coach</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Code / Flight #
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. NH 827"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Carrier Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. All Nippon Airways / SNCF"
                      value={newCarrier}
                      onChange={(e) => setNewCarrier(e.target.value)}
                      className="w-full text-xs px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Departure City / Station
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Origin"
                        value={newDepCity}
                        onChange={(e) => setNewDepCity(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Arrival City / Station
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Destination"
                        value={newArrCity}
                        onChange={(e) => setNewArrCity(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Gate
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Gate 18"
                        value={newGate}
                        onChange={(e) => setNewGate(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Seat
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 24K"
                        value={newSeat}
                        onChange={(e) => setNewSeat(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAddTransitModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm"
                    >
                      Save Segment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GROUP TRAVEL & SPLIT LEDGER */}
      {!isLoading && activeTab === 'GROUP' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Group Travel & Expense Splitter</h2>
              <p className="text-xs text-slate-500">Fair cost distribution and net settlement balances.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Total Group Expenses</span>
                <div className="text-base font-black text-slate-900">
                  {formatCurrency(totalExpensesMinor, currency)}
                </div>
              </div>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Co-Traveler
              </button>
            </div>
          </div>

          {groupError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
              <span>⚠️ {groupError}</span>
              <button onClick={() => setGroupError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">
                ✕
              </button>
            </div>
          )}

          <div className="space-y-3">
            {groupMembers.map((m) => (
              <div
                key={m.memberId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">{m.name}</h3>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                      {m.role}
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                      {m.sharePercentage}% Share
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                    <span>Paid: <strong>{formatCurrency(m.contributedMinor, currency)}</strong></span>
                    <span>•</span>
                    <span>Fair Share: <strong>{formatCurrency(m.fairShareMinor, currency)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    {m.balanceMinor >= 0 ? (
                      <div>
                        <span className="text-xs font-bold text-emerald-600 block">
                          Gets Back {formatCurrency(m.balanceMinor, currency)}
                        </span>
                        <span className="text-[10px] text-slate-400">Creditor</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-amber-600 block">
                          Owes {formatCurrency(Math.abs(m.balanceMinor), currency)}
                        </span>
                        <span className="text-[10px] text-slate-400">Needs Settlement</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 border-l pl-3 border-slate-200">
                    <button
                      onClick={() => handleOpenEditMember(m)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white transition-all"
                      title="Edit member share or contribution"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {m.role !== 'LEAD_ORGANIZER' && (
                      <button
                        onClick={() => handleDeleteMember(m.memberId)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white transition-all"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Co-Traveler Modal */}
          {showAddMemberModal && (
            <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h3 className="text-sm font-bold text-slate-900">Add Co-Traveler to Group</h3>
                  <button
                    onClick={() => setShowAddMemberModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddGroupMember} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Lee"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. jordan@travel.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Trip Role</label>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      >
                        <option value="CO_TRAVELER">Co-Traveler</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Share Percentage (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newMemberSharePct}
                        onChange={(e) => setNewMemberSharePct(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Initial Contribution ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={newMemberContributionMajor || ''}
                      onChange={(e) => setNewMemberContributionMajor(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border rounded-lg"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Amount already paid toward group bookings or activities.</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Add Member
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Member Modal */}
          {editingMember && (
            <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Update Contribution & Split</h3>
                    <p className="text-xs text-slate-500">{editingMember.name}</p>
                  </div>
                  <button
                    onClick={() => setEditingMember(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditMember} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Split Share Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editMemberSharePct}
                      onChange={(e) => setEditMemberSharePct(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Total Contributed Amount ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editMemberContributionMajor || ''}
                      onChange={(e) => setEditMemberContributionMajor(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Update Member
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ECO & CARBON TRACKER */}
      {!isLoading && activeTab === 'ECO' && eco && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Carbon Footprint & Eco Travel Intelligence</h2>
              <p className="text-xs text-slate-500">Estimating environmental impact across flights, hotels, and ground mobility.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg">
                Eco Rating: {eco.ecoRating}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500">Estimated Total Emissions</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {eco.totalEmissionsKg} <span className="text-sm font-semibold text-slate-500">kg CO2</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
              <span className="text-xs text-emerald-800 font-semibold">Green Recovery Savings</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                -{eco.greenSavingsPossibleKg} <span className="text-sm font-semibold text-emerald-600">kg CO2</span>
              </div>
              <p className="text-[10px] text-emerald-800 mt-1">
                {eco.recommendationText || 'By choosing energy-efficient rail or public transit over private vehicle hire.'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500">Estimated Carbon Offset Cost</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(eco.carbonOffsetCostMinor, currency)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Standard international reforestation benchmark (~$0.015/kg).</p>
            </div>
          </div>

          {/* Breakdown Progress Bars */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-700">Emissions by Category</h3>
            {eco.breakdown.map((b) => (
              <div key={b.category} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>{b.category}</span>
                  <span>{b.emissionsKg} kg ({b.percentage}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${b.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Methodology Disclosure Note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 block mb-0.5">Statistical Estimation Methodology</span>
            {eco.metadata?.methodologyNotes || 'Estimates are derived from DEFRA & ICAO benchmark carbon intensity coefficients (185 kg/flight segment, 12.5 kg/hotel night, 4.5 kg/local transit day). Not verified by third-party sensor telemetry.'}
          </div>
        </div>
      )}
    </div>
  );
};
