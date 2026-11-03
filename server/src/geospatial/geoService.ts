import { IItineraryItem } from '../models/ItineraryItem.js';
import { AlternativeOption, IAlternativeOption } from '../models/AlternativeOption.js';
import { BUILTIN_ALTERNATIVES } from '../recovery/alternativesCatalog.js';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DayBacktrackingAlert {
  dayNumber: number;
  hasBacktracking: boolean;
  totalDistanceKm: number;
  excessDistanceKm: number;
  estimatedExtraMinutes: number;
  suggestedOptimalOrder: string[];
  explanation: string;
}

export interface TransportComparisonOption {
  mode: 'WALKING' | 'PUBLIC_TRANSIT' | 'TAXI_RIDESHARE' | 'CAR_RENTAL';
  title: string;
  costMinor: number;
  costDisplay: string;
  durationMinutes: number;
  carbonEmissionKg: number;
  convenienceRating: number; // 1-5
  recommendedFor: string;
}

export interface NearbyAlternativeResult {
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

/**
 * Great-circle distance using Haversine formula (km)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Analyzes an itinerary day for inefficient zigzag routes (backtracking).
 */
export function analyzeDayBacktracking(
  dayNumber: number,
  items: IItineraryItem[]
): DayBacktrackingAlert {
  const geoItems = items.filter(
    (i) => !i.isRemoved && typeof i.latitude === 'number' && typeof i.longitude === 'number'
  );

  if (geoItems.length < 3) {
    return {
      dayNumber,
      hasBacktracking: false,
      totalDistanceKm: 0,
      excessDistanceKm: 0,
      estimatedExtraMinutes: 0,
      suggestedOptimalOrder: geoItems.map((i) => i.title),
      explanation: 'Optimal linear itinerary for day.',
    };
  }

  // Calculate current chronological distance
  let currentTotalKm = 0;
  for (let i = 0; i < geoItems.length - 1; i++) {
    const dist = calculateHaversineDistanceKm(
      geoItems[i].latitude!,
      geoItems[i].longitude!,
      geoItems[i + 1].latitude!,
      geoItems[i + 1].longitude!
    );
    currentTotalKm += dist;
  }

  // Compute 2-opt / nearest-neighbor simulated minimum distance
  const unvisited = [...geoItems];
  const optimalPath: IItineraryItem[] = [unvisited.shift()!];
  let optimalTotalKm = 0;

  while (unvisited.length > 0) {
    const current = optimalPath[optimalPath.length - 1];
    let nearestIndex = 0;
    let nearestDist = Infinity;

    for (let j = 0; j < unvisited.length; j++) {
      const d = calculateHaversineDistanceKm(
        current.latitude!,
        current.longitude!,
        unvisited[j].latitude!,
        unvisited[j].longitude!
      );
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = j;
      }
    }

    optimalTotalKm += nearestDist;
    optimalPath.push(unvisited.splice(nearestIndex, 1)[0]);
  }

  const excessDistanceKm = Math.max(0, Math.round((currentTotalKm - optimalTotalKm) * 10) / 10);
  const hasBacktracking = excessDistanceKm >= 3.5 && currentTotalKm >= 10;
  const estimatedExtraMinutes = Math.round(excessDistanceKm * 6); // ~6 mins per km in metropolitan transit

  return {
    dayNumber,
    hasBacktracking,
    totalDistanceKm: Math.round(currentTotalKm * 10) / 10,
    excessDistanceKm,
    estimatedExtraMinutes,
    suggestedOptimalOrder: optimalPath.map((i) => i.title),
    explanation: hasBacktracking
      ? `Detected ${excessDistanceKm} km of route zigzag across day ${dayNumber}. Grouping nearby sights in ${geoItems[0].location || 'district'} can save ~${estimatedExtraMinutes} mins.`
      : `Day ${dayNumber} route is geographically clustered and efficient (${Math.round(currentTotalKm)} km transit).`,
  };
}

/**
 * Find nearby vetted alternative experiences or accommodations within a radius (km).
 */
export async function findNearbyAlternatives(
  lat: number,
  lng: number,
  radiusKm: number = 8,
  category?: string
): Promise<NearbyAlternativeResult[]> {
  const dbAlts = await AlternativeOption.find({
    ...(category ? { category } : {}),
  }).lean();

  const results: NearbyAlternativeResult[] = [];

  for (const alt of dbAlts) {
    const altLat = alt.latitude || 35.6938; // Default Tokyo center if unset
    const altLng = alt.longitude || 139.7034;
    const dist = calculateHaversineDistanceKm(lat, lng, altLat, altLng);

    if (dist <= radiusKm) {
      results.push({
        id: alt._id.toString(),
        name: alt.name,
        provider: alt.provider,
        category: alt.category,
        tier: alt.tier,
        costMinor: alt.costMinor,
        costDisplay: `₹${(alt.costMinor / 100).toLocaleString()}`,
        distanceKm: dist,
        rating: alt.rating,
        safetyCertified: alt.safetyCertified,
        cancellationTerms: alt.cancellationTerms,
        description: alt.description,
      });
    }
  }

  // Fallback if DB query returned 0
  if (results.length === 0) {
    for (const b of BUILTIN_ALTERNATIVES) {
      results.push({
        id: b.id,
        name: b.name,
        provider: b.provider,
        category: b.category,
        tier: b.tier,
        costMinor: b.costMinor,
        costDisplay: `₹${(b.costMinor / 100).toLocaleString()}`,
        distanceKm: b.distanceKmFromCenter,
        rating: b.rating,
        safetyCertified: b.safetyCertified,
        cancellationTerms: b.cancellationTerms,
        description: b.description,
      });
    }
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Compare multi-modal transport options for a given distance in km.
 */
export function compareTransportModes(distanceKm: number): TransportComparisonOption[] {
  const safeDist = Math.max(0.5, distanceKm);

  return [
    {
      mode: 'WALKING',
      title: 'Pedestrian Walking Route',
      costMinor: 0,
      costDisplay: '₹0 (Free)',
      durationMinutes: Math.round(safeDist * 12),
      carbonEmissionKg: 0,
      convenienceRating: safeDist <= 2 ? 5 : 2,
      recommendedFor: 'Short scenic distances under 2.5 km',
    },
    {
      mode: 'PUBLIC_TRANSIT',
      title: 'Metro / Subway Pass Transit',
      costMinor: 15000, // ₹150
      costDisplay: '₹150',
      durationMinutes: Math.round(safeDist * 3.5 + 8),
      carbonEmissionKg: Math.round(safeDist * 0.035 * 100) / 100,
      convenienceRating: 5,
      recommendedFor: 'Fastest & most cost-effective in Tokyo, Paris, London',
    },
    {
      mode: 'TAXI_RIDESHARE',
      title: 'On-Demand Taxi / Rideshare',
      costMinor: Math.round((400 + safeDist * 180) * 100),
      costDisplay: `₹${Math.round(400 + safeDist * 180).toLocaleString()}`,
      durationMinutes: Math.round(safeDist * 2.8 + 5),
      carbonEmissionKg: Math.round(safeDist * 0.17 * 100) / 100,
      convenienceRating: 4,
      recommendedFor: 'Heavy luggage or late-night departures',
    },
    {
      mode: 'CAR_RENTAL',
      title: 'Daily Rental Vehicle + Fuel',
      costMinor: 350000, // ₹3,500 daily amortized
      costDisplay: '₹3,500/day',
      durationMinutes: Math.round(safeDist * 3.0),
      carbonEmissionKg: Math.round(safeDist * 0.22 * 100) / 100,
      convenienceRating: 3,
      recommendedFor: 'Rural excursions and regional multi-city trips',
    },
  ];
}
