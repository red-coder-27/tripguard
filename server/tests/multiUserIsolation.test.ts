import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { GeoapifyProvider, isValidCoordinate } from '../src/providers/geoapify.provider.js';
import { FrankfurterProvider } from '../src/providers/frankfurter.provider.js';
import { formatCurrencyAmount, getMinorUnitDivisor, getCurrencyDecimals } from '../src/config/constants.js';

describe('TripGuard Multi-User Isolation & Universal Precision Verification Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let trip1Id: string; // User A - Tokyo, JPY (0 decimals)
  let trip2Id: string; // User A - Paris, EUR (2 decimals)
  let trip3Id: string; // User B - New York, USD (2 decimals)
  let item1Id: string;
  let booking1Id: string;
  let expense1Id: string;

  beforeAll(async () => {
    await connectDB();

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'User A Travel Alpha',
      email: `user.a.${Date.now()}@tripguard.test`,
      password: 'SecurePassword123!',
      baseCurrency: 'JPY',
    });
    expect(resA.status).toBe(201);
    userAToken = resA.body.token;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'User B Travel Beta',
      email: `user.b.${Date.now()}@tripguard.test`,
      password: 'SecurePassword123!',
      baseCurrency: 'USD',
    });
    expect(resB.status).toBe(201);
    userBToken = resB.body.token;
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Scenario 1 & 2: Trip Portfolio Creation & Independent Multi-Trip State', () => {
    it('creates Trip 1 for User A with JPY currency and 0-decimal integer budget', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Tokyo Tech & Culture Autumn 2026',
          destination: 'Tokyo, Japan',
          startDate: '2026-10-10',
          endDate: '2026-10-18',
          travelersCount: 2,
          totalBudgetMinor: 1500000, // ¥1,500,000 (0 decimal ISO 4217)
          emergencyReserveMinor: 150000,
          currency: 'JPY',
        });

      expect(res.status).toBe(201);
      expect(res.body.trip.currency).toBe('JPY');
      expect(res.body.trip.totalBudgetMinor).toBe(1500000);
      trip1Id = res.body.trip._id;
    });

    it('creates Trip 2 for User A with EUR currency', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Paris Spring Art Journey 2027',
          destination: 'Paris, France',
          startDate: '2027-04-01',
          endDate: '2027-04-07',
          travelersCount: 1,
          totalBudgetMinor: 400000, // 4,000.00 EUR (400,000 cents)
          emergencyReserveMinor: 40000,
          currency: 'EUR',
        });

      expect(res.status).toBe(201);
      expect(res.body.trip.currency).toBe('EUR');
      trip2Id = res.body.trip._id;
    });

    it('creates Trip 3 for User B with USD currency', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          name: 'Manhattan Architecture Week',
          destination: 'New York, USA',
          startDate: '2026-11-01',
          endDate: '2026-11-06',
          travelersCount: 1,
          totalBudgetMinor: 500000, // $5,000.00 USD (500,000 cents)
          currency: 'USD',
        });

      expect(res.status).toBe(201);
      expect(res.body.trip.currency).toBe('USD');
      trip3Id = res.body.trip._id;
    });
  });

  describe('Scenario 3: Portfolio Listing & Strict Tenant Isolation', () => {
    it('User A list returns exactly Trip 1 and Trip 2, never User B Trip 3', async () => {
      const res = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const tripIds = res.body.trips.map((t: any) => t._id);
      expect(tripIds).toContain(trip1Id);
      expect(tripIds).toContain(trip2Id);
      expect(tripIds).not.toContain(trip3Id);
    });

    it('User B list returns exactly Trip 3, never User A trips', async () => {
      const res = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      const tripIds = res.body.trips.map((t: any) => t._id);
      expect(tripIds).toContain(trip3Id);
      expect(tripIds).not.toContain(trip1Id);
      expect(tripIds).not.toContain(trip2Id);
    });
  });

  describe('Scenario 4, 5 & 6: Cross-User Trip Security Rejection', () => {
    it('User B cannot GET User A Trip 1 (returns 404 Not Found)', async () => {
      const res = await request(app)
        .get(`/api/v1/trips/${trip1Id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('User B cannot PUT User A Trip 1 (returns 404 Not Found)', async () => {
      const res = await request(app)
        .put(`/api/v1/trips/${trip1Id}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked Trip Title' });

      expect(res.status).toBe(404);
    });

    it('User B cannot DELETE User A Trip 1 (returns 404 Not Found)', async () => {
      const res = await request(app)
        .delete(`/api/v1/trips/${trip1Id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Scenario 7, 8 & 9: Sub-Resource (Itinerary, Booking, Expense) Isolation', () => {
    it('User A adds an itinerary item to Trip 1', async () => {
      const res = await request(app)
        .post('/api/v1/itineraries')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          tripId: trip1Id,
          dayNumber: 1,
          date: '2026-10-10',
          title: 'Akihabara Tech & Robotics District Exploration',
          category: 'ACTIVITY',
          estimatedCostMinor: 25000,
          priority: 'MUST_DO',
        });

      expect(res.status).toBe(201);
      item1Id = res.body.item._id;
    });

    it('User B cannot access User A itinerary items (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/itineraries/trip/${trip1Id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('User B cannot create an itinerary item pointing to User A trip (returns 404)', async () => {
      const res = await request(app)
        .post('/api/v1/itineraries')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          tripId: trip1Id,
          dayNumber: 1,
          date: '2026-10-10',
          title: 'Unauthorized Intrusion Item',
          category: 'ACTIVITY',
          estimatedCostMinor: 10000,
        });

      expect(res.status).toBe(404);
    });

    it('User A creates booking on Trip 1 and User B cannot access it', async () => {
      const resA = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          tripId: trip1Id,
          category: 'ACCOMMODATION',
          provider: 'Shinjuku Granbell Luxury Suites',
          bookingReference: 'SHJ-88192',
          totalCostMinor: 450000, // 450,000 JPY
          paidAmountMinor: 150000,
          currency: 'JPY',
          travelDate: '2026-10-10',
        });

      expect(resA.status).toBe(201);
      booking1Id = resA.body.booking._id;

      // User B attempts to read bookings
      const resB = await request(app)
        .get(`/api/v1/bookings/trip/${trip1Id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resB.status).toBe(404);

      // User B attempts to update booking directly
      const resBUpdate = await request(app)
        .put(`/api/v1/bookings/${booking1Id}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ provider: 'Compromised Provider' });

      expect(resBUpdate.status).toBe(403);
    });

    it('User A logs an expense on Trip 1 and User B cannot access it', async () => {
      const resA = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          tripId: trip1Id,
          description: 'Tsukiji Outer Market Sushi Lunch',
          category: 'FOOD_DINING',
          amountMinor: 8500, // ¥8,500 JPY
          currency: 'JPY',
          paymentStatus: 'SETTLED',
        });

      expect(resA.status).toBe(201);
      expense1Id = resA.body.expense._id;

      const resB = await request(app)
        .get(`/api/v1/expenses/trip/${trip1Id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resB.status).toBe(404);

      const resBDelete = await request(app)
        .delete(`/api/v1/expenses/${expense1Id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resBDelete.status).toBe(403);
    });
  });

  describe('Scenario 10: Multi-Currency & ISO 4217 Decimal Precision Isolation', () => {
    it('verifies ISO 4217 divisor calculation across zero-decimal, two-decimal, and three-decimal currencies', () => {
      expect(getCurrencyDecimals('JPY')).toBe(0);
      expect(getMinorUnitDivisor('JPY')).toBe(1);

      expect(getCurrencyDecimals('KRW')).toBe(0);
      expect(getMinorUnitDivisor('KRW')).toBe(1);

      expect(getCurrencyDecimals('KWD')).toBe(3);
      expect(getMinorUnitDivisor('KWD')).toBe(1000);

      expect(getCurrencyDecimals('USD')).toBe(2);
      expect(getMinorUnitDivisor('USD')).toBe(100);

      expect(getCurrencyDecimals('EUR')).toBe(2);
      expect(getMinorUnitDivisor('EUR')).toBe(100);

      expect(getCurrencyDecimals('INR')).toBe(2);
      expect(getMinorUnitDivisor('INR')).toBe(100);

      expect(getCurrencyDecimals('SGD')).toBe(2);
      expect(getMinorUnitDivisor('SGD')).toBe(100);

      expect(getCurrencyDecimals('AED')).toBe(2);
      expect(getMinorUnitDivisor('AED')).toBe(100);
    });

    it('formats currency amounts accurately with proper symbol and decimal placement', () => {
      expect(formatCurrencyAmount(1500000, 'JPY')).toBe('¥1,500,000');
      expect(formatCurrencyAmount(50000, 'INR')).toBe('₹500.00');
      expect(formatCurrencyAmount(12050, 'USD')).toBe('$120.50');
      expect(formatCurrencyAmount(450000, 'EUR')).toBe('€4,500.00');
    });

    it('computes isolated forecasts for Trip 1 (JPY) and Trip 2 (EUR) without ledger bleed', async () => {
      const forecast1Res = await request(app)
        .get(`/api/v1/forecast/trip/${trip1Id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(forecast1Res.status).toBe(200);
      expect(forecast1Res.body.forecast.currency).toBe('JPY');
      expect(forecast1Res.body.forecast.totalBudgetMinor).toBe(1500000);
      // Obligations: 450,000 booking + 8,500 standalone expense + 25,000 future estimate = 483,500 JPY
      expect(forecast1Res.body.forecast.projectedFinalCostMinor).toBe(483500);

      const forecast2Res = await request(app)
        .get(`/api/v1/forecast/trip/${trip2Id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(forecast2Res.status).toBe(200);
      expect(forecast2Res.body.forecast.currency).toBe('EUR');
      expect(forecast2Res.body.forecast.totalBudgetMinor).toBe(400000);
      // Clean isolation: Trip 2 has zero expenses, projected cost is 0
      expect(forecast2Res.body.forecast.projectedFinalCostMinor).toBe(0);
      expect(forecast2Res.body.forecast.riskStatus).toBe('SAFE');
    });

    it('converts currencies accurately via FrankfurterProvider preserving precision', async () => {
      const identityRes = await FrankfurterProvider.convert(10000, 'JPY', 'JPY');
      expect(identityRes.originalAmountMinor).toBe(10000);
      expect(identityRes.originalAmountDecimal).toBe(10000);
      expect(identityRes.convertedAmountDecimal).toBe(10000);
      expect(identityRes.source).toBe('IDENTITY');

      // Convert USD to EUR
      const usdToEur = await FrankfurterProvider.convert(10000, 'USD', 'EUR'); // $100.00
      expect(usdToEur.originalAmountDecimal).toBe(100);
      expect(usdToEur.convertedAmountDecimal).toBeGreaterThan(50);
      expect(usdToEur.convertedAmountMinor).toBe(Math.round(usdToEur.convertedAmountDecimal * 100));
    });
  });

  describe('Scenario 11: Geospatial Integrity & Coordinate Validation', () => {
    it('validates coordinate boundaries strictly [-90, 90] and [-180, 180]', () => {
      expect(isValidCoordinate(35.6895, 139.6917)).toBe(true);
      expect(isValidCoordinate(-33.8688, 151.2093)).toBe(true);
      expect(isValidCoordinate(91.0, 100.0)).toBe(false);
      expect(isValidCoordinate(45.0, 185.0)).toBe(false);
      expect(isValidCoordinate(NaN, 10.0)).toBe(false);
      expect(isValidCoordinate(undefined, 10.0)).toBe(false);
    });

    it('returns an explicit UNRESOLVED state without coordinate fabrication for unknown queries', async () => {
      const res = await GeoapifyProvider.geocode('CompletelyNonExistentFictionalSector987654321');
      // Must NOT return Nagpur fallback coordinates (20.5937, 78.9629)
      expect(res.isResolved).toBe(false);
      expect(res.source).toBe('UNRESOLVED');
      expect(res.lat).toBeUndefined();
      expect(res.lon).toBeUndefined();
    });

    it('calculates real Haversine distance without synthesizing fake intermediate points', async () => {
      const waypoints = [
        { lat: 35.6895, lon: 139.6917 }, // Shinjuku
        { lat: 35.6585, lon: 139.7022 }, // Shibuya (~3.5 km)
      ];
      const route = await GeoapifyProvider.calculateRoute(waypoints, 'walk');
      expect(route.distanceKm).toBeGreaterThan(2.0);
      expect(route.distanceKm).toBeLessThan(6.0);
      expect(route.timeMinutes).toBeGreaterThan(0);
      expect(route.coordinates.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Scenario 12: Honest Recovery Alternatives Verification', () => {
    it('generates recovery plan with verified or explicit hypothetical sourcing tags', async () => {
      // Overspend Trip 1 by adding heavy expense
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          tripId: trip1Id,
          description: 'Emergency Helicopter Transfer',
          category: 'TRANSPORT',
          amountMinor: 1200000, // ¥1,200,000 pushes trip into OVER_BUDGET
          currency: 'JPY',
          paymentStatus: 'SETTLED',
        });

      // Add a flexible expensive accommodation item that can be optimized
      await request(app)
        .post('/api/v1/itineraries')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          tripId: trip1Id,
          dayNumber: 2,
          date: '2026-10-11',
          title: 'Premium Shinjuku Tower Suite',
          category: 'ACCOMMODATION',
          estimatedCostMinor: 400000,
          priority: 'FLEXIBLE',
        });

      const recoveryRes = await request(app)
        .post(`/api/v1/recovery/trip/${trip1Id}/generate`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect([200, 201]).toContain(recoveryRes.status);
      expect(recoveryRes.body.success).toBe(true);
      expect(recoveryRes.body.strategies).toBeDefined();

      const balanced = recoveryRes.body.strategies.find((s: any) => s.strategyType === 'BALANCED_RECOVERY');
      expect(balanced).toBeDefined();

      for (const mod of balanced.modifications) {
        expect(mod.alternativeKind).toBeDefined();
        expect(['REAL_PROVIDER', 'VERIFIED_CATALOG', 'HYPOTHETICAL_PROPOSAL', 'DEMO_FIXTURE']).toContain(
          mod.alternativeKind
        );
        if (mod.isHypothetical) {
          expect(mod.isPriceVerified).toBe(false);
          expect(mod.providerIdentity).toBeDefined();
        }
      }
    });
  });
});
