// System constants for financial accounting and recovery algorithms

// ISO 4217 minor unit exponent table
// 0 decimals: 1 standard unit = 1 minor unit (divisor = 1)
// 3 decimals: 1 standard unit = 1,000 minor units (divisor = 1,000)
// 2 decimals: 1 standard unit = 100 minor units (divisor = 100)
export const ISO_4217_DECIMALS: Record<string, number> = {
  // 0 decimals
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  ISK: 0,
  PYG: 0,
  UGX: 0,
  RWF: 0,
  BIF: 0,
  DJF: 0,
  GNF: 0,
  KMF: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,

  // 3 decimals
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
};

export function getCurrencyDecimals(currency: string): number {
  const code = (currency || 'USD').toUpperCase().trim();
  return ISO_4217_DECIMALS[code] ?? 2;
}

export function getMinorUnitDivisor(currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  return Math.pow(10, decimals);
}

export function getCurrencySymbol(currency: string): string {
  const code = (currency || 'USD').toUpperCase().trim();
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$',
    AED: 'AED ',
    CHF: 'CHF ',
    KWD: 'KD ',
    NZD: 'NZ$',
  };
  return symbols[code] || `${code} `;
}

export function formatCurrencyAmount(amountMinor: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase().trim();
  const decimals = getCurrencyDecimals(code);
  const divisor = Math.pow(10, decimals);
  const decimalAmount = amountMinor / divisor;
  const sym = getCurrencySymbol(code);
  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  return `${sym}${decimalAmount.toLocaleString(locale, {
    minimumFractionDigits: decimals > 0 ? decimals : 0,
    maximumFractionDigits: decimals,
  })}`;
}

export const MINOR_UNITS: Record<string, number> = {
  INR: 100,
  USD: 100,
  EUR: 100,
  GBP: 100,
  JPY: 1,
  SGD: 100,
  AED: 100,
  AUD: 100,
  CAD: 100,
  CHF: 100,
  KWD: 1000,
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

