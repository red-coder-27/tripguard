import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { TravelDocument } from '../models/TravelDocument.js';
import { PackingItem } from '../models/PackingItem.js';
import { TripMember, MemberRole } from '../models/TripMember.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';
import { Expense } from '../models/Expense.js';
import { getMinorUnitDivisor } from '../config/constants.js';

const router = Router();

// ==================== AUTHORIZATION HELPER ====================

interface AuthContext {
  trip: any;
  userRole: MemberRole;
  isOwner: boolean;
}

async function getAuthorizedTripContext(
  tripId: string,
  userId: string,
  userEmail: string,
  requireWrite = false,
  requireLeadOrganizer = false
): Promise<{ auth?: AuthContext; errorStatus?: number; errorMessage?: string }> {
  if (!mongoose.Types.ObjectId.isValid(tripId)) {
    return { errorStatus: 400, errorMessage: 'Invalid trip ID format' };
  }

  const trip = await Trip.findById(tripId);
  if (!trip) {
    return { errorStatus: 404, errorMessage: 'Trip not found or unauthorized' };
  }

  const isOwner = trip.userId.toString() === userId;
  const normalizedEmail = (userEmail || '').toLowerCase().trim();

  let member = await TripMember.findOne({
    tripId,
    email: normalizedEmail,
  });

  // Trip owner is always LEAD_ORGANIZER even if not yet saved in TripMember
  let userRole: MemberRole = isOwner ? 'LEAD_ORGANIZER' : (member?.role || 'VIEWER');

  if (!isOwner && !member) {
    return { errorStatus: 404, errorMessage: 'Trip not found or unauthorized' };
  }

  if (requireLeadOrganizer && userRole !== 'LEAD_ORGANIZER') {
    return { errorStatus: 403, errorMessage: 'Only the lead organizer can perform this operation' };
  }

  if (requireWrite && userRole === 'VIEWER') {
    return { errorStatus: 403, errorMessage: 'Viewers have read-only access to this trip' };
  }

  return {
    auth: {
      trip,
      userRole,
      isOwner,
    },
  };
}

// ==================== DOCUMENT VAULT ====================

// GET /api/v1/traveler-tools/vault/trip/:tripId
router.get('/vault/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, false);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { trip } = authResult.auth;
    let docs = await TravelDocument.find({ tripId }).sort({ createdAt: -1 });

    if (docs.length === 0) {
      const cityName = (trip.destination || 'Destination').split(',')[0].trim();
      const code = cityName.substring(0, 3).toUpperCase();
      docs = await TravelDocument.create([
        {
          tripId,
          title: `${cityName} Airline E-Ticket & Boarding Pass`,
          category: 'FLIGHT',
          fileName: `${cityName.replace(/\s+/g, '-')}-Flight-Ticket.pdf`,
          fileSize: '340 KB',
          fileType: 'application/pdf',
          bookingRef: `FL-${code}-2026`,
          notes: `Flight confirmation and e-ticket reference for ${trip.destination}. Stored with multi-tenant access control.`,
        },
        {
          tripId,
          title: `${cityName} Hotel Reservation Voucher`,
          category: 'HOTEL',
          fileName: `${cityName.replace(/\s+/g, '-')}-Stay-Voucher.pdf`,
          fileSize: '210 KB',
          fileType: 'application/pdf',
          bookingRef: `HT-${code}-981`,
          notes: 'Check-in from 14:00. Non-smoking room, high floor requested.',
        },
        {
          tripId,
          title: 'Worldwide Comprehensive Travel Insurance',
          category: 'INSURANCE',
          fileName: 'Global-Assistance-Policy.pdf',
          fileSize: '450 KB',
          fileType: 'application/pdf',
          bookingRef: 'INS-2026-99120',
          notes: 'Emergency 24/7 hotline assistance. Full medical and travel cancellation coverage.',
        },
      ]);
    }

    res.json({ success: true, data: docs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/traveler-tools/vault/trip/:tripId
router.post('/vault/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { title, category, fileName, fileSize, bookingRef, notes } = req.body;

    if (!title || !fileName) {
      return res.status(400).json({ success: false, error: 'Title and file name are required' });
    }

    if (typeof title !== 'string' || typeof fileName !== 'string') {
      return res.status(400).json({ success: false, error: 'Title and file name must be strings' });
    }

    if (title.length > 250 || fileName.length > 250 || (notes && String(notes).length > 3000) || (bookingRef && String(bookingRef).length > 100)) {
      return res.status(400).json({ success: false, error: 'Input fields exceed maximum allowed character limit' });
    }

    const doc = await TravelDocument.create({
      tripId,
      title: title.trim(),
      category: category || 'OTHER',
      fileName: fileName.trim(),
      fileSize: fileSize || '180 KB',
      bookingRef: bookingRef ? String(bookingRef).trim() : '',
      notes: notes ? String(notes).trim() : '',
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/traveler-tools/vault/trip/:tripId/:docId
router.delete('/vault/trip/:tripId/:docId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, docId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ success: false, error: 'Invalid document ID format' });
    }

    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const deleted = await TravelDocument.findOneAndDelete({ _id: docId, tripId });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Document not found in this trip' });
    }

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== PACKING ASSISTANT ====================

// GET /api/v1/traveler-tools/packing/trip/:tripId
router.get('/packing/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, false);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { trip } = authResult.auth;
    let items = await PackingItem.find({ tripId }).sort({ category: 1, name: 1 });

    if (items.length === 0) {
      items = await PackingItem.create([
        { tripId, name: 'Passport & Physical Visa Documents', category: 'ESSENTIALS', quantity: 1, isPacked: true },
        { tripId, name: `Multi-Currency Forex Card / Local Cash (${trip.currency})`, category: 'ESSENTIALS', quantity: 1, isPacked: true },
        { tripId, name: 'Universal International Travel Power Plug Adapter', category: 'ELECTRONICS', quantity: 2, isPacked: true },
        { tripId, name: 'Comfortable Urban Walking Shoes (Sneakers)', category: 'CLOTHING', quantity: 2, isPacked: false },
        { tripId, name: 'Windproof Compact Travel Umbrella', category: 'WEATHER_SPECIFIC', quantity: 1, isPacked: false, isRecommendedByWeather: true },
        { tripId, name: 'Light Layering Jacket / Weather Shell', category: 'CLOTHING', quantity: 2, isPacked: false },
        { tripId, name: 'Portable 20,000mAh Power Bank (City Navigation & Maps)', category: 'ELECTRONICS', quantity: 1, isPacked: false },
        { tripId, name: 'Prescription Medication & Travel First-Aid Kit', category: 'HEALTH', quantity: 1, isPacked: false },
      ]);
    }

    const packedCount = items.filter((i) => i.isPacked).length;
    const totalCount = items.length;
    const progressPercentage = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

    res.json({
      success: true,
      data: {
        items,
        packedCount,
        totalCount,
        progressPercentage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/traveler-tools/packing/trip/:tripId
router.post('/packing/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { name, category, quantity, isRecommendedByWeather } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Item name is required' });
    }

    if (name.length > 250) {
      return res.status(400).json({ success: false, error: 'Item name cannot exceed 250 characters' });
    }

    const item = await PackingItem.create({
      tripId,
      name: name.trim(),
      category: category || 'ESSENTIALS',
      quantity: Number(quantity) || 1,
      isPacked: false,
      isRecommendedByWeather: !!isRecommendedByWeather,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/traveler-tools/packing/trip/:tripId/:itemId/toggle
router.patch('/packing/trip/:tripId/:itemId/toggle', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid packing item ID format' });
    }

    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const item = await PackingItem.findOne({ _id: itemId, tripId });
    if (!item) return res.status(404).json({ success: false, error: 'Packing item not found in this trip' });

    item.isPacked = !item.isPacked;
    await item.save();

    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/traveler-tools/packing/trip/:tripId/:itemId
router.delete('/packing/trip/:tripId/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid packing item ID format' });
    }

    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const deleted = await PackingItem.findOneAndDelete({ _id: itemId, tripId });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Packing item not found in this trip' });
    }

    res.json({ success: true, message: 'Item removed from packing list' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GROUP TRAVEL & COLLABORATION ====================

// GET /api/v1/traveler-tools/group/trip/:tripId
router.get('/group/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, false);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { trip } = authResult.auth;
    let members = await TripMember.find({ tripId }).sort({ createdAt: 1 });

    if (members.length === 0) {
      const ownerUser = await User.findById(trip.userId);
      const leadName = ownerUser?.name ? `${ownerUser.name} (Lead)` : 'Lead Organizer';
      const leadEmail = (ownerUser?.email || req.user!.email).toLowerCase();

      const isDemoTrip = trip.name.toLowerCase().includes('tokyo autumn discovery') || trip.name.toLowerCase().includes('demo seed');
      if (isDemoTrip && trip.travelersCount === 2) {
        members = await TripMember.create([
          {
            tripId,
            name: leadName,
            email: leadEmail,
            role: 'LEAD_ORGANIZER',
            sharePercentage: 50,
            contributedAmountMinor: Math.round(trip.totalBudgetMinor * 0.20),
          },
          {
            tripId,
            name: 'Jordan Lee (Traveler)',
            email: 'jordan@tripguard.ai',
            role: 'CO_TRAVELER',
            sharePercentage: 50,
            contributedAmountMinor: 0,
          },
        ]);
      } else if (trip.travelersCount > 1) {
        const sharePerPerson = Math.floor(100 / trip.travelersCount);
        const initialList: Array<{
          tripId: any;
          name: string;
          email: string;
          role: MemberRole;
          sharePercentage: number;
          contributedAmountMinor: number;
        }> = [
          {
            tripId,
            name: leadName,
            email: leadEmail,
            role: 'LEAD_ORGANIZER',
            sharePercentage: 100 - sharePerPerson * (trip.travelersCount - 1),
            contributedAmountMinor: 0,
          },
        ];
        for (let i = 2; i <= trip.travelersCount; i++) {
          initialList.push({
            tripId,
            name: `Co-Traveler ${i}`,
            email: `traveler${i}.${tripId.toString().slice(-4)}@group.tripguard.test`,
            role: 'CO_TRAVELER',
            sharePercentage: sharePerPerson,
            contributedAmountMinor: 0,
          });
        }
        members = await TripMember.create(initialList);
      } else {
        members = await TripMember.create([
          {
            tripId,
            name: leadName,
            email: leadEmail,
            role: 'LEAD_ORGANIZER',
            sharePercentage: 100,
            contributedAmountMinor: 0,
          },
        ]);
      }
    }

    const expenses = await Expense.find({ tripId, paymentStatus: 'SETTLED' });
    const totalExpensesMinor = expenses.reduce((sum, e) => sum + e.amountMinor, 0);

    // Exact Integer Fair Share Allocation using Hamilton (Largest Remainder) Method
    const totalShares = members.reduce((sum, m) => sum + (m.sharePercentage || 0), 0);
    const sharesBase = totalShares > 0 ? (totalShares > 100 ? totalShares : 100) : 100;

    interface MemberAllocation {
      member: any;
      exactShare: number;
      floorShare: number;
      fraction: number;
      finalFairShareMinor: number;
    }

    const allocations: MemberAllocation[] = members.map((m) => {
      const sharePct = m.sharePercentage || 0;
      const exactShare = totalShares > 0 ? (totalExpensesMinor * sharePct) / sharesBase : 0;
      const floorShare = Math.floor(exactShare);
      return {
        member: m,
        exactShare,
        floorShare,
        fraction: exactShare - floorShare,
        finalFairShareMinor: floorShare,
      };
    });

    const totalAllocatedFloor = allocations.reduce((sum, a) => sum + a.floorShare, 0);
    let remainderUnits = totalExpensesMinor > 0 && totalShares >= 100 ? totalExpensesMinor - totalAllocatedFloor : 0;

    // Distribute remaining minor units to members with largest fractional parts
    const sortedAllocations = [...allocations].sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < remainderUnits && i < sortedAllocations.length; i++) {
      sortedAllocations[i].finalFairShareMinor += 1;
    }

    const settlementSummary = allocations.map((alloc) => {
      const m = alloc.member;
      const fairShareMinor = alloc.finalFairShareMinor;
      const balanceMinor = m.contributedAmountMinor - fairShareMinor;
      return {
        memberId: m._id,
        name: m.name,
        email: m.email,
        role: m.role,
        sharePercentage: m.sharePercentage,
        contributedMinor: m.contributedAmountMinor,
        fairShareMinor,
        balanceMinor,
        status: balanceMinor >= 0 ? 'SETTLED_OR_CREDITOR' : 'DEBTOR',
      };
    });

    res.json({
      success: true,
      data: {
        members,
        totalExpensesMinor,
        settlementSummary,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/traveler-tools/group/trip/:tripId/member
router.post('/group/trip/:tripId/member', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    // Only lead organizer or trip owner can add co-travelers
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { name, email, role, sharePercentage, contributedAmountMinor } = req.body;

    if (!name || !email || typeof name !== 'string' || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Member name and email are required' });
    }

    if (name.length > 150 || email.length > 200) {
      return res.status(400).json({ success: false, error: 'Name or email exceeds maximum allowed length' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid email address format' });
    }

    const memberRole: MemberRole = role && ['LEAD_ORGANIZER', 'CO_TRAVELER', 'VIEWER'].includes(role) ? role : 'CO_TRAVELER';
    const share = typeof sharePercentage === 'number' ? Number(sharePercentage) : (memberRole === 'VIEWER' ? 0 : 25);
    if (isNaN(share) || share < 0 || share > 100) {
      return res.status(400).json({ success: false, error: 'Share percentage must be a number between 0% and 100%' });
    }

    const existingMembers = await TripMember.find({ tripId });
    const existingShareSum = existingMembers.reduce((sum, m) => sum + (m.sharePercentage || 0), 0);
    if (existingShareSum + share > 100) {
      return res.status(400).json({
        success: false,
        error: `Total group share percentage cannot exceed 100% (currently ${existingShareSum}%)`,
      });
    }

    const contribution = Number(contributedAmountMinor) || 0;
    if (isNaN(contribution) || contribution < 0) {
      return res.status(400).json({ success: false, error: 'Contributed amount must be a non-negative number' });
    }

    const member = await TripMember.create({
      tripId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: memberRole,
      sharePercentage: share,
      contributedAmountMinor: Math.round(contribution),
    });

    res.status(201).json({ success: true, data: member });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/traveler-tools/group/trip/:tripId/member/:memberId
router.put('/group/trip/:tripId/member/:memberId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, memberId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ success: false, error: 'Invalid member ID format' });
    }

    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const member = await TripMember.findOne({ _id: memberId, tripId });
    if (!member) return res.status(404).json({ success: false, error: 'Trip member not found in this trip' });

    const isLeadOrganizer = authResult.auth.userRole === 'LEAD_ORGANIZER';
    const isEditingSelf = member.email.toLowerCase() === req.user!.email.toLowerCase();

    // If caller is NOT a lead organizer, they can ONLY update their own payment contribution
    if (!isLeadOrganizer) {
      if (!isEditingSelf) {
        return res.status(403).json({ success: false, error: 'Co-travelers can only update their own payment contribution' });
      }
      if (req.body.role || typeof req.body.sharePercentage === 'number' || req.body.email || req.body.name) {
        return res.status(403).json({ success: false, error: 'Only the lead organizer can modify member roles, names, emails, or shares' });
      }
    }

    const { name, email, role, sharePercentage, contributedAmountMinor } = req.body;

    // Protect Lead Organizer from being demoted
    if (role && role !== 'LEAD_ORGANIZER' && member.role === 'LEAD_ORGANIZER') {
      return res.status(400).json({ success: false, error: 'Cannot demote the lead organizer of the trip' });
    }

    if (typeof sharePercentage === 'number') {
      if (isNaN(sharePercentage) || sharePercentage < 0 || sharePercentage > 100) {
        return res.status(400).json({ success: false, error: 'Share percentage must be a number between 0% and 100%' });
      }

      const otherMembers = await TripMember.find({ tripId, _id: { $ne: memberId } });
      const otherShareSum = otherMembers.reduce((sum, m) => sum + (m.sharePercentage || 0), 0);
      if (otherShareSum + sharePercentage > 100) {
        return res.status(400).json({
          success: false,
          error: `Total group share percentage cannot exceed 100% (currently ${otherShareSum}% without this member)`,
        });
      }
      member.sharePercentage = sharePercentage;
    }

    if (typeof contributedAmountMinor === 'number') {
      if (isNaN(contributedAmountMinor) || contributedAmountMinor < 0) {
        return res.status(400).json({ success: false, error: 'Contributed amount must be a non-negative number' });
      }
      member.contributedAmountMinor = Math.round(contributedAmountMinor);
    }

    if (name && typeof name === 'string') member.name = name.trim();
    if (email && typeof email === 'string') member.email = email.trim().toLowerCase();
    if (role && ['LEAD_ORGANIZER', 'CO_TRAVELER', 'VIEWER'].includes(role)) {
      member.role = role;
    }

    await member.save();
    res.json({ success: true, data: member });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/traveler-tools/group/trip/:tripId/member/:memberId
router.delete('/group/trip/:tripId/member/:memberId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, memberId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ success: false, error: 'Invalid member ID format' });
    }

    // Only lead organizer or owner can remove members
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const member = await TripMember.findOne({ _id: memberId, tripId });
    if (!member) return res.status(404).json({ success: false, error: 'Trip member not found in this trip' });

    // Protect Lead Organizer from being removed (even by themselves)
    if (member.role === 'LEAD_ORGANIZER') {
      return res.status(400).json({ success: false, error: 'Cannot remove the lead organizer of the trip' });
    }

    // Prevent removing a member with recorded contributions (protect financial ledger integrity)
    if (member.contributedAmountMinor > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot remove member with recorded financial contributions (${member.contributedAmountMinor} minor units). Reallocate or refund payments first.`,
      });
    }

    // Reclaim deleted member's share back to the Lead Organizer so total group shares always remain 100%
    if (member.sharePercentage > 0) {
      const leadOrganizer = await TripMember.findOne({ tripId, role: 'LEAD_ORGANIZER' });
      if (leadOrganizer) {
        leadOrganizer.sharePercentage = Math.min(100, leadOrganizer.sharePercentage + member.sharePercentage);
        await leadOrganizer.save();
      }
    }

    await TripMember.findOneAndDelete({ _id: memberId, tripId });
    res.json({ success: true, message: 'Member removed from group' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CARBON-AWARE ESTIMATES ====================

// GET /api/v1/traveler-tools/eco/trip/:tripId
router.get('/eco/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, false);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { trip } = authResult.auth;
    const durationMs = new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime();
    const daysCount = Math.max(1, Math.ceil(durationMs / 86400000));
    const travelers = Math.max(1, trip.travelersCount || 1);

    // Check for actual recorded Transit segments
    const { TransitTracking } = await import('../models/TransitTracking.js');
    const transits = await TransitTracking.find({ tripId });

    let flightCount = transits.filter((t) => t.type === 'FLIGHT').length;
    let trainCount = transits.filter((t) => t.type === 'TRAIN').length;

    // Baseline statistical calculation using DEFRA and ICAO benchmark intensity coefficients
    const flightEmissionsKg = flightCount > 0 ? Math.round(185 * flightCount * travelers) : Math.round(185 * travelers);
    const hotelEmissionsKg = Math.round(daysCount * 12.5 * travelers);
    const localTransitEmissionsKg = Math.round(daysCount * 4.5 * travelers);

    const totalEmissionsKg = flightEmissionsKg + hotelEmissionsKg + localTransitEmissionsKg;
    // Rail/public transit savings benchmark
    const greenRecoverySavingsKg = trainCount > 0 ? Math.round(trainCount * 35 * travelers) : Math.round(totalEmissionsKg * 0.12 * 10) / 10;

    const flightPct = Math.round((flightEmissionsKg / totalEmissionsKg) * 100);
    const hotelPct = Math.round((hotelEmissionsKg / totalEmissionsKg) * 100);
    const transitPct = Math.max(1, 100 - flightPct - hotelPct);

    // Standard Gold Standard carbon offset rate: ~$0.015 per kg
    const divisor = getMinorUnitDivisor(trip.currency);
    const carbonOffsetCostMinor = Math.round(totalEmissionsKg * 0.015 * divisor);

    const destCity = (trip.destination || 'destination').split(',')[0].trim();

    res.json({
      success: true,
      data: {
        totalEmissionsKg,
        breakdown: [
          { category: 'Aviation Transit', emissionsKg: flightEmissionsKg, percentage: flightPct },
          { category: 'Accommodation Energy', emissionsKg: hotelEmissionsKg, percentage: hotelPct },
          { category: 'Ground Transport', emissionsKg: localTransitEmissionsKg, percentage: transitPct },
        ],
        greenSavingsPossibleKg: greenRecoverySavingsKg,
        ecoRating: totalEmissionsKg < 200 ? 'A+' : totalEmissionsKg < 400 ? 'A-' : 'B+',
        carbonOffsetCostMinor,
        recommendationText: trainCount > 0
          ? `By maintaining electrified rail segments for connections in ${destCity}.`
          : `By choosing energy-efficient rail or public transit over private vehicle hire in ${destCity}.`,
        metadata: {
          isProviderVerified: false,
          estimationModel: 'STATISTICAL_BENCHMARK_MODEL',
          sourceVerificationStatus: 'UNVERIFIED_STATISTICAL_ESTIMATE',
          coefficientsSource: 'DEFRA 2023 / ICAO Carbon Emissions Calculator v12 Coefficients',
          calculationFormula: 'Total = (185 kg * flights * travelers) + (12.5 kg * days * travelers) + (4.5 kg * days * travelers)',
          units: 'kg CO2e',
          methodologyNotes: 'Estimates are computed from DEFRA and ICAO benchmark intensity coefficients (185 kg CO2e per passenger flight leg, 12.5 kg CO2e per hotel room-night, 4.5 kg CO2e per urban transit day). These values are deterministic mathematical approximations and are not verified by IoT or airline telemetry.',
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== TRANSIT & FLIGHT TRACKER ====================

// GET /api/v1/traveler-tools/transit/trip/:tripId
router.get('/transit/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, false);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { trip } = authResult.auth;
    const { TransitTracking } = await import('../models/TransitTracking.js');
    let items = await TransitTracking.find({ tripId }).sort({ departureTime: 1 });

    if (items.length === 0) {
      const destLower = (trip.destination || '').toLowerCase();
      const depDate = new Date(trip.startDate);

      if (destLower.includes('tokyo') || destLower.includes('japan')) {
        items = await TransitTracking.create([
          {
            tripId,
            type: 'FLIGHT',
            carrier: 'All Nippon Airways (ANA)',
            code: 'NH 827',
            departureCity: 'International Hub (DEL)',
            arrivalCity: 'Tokyo Narita (NRT)',
            departureTime: new Date(depDate.getTime() + 13 * 3600000).toISOString(),
            arrivalTime: new Date(depDate.getTime() + 23.5 * 3600000).toISOString(),
            status: 'ON_TIME',
            delayMinutes: 0,
            terminal: 'Terminal 1',
            gate: 'Gate 18',
            seat: '24K (Window)',
            trackingMode: 'MANUAL_VERIFIED',
            notes: 'Direct overnight flight. Special meal requested.',
          },
          {
            tripId,
            type: 'TRAIN',
            carrier: 'JR East Narita Express (N’EX)',
            code: 'N’EX 46',
            departureCity: 'Narita Airport T1',
            arrivalCity: 'Shinjuku Station',
            departureTime: new Date(depDate.getTime() + 25 * 3600000).toISOString(),
            arrivalTime: new Date(depDate.getTime() + 26.2 * 3600000).toISOString(),
            status: 'ON_TIME',
            delayMinutes: 0,
            terminal: 'B1F Rail Station',
            gate: 'Platform 1',
            seat: 'Car 4, Seat 7A',
            trackingMode: 'MANUAL_VERIFIED',
            notes: 'Covered under JR Pass exchange voucher.',
          },
        ]);
      } else if (destLower.includes('paris') || destLower.includes('france')) {
        items = await TransitTracking.create([
          {
            tripId,
            type: 'FLIGHT',
            carrier: 'Air France',
            code: 'AF 218',
            departureCity: 'International Hub',
            arrivalCity: 'Paris Charles de Gaulle (CDG)',
            departureTime: new Date(depDate.getTime() + 10 * 3600000).toISOString(),
            arrivalTime: new Date(depDate.getTime() + 19 * 3600000).toISOString(),
            status: 'ON_TIME',
            delayMinutes: 0,
            terminal: 'Terminal 2E',
            gate: 'Gate K32',
            seat: '16A',
            trackingMode: 'MANUAL_VERIFIED',
            notes: 'Direct flight into central European gateway.',
          },
          {
            tripId,
            type: 'TRAIN',
            carrier: 'RATP RER B Express',
            code: 'RER-B 104',
            departureCity: 'Aéroport CDG 2 TGV',
            arrivalCity: 'Gare du Nord, Paris',
            departureTime: new Date(depDate.getTime() + 20.5 * 3600000).toISOString(),
            arrivalTime: new Date(depDate.getTime() + 21.2 * 3600000).toISOString(),
            status: 'ON_TIME',
            delayMinutes: 0,
            terminal: 'RER Station Level 2',
            gate: 'Voie 11',
            seat: 'Open Seating',
            trackingMode: 'MANUAL_VERIFIED',
            notes: 'Navigo pass valid across all zones.',
          },
        ]);
      } else if (destLower.includes('new york') || destLower.includes('nyc')) {
        items = await TransitTracking.create([
          {
            tripId,
            type: 'FLIGHT',
            carrier: 'Delta Air Lines',
            code: 'DL 402',
            departureCity: 'International Hub',
            arrivalCity: 'New York JFK (JFK)',
            departureTime: new Date(depDate.getTime() + 8 * 3600000).toISOString(),
            arrivalTime: new Date(depDate.getTime() + 16 * 3600000).toISOString(),
            status: 'ON_TIME',
            delayMinutes: 0,
            terminal: 'Terminal 4',
            gate: 'Gate B26',
            seat: '21C',
            trackingMode: 'MANUAL_VERIFIED',
            notes: 'In-flight Wi-Fi and power outlets available.',
          },
          {
            tripId,
            type: 'TRAIN',
            carrier: 'JFK AirTrain + MTA Subway',
            code: 'AirTrain Jamaica',
            departureCity: 'JFK Terminal 4 AirTrain',
            arrivalCity: 'Midtown Manhattan',
            departureTime: new Date(depDate.getTime() + 17 * 3600000).toISOString(),
            arrivalTime: new Date(depDate.getTime() + 18 * 3600000).toISOString(),
            status: 'ON_TIME',
            delayMinutes: 0,
            terminal: 'AirTrain Platform',
            gate: 'Track 1',
            seat: 'Open Subway',
            trackingMode: 'MANUAL_VERIFIED',
            notes: 'Contactless OMNY tap at turnstiles.',
          },
        ]);
      }
    }

    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/traveler-tools/transit/trip/:tripId
router.post('/transit/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { TransitTracking } = await import('../models/TransitTracking.js');
    const {
      type,
      carrier,
      code,
      departureCity,
      arrivalCity,
      departureTime,
      arrivalTime,
      status,
      delayMinutes,
      terminal,
      gate,
      seat,
      notes,
    } = req.body;

    if (!carrier || !code || !departureCity || !arrivalCity) {
      return res.status(400).json({
        success: false,
        error: 'Carrier, flight/train code, departure and arrival locations are required',
      });
    }

    if (
      String(carrier).length > 150 ||
      String(code).length > 50 ||
      String(departureCity).length > 150 ||
      String(arrivalCity).length > 150
    ) {
      return res.status(400).json({ success: false, error: 'Transit input fields exceed maximum allowed character limits' });
    }

    const item = await TransitTracking.create({
      tripId,
      type: type || 'FLIGHT',
      carrier: String(carrier).trim(),
      code: String(code).trim().toUpperCase(),
      departureCity: String(departureCity).trim(),
      arrivalCity: String(arrivalCity).trim(),
      departureTime: departureTime || new Date().toISOString(),
      arrivalTime: arrivalTime || new Date().toISOString(),
      status: status || 'ON_TIME',
      delayMinutes: Number(delayMinutes) || 0,
      terminal: terminal ? String(terminal).trim() : '',
      gate: gate ? String(gate).trim() : '',
      seat: seat ? String(seat).trim() : '',
      trackingMode: 'MANUAL_VERIFIED',
      notes: notes ? String(notes).trim() : '',
    });

    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/traveler-tools/transit/trip/:tripId/:itemId/status
router.patch('/transit/trip/:tripId/:itemId/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid transit item ID format' });
    }

    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { TransitTracking } = await import('../models/TransitTracking.js');
    const { status, delayMinutes } = req.body;

    const item = await TransitTracking.findOne({ _id: itemId, tripId });
    if (!item) return res.status(404).json({ success: false, error: 'Transit record not found in this trip' });

    if (status) item.status = status;
    if (typeof delayMinutes === 'number') item.delayMinutes = delayMinutes;

    await item.save();
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/traveler-tools/transit/trip/:tripId/:itemId
router.delete('/transit/trip/:tripId/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId, itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid transit item ID format' });
    }

    const authResult = await getAuthorizedTripContext(tripId, req.user!.id, req.user!.email, true);
    if (!authResult.auth) {
      return res.status(authResult.errorStatus || 404).json({ success: false, error: authResult.errorMessage });
    }

    const { TransitTracking } = await import('../models/TransitTracking.js');
    const deleted = await TransitTracking.findOneAndDelete({ _id: itemId, tripId });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Transit record not found in this trip' });
    }

    res.json({ success: true, message: 'Transit record removed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
