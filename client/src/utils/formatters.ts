import { Currency } from '../types/index.js';

export function formatCurrency(amountMinor: number, currency: Currency = 'INR'): string {
  const amount = amountMinor / 100;
  
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })}`;
  }

  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
  return `${symbol}${amount.toLocaleString('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
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
