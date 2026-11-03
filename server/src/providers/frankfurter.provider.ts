import { getMinorUnitDivisor, getCurrencyDecimals } from '../config/constants.js';

export interface ExchangeRatesSnapshot {
  base: string;
  date: string;
  rates: Record<string, number>;
  fetchedAt: string;
  isStale: boolean;
  source: 'FRANKFURTER_LIVE' | 'FRANKFURTER_CACHED' | 'TEMPORARILY_UNAVAILABLE' | 'FALLBACK_STATIC_RATES' | 'PEGGED_USD_RATE';
}

export interface CurrencyConversionResult {
  fromCurrency: string;
  toCurrency: string;
  originalAmountMinor: number;
  originalAmountDecimal: number;
  convertedAmountDecimal: number;
  convertedAmountMinor: number;
  exchangeRate: number;
  rateDate: string;
  isStale: boolean;
  source: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache TTL
const REQUEST_TIMEOUT_MS = 5000;
const USD_AED_PEG_RATE = 3.6725;

export class FrankfurterProvider {
  private static cachedSnapshots: Map<string, ExchangeRatesSnapshot> = new Map();

  /**
   * Fetch current exchange rates from Frankfurter API with in-memory caching and stale fallback
   */
  static async getRates(
    base: string = 'INR',
    symbols: string[] = ['USD', 'EUR', 'GBP', 'JPY', 'SGD']
  ): Promise<ExchangeRatesSnapshot> {
    const baseCode = base.toUpperCase().trim();
    const cleanSymbols = symbols.map((s) => s.toUpperCase().trim()).filter((s) => s !== baseCode);
    const now = Date.now();

    const cacheKey = `${baseCode}:${cleanSymbols.sort().join(',')}`;
    const cached = this.cachedSnapshots.get(cacheKey);

    if (cached && now - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
      return {
        ...cached,
        isStale: false,
        source: 'FRANKFURTER_CACHED',
      };
    }

    // Filter out pegged currencies for live query (e.g. AED)
    const directSymbols = cleanSymbols.filter((s) => s !== 'AED');
    const needsAed = cleanSymbols.includes('AED') || baseCode === 'AED';
    if (needsAed && !directSymbols.includes('USD') && baseCode !== 'USD') {
      directSymbols.push('USD');
    }

    let ratesMap: Record<string, number> = {};
    let rateDate = new Date().toISOString().split('T')[0];
    let isLive = false;

    if (directSymbols.length > 0) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const queryBase = baseCode === 'AED' ? 'USD' : baseCode;
        const symList = directSymbols.join(',');
        const url = `https://api.frankfurter.app/latest?from=${queryBase}&to=${symList}`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          ratesMap = data.rates || {};
          rateDate = data.date || rateDate;
          isLive = true;

          // If base was AED, adjust rates (1 AED = 1/3.6725 USD)
          if (baseCode === 'AED') {
            const adjusted: Record<string, number> = { USD: 1 / USD_AED_PEG_RATE };
            for (const [k, v] of Object.entries(ratesMap)) {
              adjusted[k] = v / USD_AED_PEG_RATE;
            }
            ratesMap = adjusted;
          }
        }
      } catch {
        // Fall through
      }
    }

    // Handle AED pegging
    if (cleanSymbols.includes('AED')) {
      if (baseCode === 'USD') {
        ratesMap['AED'] = USD_AED_PEG_RATE;
      } else if (ratesMap['USD']) {
        ratesMap['AED'] = ratesMap['USD'] * USD_AED_PEG_RATE;
      }
    }

    if (isLive) {
      const snapshot: ExchangeRatesSnapshot = {
        base: baseCode,
        date: rateDate,
        rates: ratesMap,
        fetchedAt: new Date().toISOString(),
        isStale: false,
        source: 'FRANKFURTER_LIVE',
      };
      this.cachedSnapshots.set(cacheKey, snapshot);
      return snapshot;
    }

    // Return stale cache if available
    if (cached) {
      return {
        ...cached,
        isStale: true,
        source: 'FRANKFURTER_CACHED',
      };
    }

    // Reference rates baseline when completely offline
    const referenceUsdRates: Record<string, number> = {
      INR: 86.5,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 152.0,
      SGD: 1.34,
      AED: 3.6725,
      USD: 1.0,
    };

    const calculatedRates: Record<string, number> = {};
    const baseToUsd = baseCode === 'USD' ? 1 : 1 / (referenceUsdRates[baseCode] || 1);

    for (const sym of cleanSymbols) {
      const symFromUsd = referenceUsdRates[sym] || 1;
      calculatedRates[sym] = Math.round(baseToUsd * symFromUsd * 10000) / 10000;
    }

    const fallbackSnapshot: ExchangeRatesSnapshot = {
      base: baseCode,
      date: new Date().toISOString().split('T')[0],
      rates: calculatedRates,
      fetchedAt: new Date().toISOString(),
      isStale: true,
      source: 'FALLBACK_STATIC_RATES',
    };

    this.cachedSnapshots.set(cacheKey, fallbackSnapshot);
    return fallbackSnapshot;
  }

  /**
   * Pure display conversion utility that preserves exact ISO 4217 minor unit precision
   */
  static async convert(
    amountMinor: number,
    from: string = 'INR',
    to: string
  ): Promise<CurrencyConversionResult> {
    const fromCode = (from || 'INR').toUpperCase().trim();
    const toCode = (to || 'INR').toUpperCase().trim();

    const fromDivisor = getMinorUnitDivisor(fromCode);
    const toDivisor = getMinorUnitDivisor(toCode);
    const toDecimals = getCurrencyDecimals(toCode);

    const originalAmountDecimal = amountMinor / fromDivisor;

    if (fromCode === toCode) {
      return {
        fromCurrency: fromCode,
        toCurrency: toCode,
        originalAmountMinor: amountMinor,
        originalAmountDecimal,
        convertedAmountDecimal: originalAmountDecimal,
        convertedAmountMinor: amountMinor,
        exchangeRate: 1.0,
        rateDate: new Date().toISOString().split('T')[0],
        isStale: false,
        source: 'IDENTITY',
      };
    }

    const ratesSnapshot = await this.getRates(fromCode, [toCode]);
    const rate = ratesSnapshot.rates[toCode];

    if (!rate || typeof rate !== 'number') {
      throw new Error(`Exchange rate for currency pair ${fromCode}/${toCode} is currently unavailable`);
    }

    const convertedAmountDecimal =
      toDecimals === 0
        ? Math.round(originalAmountDecimal * rate)
        : Math.round(originalAmountDecimal * rate * Math.pow(10, toDecimals)) / Math.pow(10, toDecimals);

    const convertedAmountMinor = Math.round(convertedAmountDecimal * toDivisor);

    return {
      fromCurrency: fromCode,
      toCurrency: toCode,
      originalAmountMinor: amountMinor,
      originalAmountDecimal,
      convertedAmountDecimal,
      convertedAmountMinor,
      exchangeRate: rate,
      rateDate: ratesSnapshot.date,
      isStale: ratesSnapshot.isStale,
      source: ratesSnapshot.source,
    };
  }
}
