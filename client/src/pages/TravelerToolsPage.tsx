import React, { useEffect, useState } from 'react';
import {
  FileText,
  CheckSquare,
  Users,
  Leaf,
  Upload,
  Trash2,
  Download,
  Plus,
  ShieldCheck,
  Check,
  DollarSign,
  PieChart,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';

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
}

export const TravelerToolsPage: React.FC = () => {
  const { activeTrip } = useTrip();
  const [activeTab, setActiveTab] = useState<'VAULT' | 'PACKING' | 'GROUP' | 'ECO'>('VAULT');

  // Vault state
  const [docs, setDocs] = useState<TravelDoc[]>([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('HOTEL');
  const [showAddDocModal, setShowAddDocModal] = useState(false);

  // Packing state
  const [packingItems, setPackingItems] = useState<PackingItemData[]>([]);
  const [packingProgress, setPackingProgress] = useState(0);
  const [newPackingName, setNewPackingName] = useState('');
  const [newPackingCategory, setNewPackingCategory] = useState('ESSENTIALS');

  // Group state
  const [groupMembers, setGroupMembers] = useState<GroupMemberData[]>([]);
  const [totalExpensesMinor, setTotalExpensesMinor] = useState(0);

  // Eco state
  const [eco, setEco] = useState<EcoData | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeTrip) return;
    loadAllData();
  }, [activeTrip]);

  const loadAllData = async () => {
    if (!activeTrip) return;
    try {
      setIsLoading(true);
      const [vaultRes, packRes, groupRes, ecoRes] = await Promise.all([
        api.get<TravelDoc[]>(
          `/traveler-tools/vault/trip/${activeTrip._id}`
        ),
        api.get<{ items: PackingItemData[]; progressPercentage: number }>(
          `/traveler-tools/packing/trip/${activeTrip._id}`
        ),
        api.get<{ settlementSummary: GroupMemberData[]; totalExpensesMinor: number }>(
          `/traveler-tools/group/trip/${activeTrip._id}`
        ),
        api.get<EcoData>(
          `/traveler-tools/eco/trip/${activeTrip._id}`
        ),
      ]);

      if (vaultRes.success && vaultRes.data) setDocs(vaultRes.data);
      if (packRes.success && packRes.data) {
        setPackingItems(packRes.data.items);
        setPackingProgress(packRes.data.progressPercentage);
      }
      if (groupRes.success && groupRes.data) {
        setGroupMembers(groupRes.data.settlementSummary);
        setTotalExpensesMinor(groupRes.data.totalExpensesMinor);
      }
      if (ecoRes.success && ecoRes.data) setEco(ecoRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newDocTitle) return;
    try {
      const res = await api.post<TravelDoc>(
        `/traveler-tools/vault/trip/${activeTrip._id}`,
        {
          title: newDocTitle,
          category: newDocCategory,
          fileName: `${newDocTitle.replace(/\s+/g, '-')}.pdf`,
          fileSize: '190 KB',
        }
      );
      if (res.success && res.data) {
        setDocs([res.data, ...docs]);
        setNewDocTitle('');
        setShowAddDocModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!activeTrip) return;
    try {
      await api.delete(`/traveler-tools/vault/trip/${activeTrip._id}/${docId}`);
      setDocs(docs.filter((d) => d._id !== docId));
    } catch (err) {
      console.error(err);
    }
  };

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
      console.error(err);
    }
  };

  const handleAddPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !newPackingName) return;
    try {
      const res = await api.post<PackingItemData>(
        `/traveler-tools/packing/trip/${activeTrip._id}`,
        {
          name: newPackingName,
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
      console.error(err);
    }
  };

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
            {activeTrip?.name || 'Tokyo Autumn Discovery 2026'} • Secure document storage, dynamic weather packing, group expense splitting, and eco emissions.
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
            onClick={() => setActiveTab('GROUP')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'GROUP' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Group Split
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

      {/* TAB 1: DOCUMENT VAULT */}
      {activeTab === 'VAULT' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Encrypted Travel Document Vault</h2>
              <p className="text-xs text-slate-500">Boarding passes, hotel reservations, and emergency travel insurance stored securely.</p>
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
                  <a
                    href="#download"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`TripGuard: Downloading encrypted copy of ${doc.fileName}`);
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> View
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Add Document Modal */}
          {showAddDocModal && (
            <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Add Travel Document</h3>
                <form onSubmit={handleAddDoc} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Document Title</label>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="e.g. Kyoto Shinkansen Ticket"
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
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddDocModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                    >
                      Save Document
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SMART PACKING ASSISTANT */}
      {activeTab === 'PACKING' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Weather-Adaptive Packing Checklist</h2>
              <p className="text-xs text-slate-500">Automatically incorporates seasonal Tokyo autumn forecast and rain protection.</p>
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

                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GROUP TRAVEL & SPLIT LEDGER */}
      {activeTab === 'GROUP' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Group Travel & Expense Splitter</h2>
              <p className="text-xs text-slate-500">Fair cost distribution and net settlement balances.</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500">Total Group Expenses:</span>
              <div className="text-base font-black text-slate-900">
                ₹{(totalExpensesMinor / 100).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {groupMembers.map((m) => (
              <div
                key={m.memberId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                    <span>Paid: <strong>₹{(m.contributedMinor / 100).toLocaleString()}</strong></span>
                    <span>•</span>
                    <span>Fair Share: <strong>₹{(m.fairShareMinor / 100).toLocaleString()}</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  {m.balanceMinor >= 0 ? (
                    <div>
                      <span className="text-xs font-bold text-emerald-600 block">
                        Gets Back ₹{(m.balanceMinor / 100).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">Creditor</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-bold text-amber-600 block">
                        Owes ₹{(Math.abs(m.balanceMinor) / 100).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">Needs Settlement</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ECO & CARBON TRACKER */}
      {activeTab === 'ECO' && eco && (
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
              <p className="text-[10px] text-emerald-800 mt-1">By choosing Keisei Skyliner rail over private taxi.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500">Certified Carbon Offset</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{(eco.carbonOffsetCostMinor / 100).toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Gold Standard reforestation program.</p>
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
        </div>
      )}
    </div>
  );
};
