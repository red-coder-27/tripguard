import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Trip } from '../models/Trip.js';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { Booking } from '../models/Booking.js';
import { Expense } from '../models/Expense.js';
import { RecoveryRun } from '../models/RecoveryRun.js';
import { AlternativeOption } from '../models/AlternativeOption.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { BUILTIN_ALTERNATIVES } from '../recovery/alternativesCatalog.js';
import { calculateFinancialForecast } from '../financial/forecasting.js';

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Initializing TripGuard demonstration database...');

  await connectDB();

  // 1. Seed or update demo user
  const demoEmail = 'demo@tripguard.ai';
  let demoUser = await User.findOne({ email: demoEmail });

  if (demoUser) {
    console.log('[Seed] Cleaning up previous demo data for idempotent re-seeding...');
    const userTrips = await Trip.find({ userId: demoUser._id });
    const tripIds = userTrips.map((t) => t._id);

    await Promise.all([
      ItineraryItem.deleteMany({ tripId: { $in: tripIds } }),
      Booking.deleteMany({ tripId: { $in: tripIds } }),
      Expense.deleteMany({ tripId: { $in: tripIds } }),
      RecoveryRun.deleteMany({ tripId: { $in: tripIds } }),
      AuditEvent.deleteMany({ tripId: { $in: tripIds } }),
      Trip.deleteMany({ userId: demoUser._id }),
    ]);
  } else {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TripGuard2026!', salt);

    demoUser = await User.create({
      name: 'Alex Rivera',
      email: demoEmail,
      passwordHash,
      baseCurrency: 'INR',
      emergencyReservePercentage: 10,
    });
    console.log('[Seed] Created demo user: demo@tripguard.ai / TripGuard2026!');
  }

  // 2. Seed catalog alternatives
  await AlternativeOption.deleteMany({});
  for (const alt of BUILTIN_ALTERNATIVES) {
    await AlternativeOption.create({
      category: alt.category,
      destination: alt.destination,
      name: alt.name,
      provider: alt.provider,
      costMinor: alt.costMinor,
      currency: 'INR',
      tier: alt.tier,
      rating: alt.rating,
      safetyCertified: alt.safetyCertified,
      distanceKmFromCenter: alt.distanceKmFromCenter,
      description: alt.description,
      cancellationTerms: alt.cancellationTerms,
    });
  }
  console.log(`[Seed] Seeded ${BUILTIN_ALTERNATIVES.length} alternative catalog options.`);

  // 3. Create canonical demonstration trip:
  // Budget: ₹50,000 (5,000,000 paise)
  // Projected Cost target: ₹57,000 (5,700,000 paise)
  // Overspending gap: ₹7,000 (700,000 paise)
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 10);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 16);

  const demoTrip = await Trip.create({
    userId: demoUser._id,
    name: 'Tokyo Autumn Discovery 2026',
    destination: 'Tokyo, Japan',
    startDate,
    endDate,
    travelersCount: 1,
    totalBudgetMinor: 5000000, // ₹50,000
    emergencyReserveMinor: 0, // In this demo, we test usable budget = ₹50,000
    currency: 'INR',
    status: 'ACTIVE',
    currentVersion: 1,
    preferences: {
      primaryInterests: ['Heritage', 'Culinary', 'City Views', 'Photography'],
      travelPace: 'BALANCED',
      accommodationPreference: 'BOUTIQUE',
    },
  });

  // 4. Seed Confirmed Bookings:
  // Accommodation Booking: Grand Shinjuku Hotel - ₹12,000 total (Outstanding ₹12,000)
  // Transport Booking: Private VIP Airport Taxi Transfer - ₹4,500 total (Outstanding ₹4,500)
  const bookingHotel = await Booking.create({
    tripId: demoTrip._id,
    category: 'ACCOMMODATION',
    provider: 'Shinjuku Grand Tower Hotel & Spa',
    bookingReference: 'BK-TOKYO-8921',
    totalCostMinor: 1200000, // ₹12,000
    paidAmountMinor: 0,
    outstandingAmountMinor: 1200000,
    currency: 'INR',
    travelDate: startDate,
    status: 'CONFIRMED',
    cancellationPolicy: {
      isRefundable: true,
      freeCancellationDeadline: new Date(startDate.getTime() - 48 * 3600 * 1000),
      cancellationFeeMinor: 0,
      refundableAmountMinor: 0,
      policyNotes: 'Free cancellation permitted up to 48 hours prior to arrival',
    },
    notes: 'Premium city view king room reserved with late checkout guaranteed.',
  });

  const bookingTaxi = await Booking.create({
    tripId: demoTrip._id,
    category: 'TRANSPORT',
    provider: 'Tokyo VIP Executive Chauffeur Services',
    bookingReference: 'BK-TX-5412',
    totalCostMinor: 450000, // ₹4,500
    paidAmountMinor: 0,
    outstandingAmountMinor: 450000,
    currency: 'INR',
    travelDate: startDate,
    status: 'CONFIRMED',
    cancellationPolicy: {
      isRefundable: true,
      cancellationFeeMinor: 0,
      refundableAmountMinor: 0,
      policyNotes: 'Full refund upon cancellation up to 24 hours prior',
    },
    notes: 'Private executive sedan airport transfer from Narita Airport directly to hotel.',
  });

  // 5. Seed Itinerary Items
  // Breakdown of costs:
  // - Hotel (Accommodation): ₹12,000 (FLEXIBLE) -> Booking linked
  // - Private Airport Taxi (Transport): ₹4,500 (FLEXIBLE) -> Booking linked
  // - Senso-ji Temple & Asakusa Walking: ₹0 (MUST_DO, Locked)
  // - Tsukiji Outer Market Seafood Tasting: ₹5,000 (MUST_DO)
  // - Shibuya Crossing & Hachiko Memorial: ₹0 (MUST_DO)
  // - TeamLab Planets Digital Art Immersive: ₹4,000 (MUST_DO)
  // - Shibuya Sky Observation Deck Ticket: ₹1,500 (OPTIONAL)
  // - Shinjuku Omoide Yokocho Food & Dining: ₹4,500 (FLEXIBLE)
  // - Akihabara Anime & Electronics Exploration: ₹3,500 (FLEXIBLE)
  // - Meiji Shrine & Yoyogi Park Stroll: ₹1,000 (FLEXIBLE)
  // - Tokyo Metro 72-Hour Tourist Pass: ₹1,000 (FLEXIBLE)
  // - Traditional Soba Making Workshop: ₹3,500 (FLEXIBLE)
  // - Ginza Luxury District Window Shopping: ₹1,500 (OPTIONAL)
  // - Souvenirs & Matcha Confectionery: ₹2,500 (FLEXIBLE)
  // - Miscellaneous Emergency Cash Buffer: ₹2,500 (FLEXIBLE)
  // Total of above unbooked estimates:
  // 5000 + 4000 + 1500 + 4500 + 3500 + 1000 + 1000 + 3500 + 1500 + 2500 + 2500 = ₹30,500
  // Plus Bookings (12,000 + 4,500) = ₹16,500
  // Plus Settled Expenses (see below):
  // Visa application fee: ₹2,500 (settled)
  // Travel insurance policy: ₹3,500 (settled)
  // Pocket Wi-Fi router rental: ₹4,000 (settled)
  // Settled expenses total = ₹10,000
  // TOTAL PROJECTED COST: 10,000 (settled) + 16,500 (bookings) + 30,500 (itinerary estimates) = ₹57,000!
  // TOTAL BUDGET: ₹50,000
  // OVERSPENDING GAP: EXACTLY ₹7,000!

  const itemHotel = await ItineraryItem.create({
    tripId: demoTrip._id,
    dayNumber: 1,
    date: startDate,
    title: 'Check-in: Shinjuku Grand Tower Hotel',
    description: 'Boutique stay in Shinjuku central district.',
    category: 'ACCOMMODATION',
    startTime: '14:00',
    endTime: '15:00',
    location: 'Shinjuku, Tokyo',
    estimatedCostMinor: 1200000,
    priority: 'FLEXIBLE',
    isLocked: false,
    bookingId: bookingHotel._id,
    version: 1,
  });
  bookingHotel.itineraryItemId = itemHotel._id as any;
  await bookingHotel.save();

  const itemTaxi = await ItineraryItem.create({
    tripId: demoTrip._id,
    dayNumber: 1,
    date: startDate,
    title: 'Private Airport VIP Taxi Transfer',
    description: 'Chauffeur airport transfer to Shinjuku hotel.',
    category: 'TRANSPORT',
    startTime: '11:00',
    endTime: '12:30',
    location: 'Narita Airport -> Shinjuku',
    estimatedCostMinor: 450000,
    priority: 'FLEXIBLE',
    isLocked: false,
    bookingId: bookingTaxi._id,
    version: 1,
  });
  bookingTaxi.itineraryItemId = itemTaxi._id as any;
  await bookingTaxi.save();

  await ItineraryItem.create([
    {
      tripId: demoTrip._id,
      dayNumber: 1,
      date: startDate,
      title: 'Shibuya Sky Observation Deck at Sunset',
      description: 'Paid open-air rooftop observation deck overlooking Shibuya Crossing.',
      category: 'ACTIVITY',
      startTime: '17:30',
      endTime: '19:00',
      location: 'Shibuya Scramble Square',
      estimatedCostMinor: 150000, // ₹1,500
      priority: 'OPTIONAL', // Will be replaced/saved during recovery!
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 2,
      date: new Date(startDate.getTime() + 1 * 86400000),
      title: 'Senso-ji Temple Sunrise & Asakusa Old Town',
      description: 'Tokyo’s oldest Buddhist temple and Nakamise-dori historic stalls.',
      category: 'ACTIVITY',
      startTime: '07:30',
      endTime: '10:00',
      location: 'Asakusa, Taito',
      estimatedCostMinor: 0,
      priority: 'MUST_DO',
      isLocked: true, // Non-negotiable hard constraint
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 2,
      date: new Date(startDate.getTime() + 1 * 86400000),
      title: 'Tsukiji Outer Market Culinary Tasting Experience',
      description: 'Fresh sashimi, tamagoyaki, wagyu skewers, and fresh sea urchin tasting.',
      category: 'FOOD_DINING',
      startTime: '11:00',
      endTime: '13:30',
      location: 'Tsukiji, Chuo',
      estimatedCostMinor: 500000, // ₹5,000
      priority: 'MUST_DO',
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 3,
      date: new Date(startDate.getTime() + 2 * 86400000),
      title: 'teamLab Planets Immersive Digital Art',
      description: 'World-renowned barefoot digital water and crystal light museum.',
      category: 'ACTIVITY',
      startTime: '10:00',
      endTime: '12:30',
      location: 'Toyosu, Koto',
      estimatedCostMinor: 400000, // ₹4,000
      priority: 'MUST_DO',
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 3,
      date: new Date(startDate.getTime() + 2 * 86400000),
      title: 'Omoide Yokocho Izakaya Dinner',
      description: 'Authentic yakitori alley under nostalgic lantern glow.',
      category: 'FOOD_DINING',
      startTime: '19:00',
      endTime: '21:00',
      location: 'Shinjuku West',
      estimatedCostMinor: 450000, // ₹4,500
      priority: 'FLEXIBLE',
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 4,
      date: new Date(startDate.getTime() + 3 * 86400000),
      title: 'Akihabara Electric Town Tech Exploration',
      description: 'Retro gaming arcades, high-tech gadgets, and anime culture.',
      category: 'SHOPPING',
      startTime: '13:00',
      endTime: '16:00',
      location: 'Akihabara, Chiyoda',
      estimatedCostMinor: 350000, // ₹3,500
      priority: 'FLEXIBLE',
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 4,
      date: new Date(startDate.getTime() + 3 * 86400000),
      title: 'Meiji Jingu Shrine Forest Stroll',
      description: 'Peaceful evergreen Shinto shrine dedicated to Emperor Meiji.',
      category: 'ACTIVITY',
      startTime: '09:00',
      endTime: '11:00',
      location: 'Shibuya, Harajuku',
      estimatedCostMinor: 100000, // ₹1,000
      priority: 'FLEXIBLE',
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 5,
      date: new Date(startDate.getTime() + 4 * 86400000),
      title: 'Tokyo Metro Pass Allowance',
      description: 'Unlimited subway network transit across Tokyo metro lines.',
      category: 'TRANSPORT',
      startTime: '08:00',
      endTime: '22:00',
      location: 'Tokyo Transit Grid',
      estimatedCostMinor: 100000, // ₹1,000
      priority: 'FLEXIBLE',
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 5,
      date: new Date(startDate.getTime() + 4 * 86400000),
      title: 'Traditional Soba Noodle Masterclass',
      description: 'Hands-on buckwheat soba rolling and cutting workshop with master chef.',
      category: 'ACTIVITY',
      startTime: '14:00',
      endTime: '16:30',
      location: 'Kanda, Chiyoda',
      estimatedCostMinor: 350000, // ₹3,500
      priority: 'FLEXIBLE',
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 6,
      date: new Date(startDate.getTime() + 5 * 86400000),
      title: 'Ginza Architecture & Cultural Shopping',
      description: 'World-class architecture, stationery flagships, and art galleries.',
      category: 'SHOPPING',
      startTime: '11:00',
      endTime: '14:00',
      location: 'Ginza, Chuo',
      estimatedCostMinor: 150000, // ₹1,500
      priority: 'OPTIONAL',
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 6,
      date: new Date(startDate.getTime() + 5 * 86400000),
      title: 'Artisan Matcha Confectionery & Gifts',
      description: 'Traditional Uji matcha treats, ceremonial tea, and ceramics.',
      category: 'FOOD_DINING',
      startTime: '15:00',
      endTime: '17:00',
      location: 'Nihonbashi',
      estimatedCostMinor: 250000, // ₹2,500
      priority: 'FLEXIBLE',
      isLocked: false,
      version: 1,
    },
    {
      tripId: demoTrip._id,
      dayNumber: 7,
      date: endDate,
      title: 'Departure & Incidental Transit Buffer',
      description: 'Luggage storage and airport return transit.',
      category: 'MISC',
      startTime: '10:00',
      endTime: '15:00',
      location: 'Tokyo -> Airport',
      estimatedCostMinor: 250000, // ₹2,500
      priority: 'FLEXIBLE',
      isLocked: false,
      version: 1,
    },
  ]);

  // 6. Seed Settled Actual Expenses
  await Expense.create([
    {
      tripId: demoTrip._id,
      description: 'Japan Tourist Visa Processing & Biometrics',
      category: 'MISC',
      amountMinor: 250000, // ₹2,500
      currency: 'INR',
      date: new Date(today.getTime() - 10 * 86400000),
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'SETTLED',
      notes: 'Consular visa processing fee paid in full.',
    },
    {
      tripId: demoTrip._id,
      description: 'International Comprehensive Travel & Health Insurance',
      category: 'MISC',
      amountMinor: 350000, // ₹3,500
      currency: 'INR',
      date: new Date(today.getTime() - 8 * 86400000),
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'SETTLED',
      notes: 'Medical emergency and flight delay coverage.',
    },
    {
      tripId: demoTrip._id,
      description: 'Unlimited 4G Pocket Wi-Fi Hotspot Rental (7 Days)',
      category: 'TRANSPORT',
      amountMinor: 400000, // ₹4,000
      currency: 'INR',
      date: new Date(today.getTime() - 5 * 86400000),
      paymentMethod: 'UPI',
      paymentStatus: 'SETTLED',
      notes: 'Prepaid pocket router for unlimited mobile navigation across Japan.',
    },
  ]);

  // 7. Verify Mathematical Correctness of Seed Data
  const [seededItems, seededBookings, seededExpenses] = await Promise.all([
    ItineraryItem.find({ tripId: demoTrip._id, isRemoved: false }),
    Booking.find({ tripId: demoTrip._id }),
    Expense.find({ tripId: demoTrip._id }),
  ]);

  const forecast = calculateFinancialForecast(demoTrip, seededItems, seededBookings, seededExpenses);

  console.log('----------------------------------------------------');
  console.log('[Seed] VERIFICATION OF FINANCIAL DIAGNOSIS:');
  console.log(`- Trip: ${demoTrip.name}`);
  console.log(`- Total Budget: ₹${(forecast.totalBudgetMinor / 100).toLocaleString()}`);
  console.log(`- Actual Settled Expenses: ₹${(forecast.settledExpensesMinor / 100).toLocaleString()}`);
  console.log(`- Outstanding Booking Commitments: ₹${(forecast.outstandingCommitmentsMinor / 100).toLocaleString()}`);
  console.log(`- Future Itinerary Estimates: ₹${(forecast.futureEstimatesMinor / 100).toLocaleString()}`);
  console.log(`- PROJECTED FINAL COST: ₹${(forecast.projectedFinalCostMinor / 100).toLocaleString()}`);
  console.log(`- OVERSPENDING GAP: ₹${(forecast.overspendingGapMinor / 100).toLocaleString()}`);
  console.log(`- RISK STATUS: ${forecast.riskStatus}`);
  console.log(`- RISK REASON: ${forecast.riskReason}`);
  console.log('----------------------------------------------------');

  if (
    forecast.totalBudgetMinor === 5000000 &&
    forecast.projectedFinalCostMinor === 5700000 &&
    forecast.overspendingGapMinor === 700000
  ) {
    console.log('SUCCESS: Seed scenario precisely matches the master specification!');
    console.log('Budget = ₹50,000 | Projected = ₹57,000 | Overspending Gap = ₹7,000');
  } else {
    console.warn('WARNING: Seed scenario figures deviated slightly from target ₹50k / ₹57k / ₹7k');
  }

  // Create initial audit log
  await AuditEvent.create({
    tripId: demoTrip._id,
    userId: demoUser._id,
    eventType: 'TRIP_CREATED',
    metadata: {
      seedScenario: 'Tokyo Autumn Discovery 2026',
      totalBudgetMinor: forecast.totalBudgetMinor,
      projectedCostMinor: forecast.projectedFinalCostMinor,
      overspendingGapMinor: forecast.overspendingGapMinor,
    },
  });

  console.log('[Seed] Seed completed successfully.');
}

// Allow direct CLI invocation
if (process.argv[1]?.endsWith('seedData.ts') || process.argv[1]?.endsWith('seedData.js')) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Failed:', err);
      await disconnectDB();
      process.exit(1);
    });
}

