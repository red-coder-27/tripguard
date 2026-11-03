import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('TripGuard End-to-End API Suite', () => {
  let authToken = '';
  let tripId = '';
  let runId = '';

  beforeAll(async () => {
    await connectDB();
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  it('registers a new traveler and issues a signed JWT token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jordan Finch',
        email: `jordan.${Date.now()}@tripguard.ai`,
        password: 'Password123!',
        baseCurrency: 'INR',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toContain('tripguard.ai');
    authToken = res.body.token;
  });

  it('creates a new trip portfolio with defined budget constraints', async () => {
    const res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Kyoto Cultural Trail 2026',
        destination: 'Tokyo, Japan',
        startDate: '2026-11-15',
        endDate: '2026-11-22',
        travelersCount: 1,
        totalBudgetMinor: 5000000, // ₹50,000
        emergencyReserveMinor: 0,
        currency: 'INR',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.trip._id).toBeDefined();
    tripId = res.body.trip._id;
  });

  it('records commitments and expenses to produce the ₹7,000 deficit condition', async () => {
    // 1. Hotel booking (₹12,000)
    const hotelBookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripId,
        provider: 'Grand Hotel',
        category: 'ACCOMMODATION',
        totalCostMinor: 1200000,
        paidAmountMinor: 0,
        travelDate: '2026-11-15',
        currency: 'INR',
        cancellationPolicy: {
          isRefundable: true,
          cancellationFeeMinor: 0,
          refundableAmountMinor: 0,
        },
      });

    // Hotel itinerary item
    await request(app)
      .post('/api/v1/itineraries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripId,
        dayNumber: 1,
        date: '2026-11-15',
        title: 'Grand Hotel Stay',
        category: 'ACCOMMODATION',
        estimatedCostMinor: 1200000,
        priority: 'FLEXIBLE',
        bookingId: hotelBookRes.body.booking._id,
      });

    // 2. Private taxi booking (₹4,500)
    const taxiBookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripId,
        provider: 'VIP Chauffeur',
        category: 'TRANSPORT',
        totalCostMinor: 450000,
        paidAmountMinor: 0,
        travelDate: '2026-11-15',
        currency: 'INR',
        cancellationPolicy: {
          isRefundable: true,
          cancellationFeeMinor: 0,
          refundableAmountMinor: 0,
        },
      });

    // Taxi itinerary item
    await request(app)
      .post('/api/v1/itineraries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripId,
        dayNumber: 1,
        date: '2026-11-15',
        title: 'Airport Taxi Transfer',
        category: 'TRANSPORT',
        estimatedCostMinor: 450000,
        priority: 'FLEXIBLE',
        bookingId: taxiBookRes.body.booking._id,
      });

    // 3. Settled expense (₹10,000)
    await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripId,
        description: 'Visa and Rail Pass',
        category: 'MISC',
        amountMinor: 1000000, // ₹10,000
        currency: 'INR',
        paymentStatus: 'SETTLED',
      });

    // 4. Optional activity (₹1,500)
    await request(app)
      .post('/api/v1/itineraries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripId,
        dayNumber: 1,
        date: '2026-11-15',
        title: 'Shibuya Sky Deck Observation Ticket',
        category: 'ACTIVITY',
        estimatedCostMinor: 150000,
        priority: 'OPTIONAL',
      });

    // 5. Must-do sight (₹29,000)
    await request(app)
      .post('/api/v1/itineraries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripId,
        dayNumber: 2,
        date: '2026-11-16',
        title: 'Fushimi Inari Sunrise Experience',
        category: 'ACTIVITY',
        estimatedCostMinor: 2900000,
        priority: 'MUST_DO',
      });

    // Verify forecast
    const forecastRes = await request(app)
      .get(`/api/v1/forecast/trip/${tripId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(forecastRes.status).toBe(200);
    expect(forecastRes.body.forecast.totalBudgetMinor).toBe(5000000);
    expect(forecastRes.body.forecast.projectedFinalCostMinor).toBe(5700000);
    expect(forecastRes.body.forecast.overspendingGapMinor).toBe(700000); // ₹7,000
    expect(forecastRes.body.forecast.riskStatus).toBe('OVER_BUDGET');
  });

  it('generates recovery strategies and verifies the Balanced Recovery saves ₹7,000', async () => {
    const res = await request(app)
      .post(`/api/v1/recovery/trip/${tripId}/generate`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.strategies.length).toBe(3);

    runId = res.body.recoveryRun.runId;

    const balanced = res.body.strategies.find((s: any) => s.strategyType === 'BALANCED_RECOVERY');
    expect(balanced).toBeDefined();
    expect(balanced.netSavingsMinor).toBe(700000); // Exactly ₹7,000 net savings!
    expect(balanced.revisedProjectedCostMinor).toBe(5000000); // Exactly ₹50,000!
  });

  it('approves the Balanced Recovery strategy, incrementing version to v2', async () => {
    const res = await request(app)
      .post(`/api/v1/recovery/trip/${tripId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        runId,
        strategyType: 'BALANCED_RECOVERY',
        approvalNotes: 'Approved Balanced Recovery plan via E2E test',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newVersion).toBe(2);
    expect(res.body.updatedForecast.projectedFinalCostMinor).toBe(5000000);
    expect(res.body.updatedForecast.overspendingGapMinor).toBe(0); // Deficit completely closed!
    expect(['SAFE', 'WATCH']).toContain(res.body.updatedForecast.riskStatus);
  });
});
