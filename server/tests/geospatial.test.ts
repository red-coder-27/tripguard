import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistanceKm,
  analyzeDayBacktracking,
  compareTransportModes,
} from '../src/geospatial/geoService.js';
import { IItineraryItem } from '../src/models/ItineraryItem.js';

describe('GeoGuard Geospatial Engine Suite', () => {
  it('accurately computes Haversine distances between coordinates', () => {
    // Distance between Shinjuku (35.6938, 139.7034) and Shibuya (35.6585, 139.7022) is ~3.9 km
    const dist = calculateHaversineDistanceKm(35.6938, 139.7034, 35.6585, 139.7022);
    expect(dist).toBeGreaterThan(3.5);
    expect(dist).toBeLessThan(4.5);
  });

  it('detects route backtracking when sequential items zigzag across distant districts', () => {
    // Day with zigzag: Shinjuku -> Toyosu (east) -> Shinjuku (west) -> Asakusa (north-east)
    const mockItems = [
      {
        title: 'Shinjuku Morning',
        dayNumber: 3,
        latitude: 35.6938,
        longitude: 139.7034,
        isRemoved: false,
      },
      {
        title: 'Toyosu Digital Art',
        dayNumber: 3,
        latitude: 35.6491,
        longitude: 139.7898,
        isRemoved: false,
      },
      {
        title: 'Shinjuku Izakaya Dinner',
        dayNumber: 3,
        latitude: 35.6929,
        longitude: 139.6997,
        isRemoved: false,
      },
      {
        title: 'Asakusa Night Stroll',
        dayNumber: 3,
        latitude: 35.7148,
        longitude: 139.7967,
        isRemoved: false,
      },
    ] as IItineraryItem[];

    const report = analyzeDayBacktracking(3, mockItems);
    expect(report.dayNumber).toBe(3);
    expect(report.totalDistanceKm).toBeGreaterThan(20);
    expect(report.hasBacktracking).toBe(true);
    expect(report.excessDistanceKm).toBeGreaterThan(3.5);
    expect(report.estimatedExtraMinutes).toBeGreaterThan(15);
  });

  it('generates multi-modal transit comparison for a given distance', () => {
    const comparison = compareTransportModes(8.5); // 8.5 km transit
    expect(comparison.length).toBe(4);

    const walking = comparison.find((c) => c.mode === 'WALKING')!;
    const metro = comparison.find((c) => c.mode === 'PUBLIC_TRANSIT')!;
    const taxi = comparison.find((c) => c.mode === 'TAXI_RIDESHARE')!;

    expect(walking.costMinor).toBe(0);
    expect(metro.costMinor).toBe(15000); // ₹150
    expect(taxi.costMinor).toBeGreaterThan(metro.costMinor);
    expect(taxi.carbonEmissionKg).toBeGreaterThan(metro.carbonEmissionKg);
  });
});
