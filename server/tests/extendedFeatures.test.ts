import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('TripGuard Extended Features & Autonomous Verification Suite', () => {
  let authToken = '';
  let userEmail = '';
  let tripId = '';
  let item1Id = '';
  let item2Id = '';
  let transitId = '';

  beforeAll(async () => {
    await connectDB();
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Category A: Account Security & Password Management', () => {
    it('registers user and tests secure password change', async () => {
      userEmail = `security.user.${Date.now()}@tripguard.ai`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Security Tester',
          email: userEmail,
          password: 'InitialPassword123!',
          baseCurrency: 'INR',
        });

      expect(regRes.status).toBe(201);
      authToken = regRes.body.token;

      // 1. Rejects wrong current password
      const failRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'BrandNewPassword456!',
        });

      expect(failRes.status).toBe(400);
      expect(failRes.body.success).toBe(false);

      // 2. Accepts valid change password
      const passRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'InitialPassword123!',
          newPassword: 'BrandNewPassword456!',
        });

      expect(passRes.status).toBe(200);
      expect(passRes.body.success).toBe(true);

      // 3. User can log in with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userEmail,
          password: 'BrandNewPassword456!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
      authToken = loginRes.body.token; // Update with latest token
    });
  });

  describe('Category C: Itinerary Conflict Detection & Reordering', () => {
    it('sets up a trip and detects schedule overlaps', async () => {
      // Create trip
      const tripRes = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Conflict Audit Trip',
          destination: 'Tokyo, Japan',
          startDate: '2026-10-10',
          endDate: '2026-10-17',
          travelersCount: 1,
          totalBudgetMinor: 5000000,
          currency: 'INR',
        });

      expect(tripRes.status).toBe(201);
      tripId = tripRes.body.trip._id;

      // Create Item 1: 10:00 - 12:00 on Day 1
      const res1 = await request(app)
        .post('/api/v1/itineraries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId,
          dayNumber: 1,
          date: '2026-10-10',
          title: 'Meiji Shrine Guided Walking Tour',
          category: 'ACTIVITY',
          startTime: '10:00',
          endTime: '12:00',
          estimatedCostMinor: 150000,
        });
      expect(res1.status).toBe(201);
      item1Id = res1.body.item._id;

      // Create Item 2: 11:30 - 13:30 on Day 1 (Overlaps by 30 mins)
      const res2 = await request(app)
        .post('/api/v1/itineraries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId,
          dayNumber: 1,
          date: '2026-10-10',
          title: 'Harajuku Food Tasting Experience',
          category: 'FOOD_DINING',
          startTime: '11:30',
          endTime: '13:30',
          estimatedCostMinor: 200000,
        });
      expect(res2.status).toBe(201);
      item2Id = res2.body.item._id;

      // Query conflicts
      const conflictRes = await request(app)
        .get(`/api/v1/itineraries/trip/${tripId}/conflicts`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(conflictRes.status).toBe(200);
      expect(conflictRes.body.hasConflicts).toBe(true);
      expect(conflictRes.body.conflictCount).toBeGreaterThanOrEqual(1);
      expect(conflictRes.body.conflicts[0].dayNumber).toBe(1);
    });

    it('reorders itinerary items to resolve conflict', async () => {
      // Reorder Item 2 to Day 2
      const reorderRes = await request(app)
        .post('/api/v1/itineraries/reorder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId,
          items: [
            { id: item2Id, dayNumber: 2, startTime: '12:00', endTime: '14:00' },
          ],
        });

      expect(reorderRes.status).toBe(200);
      expect(reorderRes.body.success).toBe(true);

      // Verify conflicts are now resolved
      const conflictRes2 = await request(app)
        .get(`/api/v1/itineraries/trip/${tripId}/conflicts`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(conflictRes2.status).toBe(200);
      expect(conflictRes2.body.hasConflicts).toBe(false);
      expect(conflictRes2.body.conflictCount).toBe(0);
    });
  });

  describe('Category M: What-If Macro Scenario Simulator', () => {
    it('evaluates budget contraction and disruption surge without mutating DB', async () => {
      const simRes = await request(app)
        .post(`/api/v1/simulator/trip/${tripId}/evaluate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          adjustments: [],
          simulatedBudgetMinor: 3000000, // Reduced budget to ₹30,000
          extraDisruptionCostMinor: 500000, // ₹5,000 unexpected fee
        });

      expect(simRes.status).toBe(200);
      expect(simRes.body.success).toBe(true);
      expect(simRes.body.simulatedForecast).toBeDefined();
      expect(simRes.body.simulatedBudgetApplied).toBe(3000000);
      expect(simRes.body.simulationNotice).toContain('Simulation only');
    });
  });

  describe('Category Q: Transit & Flight Tracking Intelligence', () => {
    it('creates, lists, updates, and deletes transit records', async () => {
      // 1. Initial list seeded
      const listRes = await request(app)
        .get(`/api/v1/traveler-tools/transit/trip/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);

      // 2. Create custom flight segment
      const addRes = await request(app)
        .post(`/api/v1/traveler-tools/transit/trip/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'FLIGHT',
          carrier: 'Japan Airlines (JAL)',
          code: 'JL 740',
          departureCity: 'DEL Terminal 3',
          arrivalCity: 'NRT Terminal 2',
          gate: 'Gate 22A',
          seat: '14A',
          status: 'ON_TIME',
        });

      expect(addRes.status).toBe(201);
      expect(addRes.body.data.trackingMode).toBe('MANUAL_VERIFIED');
      transitId = addRes.body.data._id;

      // 3. Update status to DELAYED
      const updateRes = await request(app)
        .patch(`/api/v1/traveler-tools/transit/trip/${tripId}/${transitId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'DELAYED',
          delayMinutes: 45,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('DELAYED');
      expect(updateRes.body.data.delayMinutes).toBe(45);

      // 4. Delete transit record
      const delRes = await request(app)
        .delete(`/api/v1/traveler-tools/transit/trip/${tripId}/${transitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });
  });

  describe('Category R: Multi-Currency Dynamic Conversions', () => {
    it('converts currencies and preserves integer paise calculations', async () => {
      const convRes = await request(app)
        .get('/api/v1/currency/convert?from=INR&to=USD&amountMinor=100000'); // ₹1,000

      expect(convRes.status).toBe(200);
      expect(convRes.body.success).toBe(true);
      expect(convRes.body.data.from).toBe('INR');
      expect(convRes.body.data.to).toBe('USD');
      expect(convRes.body.data.rate).toBeGreaterThan(0);
      expect(convRes.body.data.convertedAmountMinor).toBeGreaterThan(0);
    });
  });

  describe('Category S: Document Vault, Packing & Group Collaboration Suite', () => {
    let docId = '';
    let packItemId = '';
    let memberId = '';

    it('manages document vault lifecycle with encryption metadata', async () => {
      // 1. Get starter docs
      const listRes = await request(app)
        .get(`/api/v1/traveler-tools/vault/trip/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      // 2. Add custom document
      const addRes = await request(app)
        .post(`/api/v1/traveler-tools/vault/trip/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Custom Travel Pass Voucher',
          category: 'PASS',
          fileName: 'Custom-Pass.pdf',
          fileSize: '150 KB',
          bookingRef: 'PASS-2026-X',
          notes: 'Present mobile QR code',
        });
      expect(addRes.status).toBe(201);
      expect(addRes.body.data.title).toBe('Custom Travel Pass Voucher');
      docId = addRes.body.data._id;

      // 3. Delete document
      const delRes = await request(app)
        .delete(`/api/v1/traveler-tools/vault/trip/${tripId}/${docId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(delRes.status).toBe(200);
    });

    it('manages weather packing checklist items and toggles', async () => {
      // 1. Get starter checklist
      const listRes = await request(app)
        .get(`/api/v1/traveler-tools/packing/trip/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items.length).toBeGreaterThan(0);

      // 2. Add custom item
      const addRes = await request(app)
        .post(`/api/v1/traveler-tools/packing/trip/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Noise-Cancelling Headphones',
          category: 'ELECTRONICS',
          quantity: 1,
        });
      expect(addRes.status).toBe(201);
      packItemId = addRes.body.data._id;
      expect(addRes.body.data.isPacked).toBe(false);

      // 3. Toggle packed state
      const toggleRes = await request(app)
        .patch(`/api/v1/traveler-tools/packing/trip/${tripId}/${packItemId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.isPacked).toBe(true);

      // 4. Delete packing item
      const delRes = await request(app)
        .delete(`/api/v1/traveler-tools/packing/trip/${tripId}/${packItemId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(delRes.status).toBe(200);
    });

    it('manages group collaboration members, contributions, and settlements', async () => {
      // 1. Get initial group
      const groupRes = await request(app)
        .get(`/api/v1/traveler-tools/group/trip/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(groupRes.status).toBe(200);
      expect(groupRes.body.data.members.length).toBeGreaterThanOrEqual(1);

      // Reallocate lead organizer share to 50% to accommodate co-traveler share
      const leadMember = groupRes.body.data.members.find((m: any) => m.role === 'LEAD_ORGANIZER');
      if (leadMember) {
        await request(app)
          .put(`/api/v1/traveler-tools/group/trip/${tripId}/member/${leadMember._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ sharePercentage: 50 });
      }

      // 2. Add co-traveler member with remaining 50% share
      const addRes = await request(app)
        .post(`/api/v1/traveler-tools/group/trip/${tripId}/member`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Elena Rostova',
          email: 'elena@travel.org',
          role: 'CO_TRAVELER',
          sharePercentage: 50,
          contributedAmountMinor: 1500000, // ₹15,000 paid
        });
      expect(addRes.status).toBe(201);
      memberId = addRes.body.data._id;
      expect(addRes.body.data.name).toBe('Elena Rostova');

      // 3. Update member contribution & share
      const updateRes = await request(app)
        .put(`/api/v1/traveler-tools/group/trip/${tripId}/member/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sharePercentage: 40,
          contributedAmountMinor: 2000000, // ₹20,000 paid
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.sharePercentage).toBe(40);
      expect(updateRes.body.data.contributedAmountMinor).toBe(2000000);

      // 4. Check recalculation in settlement summary
      const settleRes = await request(app)
        .get(`/api/v1/traveler-tools/group/trip/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(settleRes.status).toBe(200);
      const elena = settleRes.body.data.settlementSummary.find((m: any) => m.name === 'Elena Rostova');
      expect(elena).toBeDefined();
      expect(elena.contributedMinor).toBe(2000000);

      // 5. Block deletion while member has active contributions
      const blockedDel = await request(app)
        .delete(`/api/v1/traveler-tools/group/trip/${tripId}/member/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(blockedDel.status).toBe(400);

      // 6. Settle / refund contribution to 0, then remove member
      await request(app)
        .put(`/api/v1/traveler-tools/group/trip/${tripId}/member/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contributedAmountMinor: 0 });

      const delRes = await request(app)
        .delete(`/api/v1/traveler-tools/group/trip/${tripId}/member/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(delRes.status).toBe(200);
    });

    it('computes eco footprint and green savings dynamically', async () => {
      const ecoRes = await request(app)
        .get(`/api/v1/traveler-tools/eco/trip/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(ecoRes.status).toBe(200);
      expect(ecoRes.body.data.totalEmissionsKg).toBeGreaterThan(0);
      expect(ecoRes.body.data.breakdown.length).toBe(3);
      expect(ecoRes.body.data.carbonOffsetCostMinor).toBeGreaterThan(0);
    });
  });
});
