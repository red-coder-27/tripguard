import { IAlternativeOption } from '../models/AlternativeOption.js';

export interface AlternativeCandidate {
  id: string;
  category: 'ACCOMMODATION' | 'TRANSPORT' | 'ACTIVITY';
  destination: string;
  name: string;
  provider: string;
  costMinor: number;
  tier: 'BUDGET' | 'STANDARD' | 'PREMIUM';
  rating: number;
  safetyCertified: boolean;
  distanceKmFromCenter: number;
  latitude?: number;
  longitude?: number;
  description: string;
  disruptionFactor: number; // 0 to 50
  cancellationTerms: string;
}

// Built-in catalog of vetted, safety-certified alternatives across key destinations
export const BUILTIN_ALTERNATIVES: AlternativeCandidate[] = [
  // Tokyo Alternatives
  {
    id: 'alt-tokyo-hotel-ryokan',
    category: 'ACCOMMODATION',
    destination: 'Tokyo, Japan',
    name: 'Asakusa Central Boutique Ryokan',
    provider: 'Asakusa Stays Inc.',
    costMinor: 850000, // ₹8,500 (replaces ₹12,000 hotel -> net saving ₹3,500)
    tier: 'STANDARD',
    rating: 4.8,
    safetyCertified: true,
    distanceKmFromCenter: 1.2,
    latitude: 35.7130,
    longitude: 139.7940,
    description: 'Highly rated traditional Japanese boutique inn with modern ensuite amenities, 2 mins from Ginza metro line.',
    disruptionFactor: 20,
    cancellationTerms: 'Free cancellation up to 48 hours prior',
  },
  {
    id: 'alt-tokyo-hotel-capsule',
    category: 'ACCOMMODATION',
    destination: 'Tokyo, Japan',
    name: 'First Cabin Smart Capsule Shinjuku',
    provider: 'First Cabin Hospitality',
    costMinor: 550000, // ₹5,500 (replaces ₹12,000 hotel -> net saving ₹6,500)
    tier: 'BUDGET',
    rating: 4.6,
    safetyCertified: true,
    distanceKmFromCenter: 0.5,
    latitude: 35.6920,
    longitude: 139.7010,
    description: 'First-class aviation-themed private compact cabin with sauna, coworking desk, and secure biometric luggage lockers.',
    disruptionFactor: 40,
    cancellationTerms: 'Free cancellation up to 24 hours prior',
  },
  {
    id: 'alt-tokyo-rail-express',
    category: 'TRANSPORT',
    destination: 'Tokyo, Japan',
    name: 'Keisei Skyliner Express Rail + 72h Tokyo Subway Pass',
    provider: 'Keisei Electric Railway',
    costMinor: 250000, // ₹2,500 (replaces ₹4,500 private VIP taxi -> net saving ₹2,000)
    tier: 'STANDARD',
    rating: 4.9,
    safetyCertified: true,
    distanceKmFromCenter: 0.0,
    latitude: 35.7135,
    longitude: 139.7770,
    description: '36-minute high-speed dedicated rail transfer directly into central Ueno with reserved plush seating and complimentary unlimited subway access.',
    disruptionFactor: 15,
    cancellationTerms: 'Fully refundable before first ticket scan',
  },
  {
    id: 'alt-tokyo-limousine-bus',
    category: 'TRANSPORT',
    destination: 'Tokyo, Japan',
    name: 'Narita Airport Direct Limousine Coach',
    provider: 'Airport Transport Service Co.',
    costMinor: 180000, // ₹1,800 (replaces ₹4,500 taxi -> net saving ₹2,700)
    tier: 'BUDGET',
    rating: 4.7,
    safetyCertified: true,
    distanceKmFromCenter: 0.0,
    latitude: 35.6895,
    longitude: 139.6917,
    description: 'Direct comfortable highway coach with dedicated luggage portering straight to major hotel doorsteps.',
    disruptionFactor: 25,
    cancellationTerms: 'Refundable with 10% processing fee',
  },
  {
    id: 'alt-tokyo-free-observatory',
    category: 'ACTIVITY',
    destination: 'Tokyo, Japan',
    name: 'Tokyo Metropolitan Government Building Observatory (Panoramic 45th Floor)',
    provider: 'Tokyo Metropolitan Government',
    costMinor: 0, // ₹0 Free (replaces ₹1,500 paid Shibuya Sky ticket -> net saving ₹1,500)
    tier: 'BUDGET',
    rating: 4.7,
    safetyCertified: true,
    distanceKmFromCenter: 0.8,
    latitude: 35.6896,
    longitude: 139.6921,
    description: 'Spectacular 202-meter high 360-degree panoramic view of Mount Fuji, Tokyo Skytree, and Shinjuku skyline with zero admission fee.',
    disruptionFactor: 15,
    cancellationTerms: 'No booking required, free public entry',
  },
  {
    id: 'alt-tokyo-shinjuku-gardens',
    category: 'ACTIVITY',
    destination: 'Tokyo, Japan',
    name: 'Shinjuku Gyoen National Garden Walking Tour',
    provider: 'Ministry of the Environment Japan',
    costMinor: 30000, // ₹300 (replaces ₹2,000 commercial walking tour -> net saving ₹1,700)
    tier: 'STANDARD',
    rating: 4.9,
    safetyCertified: true,
    distanceKmFromCenter: 1.0,
    latitude: 35.6852,
    longitude: 139.7100,
    description: 'Tranquil Imperial heritage gardens blending traditional Japanese, English landscape, and French formal styles.',
    disruptionFactor: 10,
    cancellationTerms: 'On-site ticket kiosk',
  },
];

