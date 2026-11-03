import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { TravelDocument } from '../models/TravelDocument.js';
import { PackingItem } from '../models/PackingItem.js';
import { TripMember } from '../models/TripMember.js';
import { Trip } from '../models/Trip.js';
import { Booking } from '../models/Booking.js';
import { Expense } from '../models/Expense.js';
import { ItineraryItem } from '../models/ItineraryItem.js';

const router = Router();

// ==================== DOCUMENT VAULT ====================

// GET /api/v1/traveler-tools/vault/trip/:tripId
router.get('/vault/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    let docs = await TravelDocument.find({ tripId }).sort({ createdAt: -1 });

    if (docs.length === 0) {
      docs = await TravelDocument.create([
        {
          tripId,
          title: 'Narita International E-Ticket & Boarding Pass',
          category: 'FLIGHT',
          fileName: 'ANA-Flight-NH827-Ticket.pdf',
          fileSize: '340 KB',
          fileType: 'application/pdf',
          bookingRef: 'ANA-NH827-TYO',
          notes: 'Terminal 1 South Wing arrival gate. QR code saved on phone wallet.',
        },
        {
          tripId,
          title: 'Shinjuku Grand Tower Hotel Voucher',
          category: 'HOTEL',
          fileName: 'Shinjuku-Hotel-Confirmation.pdf',
          fileSize: '210 KB',
          fileType: 'application/pdf',
          bookingRef: 'BK-TOKYO-8921',
          notes: 'Check-in from 14:00. Non-smoking room, high floor requested.',
        },
        {
          tripId,
          title: 'Worldwide Comprehensive Travel Insurance',
          category: 'INSURANCE',
          fileName: 'Allianz-Global-Assistance-Policy.pdf',
          fileSize: '450 KB',
          fileType: 'application/pdf',
          bookingRef: 'INS-2026-99120',
          notes: 'Emergency 24/7 hotline: +81 3 5555 0199. ₹50,00,000 medical coverage.',
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
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    const { title, category, fileName, fileSize, bookingRef, notes } = req.body;

    if (!title || !fileName) {
      return res.status(400).json({ success: false, error: 'Title and file name are required' });
    }

    const doc = await TravelDocument.create({
      tripId,
      title,
      category: category || 'OTHER',
      fileName,
      fileSize: fileSize || '180 KB',
      bookingRef: bookingRef || '',
      notes: notes || '',
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
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    await TravelDocument.findOneAndDelete({ _id: docId, tripId });
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
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    let items = await PackingItem.find({ tripId }).sort({ category: 1, name: 1 });

    if (items.length === 0) {
      items = await PackingItem.create([
        { tripId, name: 'Passport & Physical Visa', category: 'ESSENTIALS', quantity: 1, isPacked: true },
        { tripId, name: 'Multi-Currency Forex Card / Cash JPY', category: 'ESSENTIALS', quantity: 1, isPacked: true },
        { tripId, name: 'Pocket Wi-Fi & Japanese Type-A Power Plug Adapters', category: 'ELECTRONICS', quantity: 2, isPacked: true },
        { tripId, name: 'Comfortable Urban Walking Shoes (Sneakers)', category: 'CLOTHING', quantity: 2, isPacked: false },
        { tripId, name: 'Windproof Compact Umbrella (Rain Forecast Day 3)', category: 'WEATHER_SPECIFIC', quantity: 1, isPacked: false, isRecommendedByWeather: true },
        { tripId, name: 'Light Layering Jacket / Fleece', category: 'CLOTHING', quantity: 2, isPacked: false },
        { tripId, name: 'Portable 20,000mAh Power Bank (Subway navigation)', category: 'ELECTRONICS', quantity: 1, isPacked: false },
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
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    const { name, category, quantity } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Item name is required' });

    const item = await PackingItem.create({
      tripId,
      name,
      category: category || 'ESSENTIALS',
      quantity: Number(quantity) || 1,
      isPacked: false,
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
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    const item = await PackingItem.findOne({ _id: itemId, tripId });
    if (!item) return res.status(404).json({ success: false, error: 'Packing item not found' });

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
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    await PackingItem.findOneAndDelete({ _id: itemId, tripId });
    res.json({ success: true, message: 'Item removed from packing list' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GROUP TRAVEL & EXPENSE SPLITTING ====================

// GET /api/v1/traveler-tools/group/trip/:tripId
router.get('/group/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    let members = await TripMember.find({ tripId }).sort({ createdAt: 1 });

    if (members.length === 0) {
      members = await TripMember.create([
        {
          tripId,
          name: 'Alex Rivera (Lead)',
          email: 'demo@tripguard.ai',
          role: 'LEAD_ORGANIZER',
          sharePercentage: 50,
          contributedAmountMinor: 1000000, // ₹10,000 paid for flights & visa
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
    }

    const expenses = await Expense.find({ tripId });
    const totalExpensesMinor = expenses.reduce((sum, e) => sum + e.amountMinor, 0);

    const settlementSummary = members.map((m) => {
      const fairShareMinor = Math.round((totalExpensesMinor * m.sharePercentage) / 100);
      const balanceMinor = m.contributedAmountMinor - fairShareMinor;
      return {
        memberId: m._id,
        name: m.name,
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
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    const { name, email, sharePercentage, contributedAmountMinor } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Member name and email are required' });
    }

    const member = await TripMember.create({
      tripId,
      name,
      email,
      role: 'CO_TRAVELER',
      sharePercentage: Number(sharePercentage) || 50,
      contributedAmountMinor: Number(contributedAmountMinor) || 0,
    });

    res.status(201).json({ success: true, data: member });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CARBON-AWARE ESTIMATES ====================

// GET /api/v1/traveler-tools/eco/trip/:tripId
router.get('/eco/trip/:tripId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, userId: req.user!.id });
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found or unauthorized' });

    const daysCount = 7;
    const flightEmissionsKg = 185;
    const hotelEmissionsKg = daysCount * 12.5;
    const localTransitEmissionsKg = 32.0;

    const totalEmissionsKg = Math.round(flightEmissionsKg + hotelEmissionsKg + localTransitEmissionsKg);
    const greenRecoverySavingsKg = 21.5;

    res.json({
      success: true,
      data: {
        totalEmissionsKg,
        breakdown: [
          { category: 'Aviation Transit', emissionsKg: flightEmissionsKg, percentage: 61 },
          { category: 'Accommodation Energy', emissionsKg: Math.round(hotelEmissionsKg), percentage: 29 },
          { category: 'Ground Transport', emissionsKg: Math.round(localTransitEmissionsKg), percentage: 10 },
        ],
        greenSavingsPossibleKg: greenRecoverySavingsKg,
        ecoRating: 'A-',
        carbonOffsetCostMinor: 45000,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
