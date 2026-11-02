import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { buildCanonicalLedger } from '../src/financial/accounting.js';
import { calculateFinancialForecast } from '../src/financial/forecasting.js';

describe('TripGuard Canonical Financial Accounting', () => {
  const dummyTripId = new mongoose.Types.ObjectId();
  const dummyTrip: any = {
    _id: dummyTripId,
    name: 'Test Financial Audit Trip',
    currency: 'INR',
    totalBudgetMinor: 5000000, // ₹50,000
    emergencyReserveMinor: 500000, // ₹5,000 (10% reserve)
    currentVersion: 1,
  };

  it('eliminates double counting between confirmed bookings and linked expenses', () => {
    const bookingId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();

    const bookings: any[] = [
      {
        _id: bookingId,
        category: 'ACCOMMODATION',
        provider: 'Hotel Plaza',
        totalCostMinor: 1200000, // ₹12,000
        paidAmountMinor: 400000, // ₹4,000 paid at booking
        outstandingAmountMinor: 800000, // ₹8,000 outstanding
        itineraryItemId: itemId,
        status: 'CONFIRMED',
      },
    ];

    // Expense linked to the same booking for the paid portion
    const expenses: any[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        bookingId,
        itineraryItemId: itemId,
        description: 'Hotel Deposit',
        category: 'ACCOMMODATION',
        amountMinor: 400000, // ₹4,000
        paymentStatus: 'SETTLED',
      },
    ];

    // Itinerary item representing the hotel stay
    const items: any[] = [
      {
        _id: itemId,
        title: 'Plaza Hotel Stay',
        category: 'ACCOMMODATION',
        estimatedCostMinor: 1200000, // Estimated ₹12,000
        isRemoved: false,
      },
    ];

    const ledger = buildCanonicalLedger(dummyTrip, items, bookings, expenses);

    // Settled should be ₹4,000 (from expense/paid amount)
    expect(ledger.settledExpensesMinor).toBe(400000);
    // Outstanding should be ₹8,000
    expect(ledger.outstandingCommitmentsMinor).toBe(800000);
    // Future estimates should be 0 because the itinerary item is linked to the booking
    expect(ledger.futureEstimatesMinor).toBe(0);
    // Total projected cost must be exactly ₹12,000 (not 12k + 12k + 4k = 28k!)
    expect(ledger.projectedFinalCostMinor).toBe(1200000);
  });

  it('accurately computes forecast and overspending gap in integer paise', () => {
    // ₹10,000 settled + ₹16,500 outstanding + ₹30,500 future estimates = ₹57,000
    const bookings: any[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        category: 'ACCOMMODATION',
        provider: 'Hotel',
        totalCostMinor: 1200000,
        paidAmountMinor: 0,
        outstandingAmountMinor: 1200000,
        status: 'CONFIRMED',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        category: 'TRANSPORT',
        provider: 'Taxi',
        totalCostMinor: 450000,
        paidAmountMinor: 0,
        outstandingAmountMinor: 450000,
        status: 'CONFIRMED',
      },
    ];

    const expenses: any[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        description: 'Pre-trip Visa & Insurance',
        category: 'MISC',
        amountMinor: 1000000, // ₹10,000
        paymentStatus: 'SETTLED',
      },
    ];

    const items: any[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Activities',
        category: 'ACTIVITY',
        estimatedCostMinor: 3050000, // ₹30,500
        isRemoved: false,
      },
    ];

    const tripNoReserve: any = {
      ...dummyTrip,
      emergencyReserveMinor: 0,
      totalBudgetMinor: 5000000, // ₹50,000
    };

    const forecast = calculateFinancialForecast(tripNoReserve, items, bookings, expenses);

    expect(forecast.totalBudgetMinor).toBe(5000000);
    expect(forecast.projectedFinalCostMinor).toBe(5700000);
    expect(forecast.overspendingGapMinor).toBe(700000); // Exactly ₹7,000 gap
    expect(forecast.riskStatus).toBe('OVER_BUDGET');
  });

  it('correctly triggers WATCH and AT_RISK status thresholds', () => {
    const tripWithReserve: any = {
      _id: dummyTripId,
      currency: 'INR',
      totalBudgetMinor: 10000000, // ₹100,000
      emergencyReserveMinor: 1000000, // ₹10,000 (Usable = ₹90,000)
    };

    // Case 1: 80,000 is 88.8% of usable (90k) -> WATCH (85% - 100%)
    const itemsWatch: any[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Item',
        category: 'ACTIVITY',
        estimatedCostMinor: 8000000,
        isRemoved: false,
      },
    ];
    const forecastWatch = calculateFinancialForecast(tripWithReserve, itemsWatch, [], []);
    expect(forecastWatch.riskStatus).toBe('WATCH');

    // Case 2: 95,000 is > usable (90k) but <= total (100k) -> AT_RISK (encroaching on reserve)
    const itemsAtRisk: any[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Item',
        category: 'ACTIVITY',
        estimatedCostMinor: 9500000,
        isRemoved: false,
      },
    ];
    const forecastAtRisk = calculateFinancialForecast(tripWithReserve, itemsAtRisk, [], []);
    expect(forecastAtRisk.riskStatus).toBe('AT_RISK');
  });
});
