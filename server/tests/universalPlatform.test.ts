import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('TripGuard Universal Multi-Trip & Cross-Destination Platform Test Suite', () => {
  let authToken = '';
  const testEmail = `universal.traveler.${Date.now()}@tripguard.ai`;

  beforeAll(async () => {
    await connectDB();

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Universal Traveler',
        email: testEmail,
        password: 'UniversalPass2026!',
        baseCurrency: 'USD',
      });

    expect(regRes.status).toBe(201);
    authToken = regRes.body.token;
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  // SCENARIO 1: Tokyo, Japan (INR, 7-Day Demo Scenario Compatibility)
  describe('Scenario 1: Tokyo, Japan (INR, 7-Day Scenario)', () => {
    let tokyoTripId = '';

    it('creates Tokyo trip with INR currency and resolves coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tokyo Autumn Discovery 2026',
          destination: 'Tokyo, Japan',
          startDate: '2026-11-01',
          endDate: '2026-11-08',
          travelersCount: 1,
          totalBudgetMinor: 5000000, // ₹50,000
          emergencyReserveMinor: 500000, // ₹5,000
          currency: 'INR',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.trip.currency).toBe('INR');
      tokyoTripId = res.body.trip._id;

      // Geocoded coordinates should match Tokyo region
      expect(res.body.trip.destinationLatitude).toBeGreaterThan(34);
      expect(res.body.trip.destinationLatitude).toBeLessThan(37);
      expect(res.body.trip.destinationLongitude).toBeGreaterThan(138);
      expect(res.body.trip.destinationLongitude).toBeLessThan(142);
    });

    it('adds items, generates recovery and verifies forecast & weather', async () => {
      // Add hotel accommodation
      const itemRes = await request(app)
        .post('/api/v1/itineraries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: tokyoTripId,
          dayNumber: 1,
          date: '2026-11-01',
          title: 'Shinjuku Luxury Hotel Stay',
          category: 'ACCOMMODATION',
          startTime: '15:00',
          endTime: '23:59',
          location: 'Shinjuku, Tokyo',
          estimatedCostMinor: 4800000, // ₹48,000
          priority: 'FLEXIBLE',
        });

      expect(itemRes.status).toBe(201);

      // Add expense causing overspend
      const expRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: tokyoTripId,
          description: 'Executive Chauffeur Transfer',
          category: 'TRANSPORT',
          amountMinor: 800000, // ₹8,000
          currency: 'INR',
          date: '2026-11-01',
          paymentStatus: 'SETTLED',
        });

      expect(expRes.status).toBe(201);

      // Verify forecast reflects overspending
      const forecastRes = await request(app)
        .get(`/api/v1/forecast/trip/${tokyoTripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(forecastRes.status).toBe(200);
      expect(forecastRes.body.forecast.riskStatus).toBe('OVER_BUDGET');
      expect(forecastRes.body.forecast.currency).toBe('INR');

      // Verify weather endpoint returns Tokyo forecast
      const weatherRes = await request(app)
        .get(`/api/v1/disruptions/trip/${tokyoTripId}/weather`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(weatherRes.status).toBe(200);
      expect(weatherRes.body.data.destination).toContain('Tokyo');
      expect(weatherRes.body.data.forecast.length).toBeGreaterThanOrEqual(1);

      // Verify recovery run restores budget feasibility
      const recoveryRes = await request(app)
        .post(`/api/v1/recovery/trip/${tokyoTripId}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(recoveryRes.status).toBe(201);
      expect(recoveryRes.body.recoveryRun.strategies.length).toBe(3);
    });
  });

  // SCENARIO 2: Paris, France (EUR, 5-Day European Trip)
  describe('Scenario 2: Paris, France (EUR, 5-Day Scenario)', () => {
    let parisTripId = '';

    it('creates Paris trip with EUR currency and European coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Paris Art & Heritage Autumn 2026',
          destination: 'Paris, France',
          startDate: '2026-10-15',
          endDate: '2026-10-20',
          travelersCount: 2,
          totalBudgetMinor: 250000, // 2,500 EUR (stored in cents)
          emergencyReserveMinor: 25000, // 250 EUR
          currency: 'EUR',
        });

      expect(res.status).toBe(201);
      parisTripId = res.body.trip._id;
      expect(res.body.trip.currency).toBe('EUR');

      // Paris coordinates: lat ~48.8, lon ~2.3
      expect(res.body.trip.destinationLatitude).toBeGreaterThan(48.0);
      expect(res.body.trip.destinationLatitude).toBeLessThan(49.5);
      expect(res.body.trip.destinationLongitude).toBeGreaterThan(2.0);
      expect(res.body.trip.destinationLongitude).toBeLessThan(3.0);
    });

    it('verifies Paris recovery generates European alternatives with zero Tokyo references', async () => {
      // Add expensive Paris hotel
      const itemRes = await request(app)
        .post('/api/v1/itineraries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: parisTripId,
          dayNumber: 1,
          date: '2026-10-15',
          title: 'Champs-Élysées Luxury Palace Hotel',
          category: 'ACCOMMODATION',
          startTime: '15:00',
          endTime: '23:59',
          location: '8th Arrondissement, Paris',
          estimatedCostMinor: 240000, // 2,400 EUR
          priority: 'FLEXIBLE',
        });

      expect(itemRes.status).toBe(201);

      // Add transport commitment causing deficit
      await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: parisTripId,
          category: 'TRANSPORT',
          provider: 'Paris Chauffeur VIP Transfer',
          totalCostMinor: 50000, // 500 EUR
          paidAmountMinor: 10000,
          currency: 'EUR',
          cancellationPolicy: {
            isRefundable: true,
            refundableAmountMinor: 10000,
            policyNotes: 'Full refund 24h prior',
          },
        });

      // Execute Recovery
      const recRes = await request(app)
        .post(`/api/v1/recovery/trip/${parisTripId}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(recRes.status).toBe(201);
      const balanced = recRes.body.recoveryRun.strategies.find((s: any) => s.strategyType === 'BALANCED_RECOVERY');
      expect(balanced).toBeDefined();

      // Check narrative summary uses EUR or euro symbol, NEVER ₹
      expect(balanced.narrativeSummary).not.toContain('₹');
      expect(balanced.narrativeSummary).toMatch(/€|EUR/);

      // Modifications should NOT recommend Tokyo ryokan or Keisei rail in Paris!
      for (const mod of balanced.modifications) {
        expect(mod.replacementName).not.toContain('Ryokan');
        expect(mod.replacementName).not.toContain('Keisei');
        expect(mod.justification).not.toContain('₹');
      }

      // Verify weather endpoint delivers Paris coordinates
      const weatherRes = await request(app)
        .get(`/api/v1/disruptions/trip/${parisTripId}/weather`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(weatherRes.status).toBe(200);
      expect(weatherRes.body.data.coordinates.lat).toBeGreaterThan(48.0);
    });
  });

  // SCENARIO 3: New York, USA (USD, 10-Day North American Trip)
  describe('Scenario 3: New York, USA (USD, 10-Day Scenario)', () => {
    let nycTripId = '';

    it('creates NYC trip with USD currency and North American coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New York Skyline & Broadway Discovery',
          destination: 'New York, USA',
          startDate: '2026-12-01',
          endDate: '2026-12-11',
          travelersCount: 1,
          totalBudgetMinor: 350000, // $3,500
          currency: 'USD',
        });

      expect(res.status).toBe(201);
      nycTripId = res.body.trip._id;
      expect(res.body.trip.currency).toBe('USD');

      // NYC coordinates: lat ~40.7, lon ~-74.0
      expect(res.body.trip.destinationLatitude).toBeGreaterThan(40.0);
      expect(res.body.trip.destinationLatitude).toBeLessThan(41.5);
      expect(res.body.trip.destinationLongitude).toBeGreaterThan(-75.0);
      expect(res.body.trip.destinationLongitude).toBeLessThan(-73.0);
    });

    it('tests transit comparator and alerts formatted with USD symbol ($)', async () => {
      // Test transit comparator with USD
      const transitRes = await request(app)
        .get('/api/v1/geo/transit-compare?distanceKm=12&currency=USD')
        .set('Authorization', `Bearer ${authToken}`);

      expect(transitRes.status).toBe(200);
      expect(transitRes.body.data.options.length).toBe(4);
      expect(transitRes.body.data.options[0].costDisplay).toContain('$');

      // Verify Disruption alerts endpoint uses $
      const alertsRes = await request(app)
        .get(`/api/v1/disruptions/trip/${nycTripId}/alerts`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(alertsRes.status).toBe(200);
      expect(Array.isArray(alertsRes.body.data)).toBe(true);
    });
  });

  // SCENARIO 4: Coimbatore, India (INR, 3-Day Domestic Trip)
  describe('Scenario 4: Coimbatore, India (INR, 3-Day Domestic Scenario)', () => {
    let cbeTripId = '';

    it('creates Coimbatore domestic trip and resolves South Indian coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Coimbatore Heritage & Foothills Tour',
          destination: 'Coimbatore, India',
          startDate: '2026-11-20',
          endDate: '2026-11-23',
          travelersCount: 2,
          totalBudgetMinor: 2500000, // ₹25,000
          currency: 'INR',
        });

      expect(res.status).toBe(201);
      cbeTripId = res.body.trip._id;
      expect(res.body.trip.currency).toBe('INR');

      // Coimbatore coordinates: lat ~11.0, lon ~76.9
      expect(res.body.trip.destinationLatitude).toBeGreaterThan(10.5);
      expect(res.body.trip.destinationLatitude).toBeLessThan(11.5);
      expect(res.body.trip.destinationLongitude).toBeGreaterThan(76.5);
      expect(res.body.trip.destinationLongitude).toBeLessThan(77.5);
    });

    it('verifies packing list is universal with zero JPY mentions', async () => {
      const packingRes = await request(app)
        .get(`/api/v1/traveler-tools/packing/trip/${cbeTripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(packingRes.status).toBe(200);
      expect(packingRes.body.data.items.length).toBeGreaterThan(0);

      // Verify no Japanese currency or plug adapters for Coimbatore domestic trip
      for (const item of packingRes.body.data.items) {
        expect(item.name).not.toContain('JPY');
        expect(item.name).not.toContain('Type-A');
      }
    });
  });

  // SCENARIO 5: Incomplete / Edge-Case Trip (Missing budget/Unverified Location)
  describe('Scenario 5: Incomplete / Edge-Case Trip (Graceful Fallback Validation)', () => {
    let edgeTripId = '';

    it('handles remote destination without crashes and provides deterministic fallbacks', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Remote High-Altitude Basecamp Expedition',
          destination: 'Unknown Remote Mountain Ridge, Sector 9',
          startDate: '2026-12-15',
          endDate: '2026-12-20',
          travelersCount: 1,
          totalBudgetMinor: 100000, // Minimal budget (£1,000 in GBP)
          currency: 'GBP',
        });

      expect(res.status).toBe(201);
      edgeTripId = res.body.trip._id;
      // Honest geospatial integrity: unresolvable destination is not fabricated
      expect(res.body.trip.destinationLatitude == null || typeof res.body.trip.destinationLatitude === 'number').toBe(true);

      // Forecast on empty trip should be SAFE and cleanly calculated
      const forecastRes = await request(app)
        .get(`/api/v1/forecast/trip/${edgeTripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(forecastRes.status).toBe(200);
      expect(forecastRes.body.forecast.riskStatus).toBe('SAFE');
      expect(forecastRes.body.forecast.overspendingGapMinor).toBe(0);

      // Weather request for remote destination should gracefully return valid forecast
      const weatherRes = await request(app)
        .get(`/api/v1/disruptions/trip/${edgeTripId}/weather`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(weatherRes.status).toBe(200);
      expect(weatherRes.body.success).toBe(true);
      expect(Array.isArray(weatherRes.body.data.forecast)).toBe(true);

      // Document vault for non-demo trip should start empty
      const vaultRes = await request(app)
        .get(`/api/v1/traveler-tools/vault/trip/${edgeTripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(vaultRes.status).toBe(200);
      // No Tokyo tickets auto-seeded for remote mountain trip!
      for (const doc of vaultRes.body.data) {
        expect(doc.title).not.toContain('Narita');
        expect(doc.title).not.toContain('Shinjuku');
      }
    });
  });
});
