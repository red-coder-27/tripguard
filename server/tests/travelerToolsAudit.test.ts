import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { getMinorUnitDivisor } from '../src/config/constants.js';

describe('TripGuard Traveler Tools Production Readiness & Security Audit Suite', () => {
  let userAToken = '';
  let userAId = '';
  let userAEmail = '';

  let userBToken = '';
  let userBEmail = '';

  let userCToken = '';
  let userCEmail = '';

  let userDToken = '';
  let userDEmail = '';

  let trip1Id = '';
  let trip2Id = '';
  let leadMemberId = '';
  let coTravelerMemberId = '';
  let viewerMemberId = '';
  let trip2DocId = '';
  let trip2PackId = '';
  let trip2TransitId = '';
  let trip2MemberId = '';

  beforeAll(async () => {
    await connectDB();

    const timestamp = Date.now();

    // User A: Owner / Lead Organizer of Trip 1
    userAEmail = `audit.userA.${timestamp}@tripguard.test`;
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice Owner',
        email: userAEmail,
        password: 'Password123!',
        baseCurrency: 'USD',
      });
    expect(resA.status).toBe(201);
    userAToken = resA.body.token;
    userAId = resA.body.user.id;

    // User B: Owner of Trip 2 / Stranger to Trip 1
    userBEmail = `audit.userB.${timestamp}@tripguard.test`;
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bob Stranger',
        email: userBEmail,
        password: 'Password123!',
        baseCurrency: 'EUR',
      });
    expect(resB.status).toBe(201);
    userBToken = resB.body.token;

    // User C: Invited Viewer to Trip 1
    userCEmail = `audit.userC.${timestamp}@tripguard.test`;
    const resC = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Charlie Viewer',
        email: userCEmail,
        password: 'Password123!',
        baseCurrency: 'USD',
      });
    expect(resC.status).toBe(201);
    userCToken = resC.body.token;

    // User D: Invited Co-Traveler to Trip 1
    userDEmail = `audit.userD.${timestamp}@tripguard.test`;
    const resD = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'David Traveler',
        email: userDEmail,
        password: 'Password123!',
        baseCurrency: 'USD',
      });
    expect(resD.status).toBe(201);
    userDToken = resD.body.token;

    // Create Main Test Trip 1 owned by User A
    const trip1Res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Universal Audit Trip',
        destination: 'Paris, France',
        startDate: '2026-11-10',
        endDate: '2026-11-17',
        travelersCount: 3,
        totalBudgetMinor: 500000, // $5,000.00
        currency: 'USD',
      });
    expect(trip1Res.status).toBe(201);
    trip1Id = trip1Res.body.trip._id;

    // Create Independent Trip 2 owned by User B
    const trip2Res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        name: 'Bobs Private Vacation',
        destination: 'Berlin, Germany',
        startDate: '2026-12-01',
        endDate: '2026-12-08',
        travelersCount: 2,
        totalBudgetMinor: 300000,
        currency: 'EUR',
      });
    expect(trip2Res.status).toBe(201);
    trip2Id = trip2Res.body.trip._id;

    // Seed resources in Trip 2 to test cross-trip ID substitution
    const doc2Res = await request(app)
      .post(`/api/v1/traveler-tools/vault/trip/${trip2Id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'Bobs Secret Pass', category: 'PASS', fileName: 'bobs-pass.pdf' });
    expect(doc2Res.status).toBe(201);
    trip2DocId = doc2Res.body.data._id;

    const pack2Res = await request(app)
      .post(`/api/v1/traveler-tools/packing/trip/${trip2Id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: 'Bobs Coat', category: 'CLOTHING' });
    expect(pack2Res.status).toBe(201);
    trip2PackId = pack2Res.body.data._id;

    const transit2Res = await request(app)
      .post(`/api/v1/traveler-tools/transit/trip/${trip2Id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ carrier: 'Lufthansa', code: 'LH 100', departureCity: 'FRA', arrivalCity: 'BER' });
    expect(transit2Res.status).toBe(201);
    trip2TransitId = transit2Res.body.data._id;

    const group2Res = await request(app)
      .get(`/api/v1/traveler-tools/group/trip/${trip2Id}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(group2Res.status).toBe(200);
    trip2MemberId = group2Res.body.data.members[0]._id;
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  // ==========================================
  // SECTION 1: RBAC PENETRATION & DIRECT OBJECT REFERENCE
  // ==========================================
  describe('1. RBAC Penetration Testing & Access Control Enforcement', () => {
    it('initializes group with Alice as LEAD_ORGANIZER and protects her from deletion or self-removal', async () => {
      const groupRes = await request(app)
        .get(`/api/v1/traveler-tools/group/trip/${trip1Id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(groupRes.status).toBe(200);
      const lead = groupRes.body.data.members.find((m: any) => m.role === 'LEAD_ORGANIZER');
      expect(lead).toBeDefined();
      expect(lead.email).toBe(userAEmail.toLowerCase());
      leadMemberId = lead._id;

      // Attempting to delete the Lead Organizer must fail with 400
      const delLeadRes = await request(app)
        .delete(`/api/v1/traveler-tools/group/trip/${trip1Id}/member/${leadMemberId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delLeadRes.status).toBe(400);
      expect(delLeadRes.body.success).toBe(false);
      expect(delLeadRes.body.error).toContain('Cannot remove the lead organizer');
    });

    it('blocks stranger User B from accessing any resource on Trip 1 (404 Unauthorized)', async () => {
      const endpoints = [
        request(app).get(`/api/v1/traveler-tools/vault/trip/${trip1Id}`).set('Authorization', `Bearer ${userBToken}`),
        request(app).post(`/api/v1/traveler-tools/vault/trip/${trip1Id}`).set('Authorization', `Bearer ${userBToken}`).send({ title: 'H', fileName: 'h.pdf' }),
        request(app).get(`/api/v1/traveler-tools/packing/trip/${trip1Id}`).set('Authorization', `Bearer ${userBToken}`),
        request(app).post(`/api/v1/traveler-tools/packing/trip/${trip1Id}`).set('Authorization', `Bearer ${userBToken}`).send({ name: 'H' }),
        request(app).get(`/api/v1/traveler-tools/transit/trip/${trip1Id}`).set('Authorization', `Bearer ${userBToken}`),
        request(app).get(`/api/v1/traveler-tools/group/trip/${trip1Id}`).set('Authorization', `Bearer ${userBToken}`),
        request(app).get(`/api/v1/traveler-tools/eco/trip/${trip1Id}`).set('Authorization', `Bearer ${userBToken}`),
      ];

      const results = await Promise.all(endpoints);
      results.forEach((res) => {
        expect(res.status).toBe(404);
      });
    });

    it('enforces read-only permissions for VIEWER role across all mutation endpoints (403 Forbidden)', async () => {
      // 1. Add User C as VIEWER with 0% expense share
      const addViewer = await request(app)
        .post(`/api/v1/traveler-tools/group/trip/${trip1Id}/member`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Charlie Viewer',
          email: userCEmail,
          role: 'VIEWER',
          sharePercentage: 0,
          contributedAmountMinor: 0,
        });
      expect(addViewer.status).toBe(201);
      viewerMemberId = addViewer.body.data._id;

      // 2. Viewer can view resources (200 OK)
      const vGet = await request(app).get(`/api/v1/traveler-tools/vault/trip/${trip1Id}`).set('Authorization', `Bearer ${userCToken}`);
      expect(vGet.status).toBe(200);

      // 3. Viewer mutations are strictly rejected with 403 Forbidden
      const mutations = [
        request(app).post(`/api/v1/traveler-tools/vault/trip/${trip1Id}`).set('Authorization', `Bearer ${userCToken}`).send({ title: 'X', fileName: 'x.pdf' }),
        request(app).delete(`/api/v1/traveler-tools/vault/trip/${trip1Id}/${vGet.body.data[0]._id}`).set('Authorization', `Bearer ${userCToken}`),
        request(app).post(`/api/v1/traveler-tools/packing/trip/${trip1Id}`).set('Authorization', `Bearer ${userCToken}`).send({ name: 'X' }),
        request(app).post(`/api/v1/traveler-tools/transit/trip/${trip1Id}`).set('Authorization', `Bearer ${userCToken}`).send({ carrier: 'AF', code: '1', departureCity: 'A', arrivalCity: 'B' }),
        request(app).post(`/api/v1/traveler-tools/group/trip/${trip1Id}/member`).set('Authorization', `Bearer ${userCToken}`).send({ name: 'X', email: 'x@x.com' }),
        request(app).put(`/api/v1/traveler-tools/group/trip/${trip1Id}/member/${viewerMemberId}`).set('Authorization', `Bearer ${userCToken}`).send({ sharePercentage: 10 }),
        request(app).delete(`/api/v1/traveler-tools/group/trip/${trip1Id}/member/${viewerMemberId}`).set('Authorization', `Bearer ${userCToken}`),
      ];

      const resList = await Promise.all(mutations);
      resList.forEach((r) => {
        expect(r.status).toBe(403);
      });
    });

    it('allows CO_TRAVELER operational access but blocks member invites, member deletions, and role demotions', async () => {
      // 1. Reallocate share to free up 20%
      const groupRes = await request(app).get(`/api/v1/traveler-tools/group/trip/${trip1Id}`).set('Authorization', `Bearer ${userAToken}`);
      const otherMember = groupRes.body.data.members.find((m: any) => m.role === 'CO_TRAVELER');
      expect(otherMember).toBeDefined();

      const updateOther = await request(app)
        .put(`/api/v1/traveler-tools/group/trip/${trip1Id}/member/${otherMember._id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ sharePercentage: 13 });
      expect(updateOther.status).toBe(200);

      // 2. Add User D as CO_TRAVELER with 20% share
      const addTraveler = await request(app)
        .post(`/api/v1/traveler-tools/group/trip/${trip1Id}/member`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'David Traveler',
          email: userDEmail,
          role: 'CO_TRAVELER',
          sharePercentage: 20,
          contributedAmountMinor: 10000,
        });
      expect(addTraveler.status).toBe(201);
      coTravelerMemberId = addTraveler.body.data._id;

      // 3. Co-traveler CAN add packing items and documents
      const packRes = await request(app)
        .post(`/api/v1/traveler-tools/packing/trip/${trip1Id}`)
        .set('Authorization', `Bearer ${userDToken}`)
        .send({ name: 'Travel Pillow', category: 'ESSENTIALS' });
      expect(packRes.status).toBe(201);

      // 4. Co-traveler CANNOT invite members
      const inviteRes = await request(app)
        .post(`/api/v1/traveler-tools/group/trip/${trip1Id}/member`)
        .set('Authorization', `Bearer ${userDToken}`)
        .send({ name: 'Invitee', email: 'invitee@test.com', sharePercentage: 0 });
      expect(inviteRes.status).toBe(403);

      // 5. Co-traveler CANNOT remove members
      const removeRes = await request(app)
        .delete(`/api/v1/traveler-tools/group/trip/${trip1Id}/member/${viewerMemberId}`)
        .set('Authorization', `Bearer ${userDToken}`);
      expect(removeRes.status).toBe(403);

      // 6. Co-traveler CANNOT update other members or change roles
      const hackRes = await request(app)
        .put(`/api/v1/traveler-tools/group/trip/${trip1Id}/member/${leadMemberId}`)
        .set('Authorization', `Bearer ${userDToken}`)
        .send({ role: 'VIEWER' });
      expect(hackRes.status).toBe(403);
    });

    it('blocks removed members from accessing trip data even if they retain a cryptographically valid JWT', async () => {
      // 1. Create User E, get JWT, add to Trip 1
      const eEmail = `audit.userE.${Date.now()}@tripguard.test`;
      const regE = await request(app).post('/api/v1/auth/register').send({
        name: 'Eva Ex-Member',
        email: eEmail,
        password: 'Password123!',
        baseCurrency: 'USD',
      });
      expect(regE.status).toBe(201);
      const userEToken = regE.body.token;

      const addE = await request(app)
        .post(`/api/v1/traveler-tools/group/trip/${trip1Id}/member`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Eva', email: eEmail, role: 'VIEWER', sharePercentage: 0, contributedAmountMinor: 0 });
      expect(addE.status).toBe(201);
      const eMemberId = addE.body.data._id;

      // 2. Eva can read trip data
      const eRead1 = await request(app).get(`/api/v1/traveler-tools/vault/trip/${trip1Id}`).set('Authorization', `Bearer ${userEToken}`);
      expect(eRead1.status).toBe(200);

      // 3. Lead Organizer removes Eva
      const delE = await request(app)
        .delete(`/api/v1/traveler-tools/group/trip/${trip1Id}/member/${eMemberId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(delE.status).toBe(200);

      // 4. Eva attempts to read trip data with her old JWT -> blocked at DB level with 404
      const eRead2 = await request(app).get(`/api/v1/traveler-tools/vault/trip/${trip1Id}`).set('Authorization', `Bearer ${userEToken}`);
      expect(eRead2.status).toBe(404);
    });

    it('rejects cross-trip ID substitution across all resource mutations (IDOR prevention)', async () => {
      // User A is authorized on Trip 1, but attempts to delete/modify resources belonging to Trip 2
      // 1. Vault document cross-trip substitution
      const delDocRes = await request(app)
        .delete(`/api/v1/traveler-tools/vault/trip/${trip1Id}/${trip2DocId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(delDocRes.status).toBe(404);
      expect(delDocRes.body.error).toContain('Document not found in this trip');

      // 2. Packing item cross-trip substitution
      const delPackRes = await request(app)
        .delete(`/api/v1/traveler-tools/packing/trip/${trip1Id}/${trip2PackId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(delPackRes.status).toBe(404);
      expect(delPackRes.body.error).toContain('Packing item not found in this trip');

      // 3. Transit item cross-trip substitution
      const delTransitRes = await request(app)
        .delete(`/api/v1/traveler-tools/transit/trip/${trip1Id}/${trip2TransitId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(delTransitRes.status).toBe(404);
      expect(delTransitRes.body.error).toContain('Transit record not found in this trip');

      // 4. Member update cross-trip substitution
      const putMemberRes = await request(app)
        .put(`/api/v1/traveler-tools/group/trip/${trip1Id}/member/${trip2MemberId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ sharePercentage: 10 });
      expect(putMemberRes.status).toBe(404);
      expect(putMemberRes.body.error).toContain('Trip member not found in this trip');
    });
  });

  // ==========================================
  // SECTION 2: GROUP ACCOUNTING & LEDGER INTEGRITY
  // ==========================================
  describe('2. Group Accounting, Unequal Shares & Historical Integrity', () => {
    it('accurately settles 3 members with unequal shares (50%, 30%, 20%) on odd minor unit expense', async () => {
      const trip3 = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Unequal Split 3-Traveler Trip',
          destination: 'Tokyo, Japan',
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          travelersCount: 3,
          totalBudgetMinor: 100000,
          currency: 'USD',
        });
      const t3Id = trip3.body.trip._id;

      // Initialize members
      const gRes = await request(app).get(`/api/v1/traveler-tools/group/trip/${t3Id}`).set('Authorization', `Bearer ${userAToken}`);
      const members = gRes.body.data.members;
      expect(members.length).toBe(3);

      // Configure unequal shares: reduce members[2] and members[1] first so total does not exceed 100%
      const p1 = await request(app).put(`/api/v1/traveler-tools/group/trip/${t3Id}/member/${members[2]._id}`).set('Authorization', `Bearer ${userAToken}`).send({ sharePercentage: 20 });
      expect(p1.status).toBe(200);

      const p2 = await request(app).put(`/api/v1/traveler-tools/group/trip/${t3Id}/member/${members[1]._id}`).set('Authorization', `Bearer ${userAToken}`).send({ sharePercentage: 30 });
      expect(p2.status).toBe(200);

      const p3 = await request(app).put(`/api/v1/traveler-tools/group/trip/${t3Id}/member/${members[0]._id}`).set('Authorization', `Bearer ${userAToken}`).send({ sharePercentage: 50 });
      expect(p3.status).toBe(200);

      // Add odd minor unit expense: $100.01 (10,001 minor units)
      await request(app).post('/api/v1/expenses').set('Authorization', `Bearer ${userAToken}`).send({
        tripId: t3Id,
        description: 'Odd Bill',
        category: 'FOOD_DINING',
        amountMinor: 10001,
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD',
        paymentStatus: 'SETTLED',
      });

      const settleRes = await request(app).get(`/api/v1/traveler-tools/group/trip/${t3Id}`).set('Authorization', `Bearer ${userAToken}`);
      expect(settleRes.status).toBe(200);
      const summary = settleRes.body.data.settlementSummary;

      // 50% of 10001 = 5000.5 -> 5001
      // 30% of 10001 = 3000.3 -> 3000
      // 20% of 10001 = 2000.2 -> 2000
      // Sum = 5001 + 3000 + 2000 = 10001
      const totalFairShares = summary.reduce((sum: number, m: any) => sum + m.fairShareMinor, 0);
      expect(totalFairShares).toBe(10001);
    });

    it('preserves exact financial balance conservation with zero contributions and partial payments', async () => {
      const tripSettle = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Partial Payment Ledger Trip',
          destination: 'London, UK',
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          travelersCount: 3,
          totalBudgetMinor: 100000,
          currency: 'GBP',
        });
      const tId = tripSettle.body.trip._id;

      const gRes = await request(app).get(`/api/v1/traveler-tools/group/trip/${tId}`).set('Authorization', `Bearer ${userAToken}`);
      const members = gRes.body.data.members;

      // Equal shares: 34%, 33%, 33%
      // Set contributions: Member 0 paid 7,000, Member 1 paid 3,000, Member 2 paid 0
      await request(app).put(`/api/v1/traveler-tools/group/trip/${tId}/member/${members[0]._id}`).set('Authorization', `Bearer ${userAToken}`).send({ contributedAmountMinor: 7000 });
      await request(app).put(`/api/v1/traveler-tools/group/trip/${tId}/member/${members[1]._id}`).set('Authorization', `Bearer ${userAToken}`).send({ contributedAmountMinor: 3000 });
      await request(app).put(`/api/v1/traveler-tools/group/trip/${tId}/member/${members[2]._id}`).set('Authorization', `Bearer ${userAToken}`).send({ contributedAmountMinor: 0 });

      // Incur expense of exactly 10,000 minor units
      await request(app).post('/api/v1/expenses').set('Authorization', `Bearer ${userAToken}`).send({
        tripId: tId,
        description: 'Total Group Expenses',
        category: 'ACCOMMODATION',
        amountMinor: 10000,
        currency: 'GBP',
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'SETTLED',
      });

      const res = await request(app).get(`/api/v1/traveler-tools/group/trip/${tId}`).set('Authorization', `Bearer ${userAToken}`);
      const summary = res.body.data.settlementSummary;

      // Net zero balance sheet: total creditors (+balance) must EXACTLY equal total debtors (-balance)
      const netBalances = summary.reduce((sum: number, m: any) => sum + m.balanceMinor, 0);
      expect(netBalances).toBe(0);

      // Member 2 (contributed 0) must owe exactly their fair share
      const member2 = summary.find((m: any) => m.name.includes('Co-Traveler 3'));
      expect(member2.contributedMinor).toBe(0);
      expect(member2.balanceMinor).toBe(-member2.fairShareMinor);
      expect(member2.status).toBe('DEBTOR');
    });

    it('blocks deletion of members with active contributions and reclaims share to Lead Organizer on deletion', async () => {
      const tripReclaim = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Reclaim Share Trip',
          destination: 'Madrid, Spain',
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          travelersCount: 2,
          totalBudgetMinor: 100000,
          currency: 'EUR',
        });
      const tId = tripReclaim.body.trip._id;

      const gRes = await request(app).get(`/api/v1/traveler-tools/group/trip/${tId}`).set('Authorization', `Bearer ${userAToken}`);
      const lead = gRes.body.data.members.find((m: any) => m.role === 'LEAD_ORGANIZER');
      const coTraveler = gRes.body.data.members.find((m: any) => m.role === 'CO_TRAVELER');
      expect(lead.sharePercentage).toBe(50);
      expect(coTraveler.sharePercentage).toBe(50);

      // 1. Give co-traveler an active contribution
      await request(app).put(`/api/v1/traveler-tools/group/trip/${tId}/member/${coTraveler._id}`).set('Authorization', `Bearer ${userAToken}`).send({ contributedAmountMinor: 5000 });

      // 2. Attempting to delete member with contribution is blocked
      const blockedDel = await request(app).delete(`/api/v1/traveler-tools/group/trip/${tId}/member/${coTraveler._id}`).set('Authorization', `Bearer ${userAToken}`);
      expect(blockedDel.status).toBe(400);
      expect(blockedDel.body.error).toContain('Cannot remove member with recorded financial contributions');

      // 3. Refund/zero out contribution
      await request(app).put(`/api/v1/traveler-tools/group/trip/${tId}/member/${coTraveler._id}`).set('Authorization', `Bearer ${userAToken}`).send({ contributedAmountMinor: 0 });

      // 4. Now deletion succeeds, and co-traveler's 50% share is reclaimed by the Lead Organizer (50 + 50 = 100%)
      const okDel = await request(app).delete(`/api/v1/traveler-tools/group/trip/${tId}/member/${coTraveler._id}`).set('Authorization', `Bearer ${userAToken}`);
      expect(okDel.status).toBe(200);

      const afterRes = await request(app).get(`/api/v1/traveler-tools/group/trip/${tId}`).set('Authorization', `Bearer ${userAToken}`);
      expect(afterRes.body.data.members.length).toBe(1);
      expect(afterRes.body.data.members[0].sharePercentage).toBe(100);
    });
  });

  // ==========================================
  // SECTION 3: API RESILIENCE & INPUT VALIDATION
  // ==========================================
  describe('3. API Resilience, Malformed Inputs & Boundary Validation', () => {
    it('returns clean 400 Bad Request for malformed ObjectIds instead of crashing with 500', async () => {
      const badTripRes = await request(app)
        .get('/api/v1/traveler-tools/vault/trip/malformed-not-an-id')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(badTripRes.status).toBe(400);
      expect(badTripRes.body.error).toContain('Invalid trip ID format');

      const badDocRes = await request(app)
        .delete(`/api/v1/traveler-tools/vault/trip/${trip1Id}/malformed-doc-id`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(badDocRes.status).toBe(400);
      expect(badDocRes.body.error).toContain('Invalid document ID format');

      const badPackRes = await request(app)
        .delete(`/api/v1/traveler-tools/packing/trip/${trip1Id}/malformed-pack-id`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(badPackRes.status).toBe(400);
      expect(badPackRes.body.error).toContain('Invalid packing item ID format');

      const badTransitRes = await request(app)
        .delete(`/api/v1/traveler-tools/transit/trip/${trip1Id}/malformed-transit-id`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(badTransitRes.status).toBe(400);
      expect(badTransitRes.body.error).toContain('Invalid transit item ID format');

      const badMemberRes = await request(app)
        .delete(`/api/v1/traveler-tools/group/trip/${trip1Id}/member/malformed-member-id`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(badMemberRes.status).toBe(400);
      expect(badMemberRes.body.error).toContain('Invalid member ID format');
    });

    it('rejects oversized string payloads and malformed emails', async () => {
      const longTitle = 'A'.repeat(300);
      const docRes = await request(app)
        .post(`/api/v1/traveler-tools/vault/trip/${trip1Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: longTitle, fileName: 'test.pdf' });
      expect(docRes.status).toBe(400);
      expect(docRes.body.error).toContain('exceed maximum allowed character limit');

      const badEmailRes = await request(app)
        .post(`/api/v1/traveler-tools/group/trip/${trip1Id}/member`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Bob', email: 'not-an-email', sharePercentage: 0 });
      expect(badEmailRes.status).toBe(400);
      expect(badEmailRes.body.error).toContain('Invalid email address format');
    });
  });

  // ==========================================
  // SECTION 4: CARBON METHODOLOGY HONESTY
  // ==========================================
  describe('4. Carbon Methodology & Traceability Disclosure', () => {
    it('returns exact DEFRA/ICAO benchmark methodology metadata and units without false claims', async () => {
      const ecoRes = await request(app)
        .get(`/api/v1/traveler-tools/eco/trip/${trip1Id}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(ecoRes.status).toBe(200);
      const data = ecoRes.body.data;

      expect(data.metadata.isProviderVerified).toBe(false);
      expect(data.metadata.sourceVerificationStatus).toBe('UNVERIFIED_STATISTICAL_ESTIMATE');
      expect(data.metadata.coefficientsSource).toContain('DEFRA 2023 / ICAO Carbon Emissions Calculator');
      expect(data.metadata.units).toBe('kg CO2e');
      expect(data.metadata.calculationFormula).toContain('185 kg * flights * travelers');
    });
  });
});
