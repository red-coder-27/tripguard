import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  Compass,
  ArrowRight,
  Shield,
  Layers,
  Footprints,
  Train,
  Car,
  Leaf,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';

interface MapDataItem {
  _id: string;
  dayNumber: number;
  title: string;
  description: string;
  location: string;
  category: string;
  priority: string;
  estimatedCostMinor: number;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

interface BacktrackingReport {
  dayNumber: number;
  hasBacktracking: boolean;
  totalDistanceKm: number;
  excessDistanceKm: number;
  estimatedExtraMinutes: number;
  suggestedOptimalOrder: string[];
  explanation: string;
}

interface NearbyAlt {
  id: string;
  name: string;
  provider: string;
  category: string;
  tier: string;
  costMinor: number;
  costDisplay: string;
  distanceKm: number;
  rating: number;
  safetyCertified: boolean;
  cancellationTerms: string;
  description: string;
}

interface TransportOption {
  mode: string;
  title: string;
  costMinor: number;
  costDisplay: string;
  durationMinutes: number;
  carbonEmissionKg: number;
  convenienceRating: number;
  recommendedFor: string;
}

export const TripMapPage: React.FC = () => {
  const { activeTrip } = useTrip();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const [items, setItems] = useState<MapDataItem[]>([]);
  const [backtrackingReports, setBacktrackingReports] = useState<BacktrackingReport[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | 'ALL'>('ALL');
  const [activeItem, setActiveItem] = useState<MapDataItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Nearby Alternatives state
  const [nearbyAlts, setNearbyAlts] = useState<NearbyAlt[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);
  const [showNearbyModal, setShowNearbyModal] = useState<boolean>(false);

  // Transport comparator state
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  const [showTransitDrawer, setShowTransitDrawer] = useState<boolean>(false);
  const [transitDistanceKm, setTransitDistanceKm] = useState<number>(6.5);

  useEffect(() => {
    if (!activeTrip) return;

    const fetchMapData = async () => {
      try {
        setIsLoading(true);
        const res = await api.get<{
          items: MapDataItem[];
          backtrackingReports: BacktrackingReport[];
        }>(`/geo/trip/${activeTrip._id}/map-data`);

        if (res.success && res.data) {
          setItems(res.data.items);
          setBacktrackingReports(res.data.backtrackingReports);
        }
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapData();
  }, [activeTrip]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Tokyo central coordinates
      const map = L.map(mapContainerRef.current, {
        center: [35.6895, 139.7005],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Route Polyline when items or selectedDay changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    const filteredItems = items.filter((item) => {
      if (selectedDay !== 'ALL' && item.dayNumber !== selectedDay) return false;
      return typeof item.latitude === 'number' && typeof item.longitude === 'number';
    });

    if (filteredItems.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    filteredItems.forEach((item, idx) => {
      const lat = item.latitude!;
      const lng = item.longitude!;
      latLngs.push([lat, lng]);

      const isMustDo = item.priority === 'MUST_DO';

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            background: ${isMustDo ? '#059669' : '#2563EB'};
            color: white;
            font-weight: 700;
            font-size: 11px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersLayer);

      marker.bindPopup(`
        <div style="font-family: inherit; min-width: 200px; padding: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase;">
            Day ${item.dayNumber} • ${item.category}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #101B2D; margin: 2px 0 4px;">
            ${item.title}
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">
            ${item.location || item.formattedAddress || 'Central Tokyo'}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 6px; font-size: 11px;">
            <span style="font-weight: 700; color: #101B2D;">₹${(item.estimatedCostMinor / 100).toLocaleString()}</span>
            <span style="background: ${isMustDo ? '#ECFDF5' : '#F1F5F9'}; color: ${isMustDo ? '#059669' : '#475569'}; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
              ${item.priority}
            </span>
          </div>
        </div>
      `);

      marker.on('click', () => {
        setActiveItem(item);
      });
    });

    // Draw route connecting line
    if (latLngs.length > 1) {
      routeLayerRef.current = L.polyline(latLngs, {
        color: '#059669',
        weight: 3.5,
        opacity: 0.8,
        dashArray: '6, 8',
      }).addTo(map);
    }

    // Fit map bounds to encompass all visible markers
    const group = L.featureGroup(markersLayer.getLayers() as L.Layer[]);
    map.fitBounds(group.getBounds().pad(0.18));
  }, [items, selectedDay]);

  const handleOpenNearby = async (item: MapDataItem) => {
    setActiveItem(item);
    setIsLoadingNearby(true);
    setShowNearbyModal(true);
    try {
      const res = await api.get<NearbyAlt[]>(
        `/geo/nearby?lat=${item.latitude || 35.6938}&lng=${item.longitude || 139.7034}&radius=8&category=${item.category}`
      );
      if (res.success && res.data) {
        setNearbyAlts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  const handleOpenTransitCompare = async (distKm: number = 6.5) => {
    setTransitDistanceKm(distKm);
    setShowTransitDrawer(true);
    try {
      const res = await api.get<{ options: TransportOption[] }>(
        `/geo/transit-compare?distanceKm=${distKm}`
      );
      if (res.success && res.data) {
        setTransportOptions(res.data.options);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const currentDayBacktracking = backtrackingReports.find(
    (r) => selectedDay === 'ALL' ? r.hasBacktracking : r.dayNumber === selectedDay && r.hasBacktracking
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 border border-emerald-200">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              GeoGuard Intelligence
            </span>
            <span className="text-xs text-slate-500 font-medium">OSM Vector Engine</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Trip Route & Geospatial Awareness
          </h1>
          <p className="text-xs text-slate-500">
            {activeTrip?.name || 'Tokyo Autumn Discovery 2026'} • Visualizing waypoint coordinates, transit efficiency, and nearby recovery hubs.
          </p>
        </div>

        {/* Day Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedDay('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedDay === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Days ({items.length})
          </button>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedDay === d
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Day {d}
            </button>
          ))}
        </div>
      </div>

      {/* Backtracking Detection Warning Banner */}
      {currentDayBacktracking && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Geographical Backtracking Detected (Day {currentDayBacktracking.dayNumber})
              </h3>
              <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded">
                +{currentDayBacktracking.excessDistanceKm} km excess
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {currentDayBacktracking.explanation}
            </p>
            <div className="mt-2 text-xs text-amber-900 font-semibold flex items-center gap-2">
              <span>Suggested linear order:</span>
              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-mono">
                {currentDayBacktracking.suggestedOptimalOrder.join(' ➔ ')}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleOpenTransitCompare(currentDayBacktracking.totalDistanceKm)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shrink-0 shadow-sm transition-colors"
          >
            Compare Transit
          </button>
        </div>
      )}

      {/* Main Grid: Map (Left 2 cols) + Waypoint List (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[580px] relative">
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs font-medium z-10">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Interactive Leaflet Map • {selectedDay === 'ALL' ? 'Complete Route' : `Day ${selectedDay} Path`}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Must-Do
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Flexible
              </span>
            </div>
          </div>

          <div ref={mapContainerRef} className="flex-1 w-full h-full" />

          {/* Quick Floating Action on Map */}
          <div className="absolute bottom-4 left-4 z-[500] bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-lg text-xs flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-700 font-medium">Click any pin to inspect or find nearby budget alternatives</span>
          </div>
        </div>

        {/* Waypoints & Activity Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Waypoints ({selectedDay === 'ALL' ? items.length : items.filter((i) => i.dayNumber === selectedDay).length})
            </h2>
            <button
              onClick={() => handleOpenTransitCompare(8.5)}
              className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1"
            >
              Transit Matrix <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
            {items
              .filter((i) => (selectedDay === 'ALL' ? true : i.dayNumber === selectedDay))
              .map((item, idx) => {
                const isSelected = activeItem?._id === item._id;
                const isMustDo = item.priority === 'MUST_DO';

                return (
                  <div
                    key={item._id}
                    onClick={() => setActiveItem(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {item.location || item.formattedAddress || 'Tokyo Central'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-900 shrink-0">
                        ₹{(item.estimatedCostMinor / 100).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                          Day {item.dayNumber}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            isMustDo
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNearby(item);
                        }}
                        className="text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1"
                      >
                        Nearby Alts <Sparkles className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Nearby Alternatives Modal */}
      {showNearbyModal && activeItem && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  GeoGuard Proximity Engine
                </span>
                <h3 className="text-base font-bold">
                  Verified Alternatives near {activeItem.title}
                </h3>
              </div>
              <button
                onClick={() => setShowNearbyModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Showing safety-certified and verified alternatives within 8 km radius of {activeItem.location || 'selected district'}.
              </p>

              {isLoadingNearby ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Searching verified options...</span>
                </div>
              ) : nearbyAlts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No catalog alternatives in immediate radius.
                </div>
              ) : (
                nearbyAlts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{alt.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                          {alt.tier}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          ★ {alt.rating}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{alt.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600">
                        <span>Distance: <strong>{alt.distanceKm} km</strong></span>
                        <span>•</span>
                        <span>Policy: <strong className="text-emerald-700">{alt.cancellationTerms}</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900">{alt.costDisplay}</div>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                        Safety Certified
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transport Comparator Drawer / Modal */}
      {showTransitDrawer && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  Multi-Modal Mobility Intelligence
                </span>
                <h3 className="text-base font-bold">
                  Transit Cost & Carbon Emission Comparator
                </h3>
              </div>
              <button
                onClick={() => setShowTransitDrawer(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Evaluated Route Distance:</span>
                <span className="font-mono font-bold text-slate-900">{transitDistanceKm} km</span>
              </div>

              <div className="space-y-2.5">
                {transportOptions.map((opt) => (
                  <div
                    key={opt.mode}
                    className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                        {opt.mode === 'WALKING' && <Footprints className="w-4 h-4 text-emerald-600" />}
                        {opt.mode === 'PUBLIC_TRANSIT' && <Train className="w-4 h-4 text-blue-600" />}
                        {opt.mode === 'TAXI_RIDESHARE' && <Car className="w-4 h-4 text-amber-600" />}
                        {opt.mode === 'CAR_RENTAL' && <Navigation className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{opt.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> ~{opt.durationMinutes} mins
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-emerald-700 font-medium">
                            <Leaf className="w-3 h-3 text-emerald-600" /> {opt.carbonEmissionKg} kg CO2
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900">{opt.costDisplay}</div>
                      <span className="text-[10px] text-slate-500 block">{opt.recommendedFor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
