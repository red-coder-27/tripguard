import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { GeoapifyProvider } from '../providers/geoapify.provider.js';
import { OpenWeatherProvider } from '../providers/openweather.provider.js';
import { FrankfurterProvider } from '../providers/frankfurter.provider.js';

const router = Router();

// GET /api/health/integrations - Comprehensive status of all external providers
router.get('/health/integrations', async (req, res) => {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;
    const isUsingAtlas = mongoose.connection.host?.includes('mongodb.net') || false;

    // Check Frankfurter
    let frankfurterStatus = 'PASS';
    let ratesSnapshot: any = null;
    try {
      ratesSnapshot = await FrankfurterProvider.getRates('INR', ['USD', 'EUR', 'GBP', 'JPY']);
      if (ratesSnapshot.source === 'TEMPORARILY_UNAVAILABLE') {
        frankfurterStatus = 'UNAVAILABLE';
      }
    } catch {
      frankfurterStatus = 'FAIL';
    }

    const payload = {
      timestamp: new Date().toISOString(),
      service: 'TripGuard Integration Gateway',
      environment: env.NODE_ENV,
      integrations: {
        mongodb: {
          configured: !!env.MONGODB_URI,
          status: isMongoConnected ? (isUsingAtlas ? 'PASS (Atlas)' : 'PASS (Embedded Memory)') : 'DISCONNECTED',
          database: mongoose.connection.name || 'tripguard',
          hostType: isUsingAtlas ? 'MongoDB Atlas Cluster' : 'Embedded In-Memory Engine',
        },
        gemini: {
          configured: !!env.GEMINI_API_KEY,
          status: env.GEMINI_API_KEY ? 'PASS' : 'FALLBACK_DETERMINISTIC',
          model: env.GEMINI_MODEL,
          explanationEngine: 'Google Gemini 2.5 Flash + Ground Truth TS Fallback',
        },
        maptiler: {
          configured: !!env.MAPTILER_API_KEY,
          status: env.MAPTILER_API_KEY ? 'PASS' : 'FALLBACK_LEAFLET_TILES',
          styleSupported: 'streets-v4 / streets-v2',
          allowedOrigins: [env.CORS_ORIGIN, 'http://localhost:5173'],
        },
        geoapify: {
          configured: !!env.GEOAPIFY_API_KEY,
          status: env.GEOAPIFY_API_KEY ? 'PASS' : 'FALLBACK_DETERMINISTIC',
          services: ['geocoding', 'reverse-geocoding', 'places', 'routing', 'autocomplete'],
        },
        openweather: {
          configured: !!env.OPENWEATHER_API_KEY,
          status: env.OPENWEATHER_API_KEY ? 'PASS' : 'FALLBACK_DETERMINISTIC',
          units: 'metric (°C)',
        },
        frankfurter: {
          configured: true,
          keyRequired: false,
          status: frankfurterStatus,
          base: 'INR',
          rateDate: ratesSnapshot?.date || 'N/A',
          isStale: ratesSnapshot?.isStale || false,
        },
      },
    };

    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/weather or /api/v1/weather
router.get(['/weather', '/v1/weather'], async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 35.6895;
    const lon = Number(req.query.lon) || 139.6917;
    const weather = await OpenWeatherProvider.getCurrentWeather(lat, lon);
    res.json({ success: true, data: weather });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/weather/forecast or /api/v1/weather/forecast
router.get(['/weather/forecast', '/v1/weather/forecast'], async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 35.6895;
    const lon = Number(req.query.lon) || 139.6917;
    const forecast = await OpenWeatherProvider.getForecast(lat, lon);
    res.json({ success: true, data: forecast });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/geo/geocode or /api/v1/geo/geocode
router.get(['/geo/geocode', '/v1/geo/geocode'], async (req, res) => {
  try {
    const text = String(req.query.text || 'Tokyo Station');
    const geocode = await GeoapifyProvider.geocode(text);
    res.json({ success: true, data: geocode });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/geo/reverse-geocode or /api/v1/geo/reverse-geocode
router.get(['/geo/reverse-geocode', '/v1/geo/reverse-geocode'], async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 35.6586;
    const lon = Number(req.query.lon) || 139.7454;
    const reverse = await GeoapifyProvider.reverseGeocode(lat, lon);
    res.json({ success: true, data: reverse });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/geo/places or /api/v1/geo/places
router.get(['/geo/places', '/v1/geo/places'], async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 35.6895;
    const lon = Number(req.query.lon) || 139.7005;
    const categories = String(req.query.categories || 'tourism.sights,catering.restaurant');
    const radius = Number(req.query.radius) || 3000;
    const limit = Number(req.query.limit) || 6;

    const places = await GeoapifyProvider.searchPlaces(lat, lon, categories, radius, limit);
    res.json({ success: true, data: places });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/geo/route or /api/v1/geo/route
router.get(['/geo/route', '/v1/geo/route'], async (req, res) => {
  try {
    const rawWaypoints = String(req.query.waypoints || '35.6938,139.7034|35.6585,139.7022');
    const mode = (req.query.mode as any) || 'drive';

    const waypoints = rawWaypoints.split('|').map((pair) => {
      const [lat, lon] = pair.split(',').map(Number);
      return { lat, lon };
    });

    const route = await GeoapifyProvider.calculateRoute(waypoints, mode);
    res.json({ success: true, data: route });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/geo/autocomplete or /api/v1/geo/autocomplete
router.get(['/geo/autocomplete', '/v1/geo/autocomplete'], async (req, res) => {
  try {
    const text = String(req.query.text || '');
    const suggestions = await GeoapifyProvider.autocomplete(text);
    res.json({ success: true, data: suggestions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/currency/rates or /api/v1/currency/rates
router.get(['/currency/rates', '/v1/currency/rates'], async (req, res) => {
  try {
    const base = String(req.query.base || 'INR');
    const symbols = req.query.symbols
      ? String(req.query.symbols).split(',')
      : ['USD', 'EUR', 'GBP', 'JPY'];

    const snapshot = await FrankfurterProvider.getRates(base, symbols);
    res.json({ success: true, data: snapshot });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/currency/convert or /api/v1/currency/convert
router.get(['/currency/convert', '/v1/currency/convert'], async (req, res) => {
  try {
    const amountMinor = Number(req.query.amountMinor) || 100000;
    const from = String(req.query.from || 'INR');
    const to = String(req.query.to || 'USD');

    const conversion = await FrankfurterProvider.convert(amountMinor, from, to);
    res.json({
      success: true,
      data: {
        ...conversion,
        from: conversion.fromCurrency,
        to: conversion.toCurrency,
        rate: conversion.exchangeRate,
        convertedAmountMinor: Math.round(conversion.convertedAmountDecimal * 100),
        retrievedAt: conversion.rateDate,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

