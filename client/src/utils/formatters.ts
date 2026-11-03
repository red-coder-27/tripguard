import { Currency } from '../types/index.js';

const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'ISK', 'PYG', 'UGX', 'RWF', 'BIF', 'DJF', 'GNF', 'KMF', 'XAF', 'XOF', 'XPF'
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'
]);

export function getCurrencyDivisor(currency: string): number {
  const code = (currency || 'INR').toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 1;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 1000;
  return 100;
}

export function getCurrencySymbol(currency: string): string {
  const code = (currency || 'INR').toUpperCase();
  const map: Record<string, string> = {
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
  };
  return map[code] || `${code} `;
}

export function formatCurrency(amountMinor: number, currency: Currency = 'INR'): string {
  const code = (currency || 'INR').toUpperCase();
  const divisor = getCurrencyDivisor(code);
  const amount = amountMinor / divisor;
  const isZeroDec = ZERO_DECIMAL_CURRENCIES.has(code);
  const isThreeDec = THREE_DECIMAL_CURRENCIES.has(code);
  const fracDigits = isZeroDec ? 0 : isThreeDec ? 3 : 0;
  
  const symbol = getCurrencySymbol(code);
  const locale = code === 'INR' ? 'en-IN' : code === 'JPY' ? 'ja-JP' : 'en-US';

  return `${symbol}${amount.toLocaleString(locale, {
    maximumFractionDigits: fracDigits,
    minimumFractionDigits: fracDigits,
  })}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

