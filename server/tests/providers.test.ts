import { describe, it, expect } from 'vitest';
import { GeoapifyProvider } from '../src/providers/geoapify.provider.js';
import { OpenWeatherProvider } from '../src/providers/openweather.provider.js';
import { FrankfurterProvider } from '../src/providers/frankfurter.provider.js';

describe('External Provider Integration & Client Suite', () => {
  describe('Geoapify Geospatial Services', () => {
    it('forward geocodes location queries accurately', async () => {
      const res = await GeoapifyProvider.geocode('Tokyo Station');
      expect(res.lat).toBeGreaterThan(35.0);
      expect(res.lon).toBeGreaterThan(139.0);
      expect(res.formatted).toBeTruthy();
      expect(['GEOAPIFY', 'DETERMINISTIC_FALLBACK']).toContain(res.source);
    }, 15000);

    it('reverse geocodes coordinates to street address', async () => {
      const res = await GeoapifyProvider.reverseGeocode(35.6586, 139.7454);
      expect(res.lat).toBe(35.6586);
      expect(res.lon).toBe(139.7454);
      expect(res.formatted).toBeTruthy();
    }, 15000);

    it('discovers nearby tourism places within radius', async () => {
      const places = await GeoapifyProvider.searchPlaces(35.6895, 139.7005, 'tourism.sights', 3000, 3);
      expect(places.length).toBeGreaterThanOrEqual(1);
      expect(places[0].name).toBeTruthy();
      expect(places[0].distanceMeters).toBeGreaterThanOrEqual(0);
    }, 15000);

    it('calculates driving route geometry and travel time', async () => {
      const route = await GeoapifyProvider.calculateRoute(
        [
          { lat: 35.6938, lon: 139.7034 },
          { lat: 35.6585, lon: 139.7022 },
        ],
        'drive'
      );
      expect(route.distanceKm).toBeGreaterThan(1.0);
      expect(route.timeMinutes).toBeGreaterThan(1);
      expect(route.coordinates.length).toBeGreaterThanOrEqual(2);
    }, 15000);

    it('returns autocomplete suggestions for search input', async () => {
      const suggestions = await GeoapifyProvider.autocomplete('Shinjuku');
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions[0].formatted).toContain('Shinjuku');
    }, 15000);
  });

  describe('OpenWeather Meteorological Intelligence', () => {
    it('retrieves current weather with temperature in Celsius and retrieval timestamp', async () => {
      const current = await OpenWeatherProvider.getCurrentWeather(35.6895, 139.6917);
      expect(typeof current.tempC).toBe('number');
      expect(current.humidity).toBeGreaterThanOrEqual(0);
      expect(current.retrievedAt).toBeTruthy();
      expect(new Date(current.retrievedAt).getTime()).not.toBeNaN();
    }, 15000);

    it('generates multi-day forecast with precipitation probability and outdoor advice', async () => {
      const forecast = await OpenWeatherProvider.getForecast(35.6895, 139.6917);
      expect(forecast.dailyForecasts.length).toBeGreaterThanOrEqual(3);
      const day1 = forecast.dailyForecasts[0];
      expect(day1.tempMaxC).toBeGreaterThanOrEqual(day1.tempMinC);
      expect(typeof day1.isOutdoorWarning).toBe('boolean');
      expect(day1.recommendation).toBeTruthy();
    }, 15000);
  });

  describe('Frankfurter Currency Conversion (Keyless)', () => {
    it('fetches dynamic exchange rates from Frankfurter and caches them', async () => {
      const snapshot = await FrankfurterProvider.getRates('INR', ['USD', 'EUR', 'GBP', 'JPY']);
      expect(snapshot.base).toBe('INR');
      expect(snapshot.rates.USD).toBeGreaterThan(0);
      expect(snapshot.rates.JPY).toBeGreaterThan(0);
      expect(snapshot.date).toBeTruthy();

      // Second call should return cached snapshot
      const cached = await FrankfurterProvider.getRates('INR', ['USD', 'EUR', 'GBP', 'JPY']);
      expect(cached.rates.USD).toBe(snapshot.rates.USD);
      expect(['FRANKFURTER_CACHED', 'FALLBACK_STATIC_RATES']).toContain(cached.source);
    }, 15000);

    it('converts minor currency units (paise) accurately without altering base ledger', async () => {
      // Convert ₹5,000 (500,000 paise) to USD
      const result = await FrankfurterProvider.convert(500000, 'INR', 'USD');
      expect(result.fromCurrency).toBe('INR');
      expect(result.toCurrency).toBe('USD');
      expect(result.originalAmountDecimal).toBe(5000);
      expect(result.convertedAmountDecimal).toBeGreaterThan(0);
      expect(result.exchangeRate).toBeGreaterThan(0);
    }, 15000);

    it('returns identity conversion when from and to currencies match', async () => {
      const result = await FrankfurterProvider.convert(100000, 'INR', 'INR');
      expect(result.originalAmountDecimal).toBe(1000);
      expect(result.convertedAmountDecimal).toBe(1000);
      expect(result.exchangeRate).toBe(1.0);
    }, 15000);
  });
});
