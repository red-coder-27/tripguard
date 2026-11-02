// System constants for financial accounting and recovery algorithms

export const MINOR_UNITS: Record<string, number> = {
  INR: 100, // 100 paise = 1 INR
  USD: 100, // 100 cents = 1 USD
  EUR: 100, // 100 cents = 1 EUR
  GBP: 100, // 100 pence = 1 GBP
};

export const RISK_THRESHOLDS = {
  SAFE_MAX_RATIO: 0.85, // <= 85% of usable budget
  WATCH_MAX_RATIO: 1.00, // 85% to 100% of usable budget
  AT_RISK_MAX_RATIO: 1.00, // Usable budget < Projected <= Total budget (encroaching on reserve)
  // > 100% of total budget is OVER_BUDGET
};

export const DEFAULT_EMERGENCY_RESERVE_RATIO = 0.10; // 10% default safety reserve

export const DISRUPTION_WEIGHTS = {
  REMOVE_OPTIONAL_ACTIVITY: 15,
  REPLACE_TRANSPORT_SAME_WINDOW: 20,
  REPLACE_ACCOMMODATION_SAME_AREA: 25,
  REPLACE_ACTIVITY_WITH_FREE: 10,
  DOWNGRADE_HOTEL_TIER: 35,
};

export const SEED_DEMO = {
  EMAIL: 'demo@tripguard.ai',
  DEFAULT_PASSWORD: 'TripGuard2026!',
  TRIP_NAME: 'Tokyo Autumn Discovery 2026',
  DESTINATION: 'Tokyo, Japan',
  CURRENCY: 'INR',
  TOTAL_BUDGET_INR: 50000, // ₹50,000
  PROJECTED_EXPENDITURE_INR: 57000, // ₹57,000
  OVERSPENDING_INR: 7000, // ₹7,000
  TARGET_RECOVERED_INR: 50000,
};
