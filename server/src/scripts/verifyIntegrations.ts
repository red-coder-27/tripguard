import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load environment variables from root and client
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'client/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../client/.env') });

interface IntegrationResult {
  provider: string;
  configured: boolean;
  connectivity: 'PASS' | 'FAIL' | 'SKIPPED';
  details: string;
  latencyMs?: number;
}

const results: Record<string, IntegrationResult> = {};

async function testMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    results['MongoDB'] = {
      provider: 'MongoDB Atlas',
      configured: false,
      connectivity: 'FAIL',
      details: 'MONGODB_URI is not configured in .env',
    };
    return;
  }

  const start = Date.now();
  let effectiveUri = uri;
  if (!effectiveUri.includes('/tripguard')) {
    effectiveUri = effectiveUri.replace(/\.net\/\?/, '.net/tripguard?');
  }

  try {
    const conn = await mongoose.connect(effectiveUri, { serverSelectionTimeoutMS: 6000 });
    const dbName = conn.connection.name;
    const collections = await conn.connection.db?.listCollections().toArray();
    const countTrips = await conn.connection.db?.collection('trips').countDocuments();
    const latency = Date.now() - start;

    results['MongoDB'] = {
      provider: 'MongoDB Atlas',
      configured: true,
      connectivity: 'PASS',
      details: `Connected to db '${dbName}' (${collections?.length || 0} collections, ${countTrips || 0} trips) on host ${conn.connection.host}`,
      latencyMs: latency,
    };
    await mongoose.disconnect();
  } catch (err: any) {
    results['MongoDB'] = {
      provider: 'MongoDB Atlas',
      configured: true,
      connectivity: 'FAIL',
      details: `Connection failed: ${err.message}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    results['Gemini'] = {
      provider: 'Google Gemini AI',
      configured: false,
      connectivity: 'FAIL',
      details: 'GEMINI_API_KEY is not configured in .env',
    };
    return;
  }

  const start = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with the exact word: OPERATIONAL' }] }],
      }),
    });

    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      results['Gemini'] = {
        provider: 'Google Gemini AI',
        configured: true,
        connectivity: 'PASS',
        details: `gemini-2.5-flash responded successfully: "${text.substring(0, 30)}"`,
        latencyMs: latency,
      };
    } else {
      const errData = await res.text();
      results['Gemini'] = {
        provider: 'Google Gemini AI',
        configured: true,
        connectivity: 'FAIL',
        details: `HTTP ${res.status}: ${errData.substring(0, 100)}`,
        latencyMs: latency,
      };
    }
  } catch (err: any) {
    results['Gemini'] = {
      provider: 'Google Gemini AI',
      configured: true,
      connectivity: 'FAIL',
      details: `Request error: ${err.message}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function testMapTiler() {
  const key = process.env.VITE_MAPTILER_API_KEY || process.env.MAPTILER_API_KEY;
  if (!key) {
    results['MapTiler'] = {
      provider: 'MapTiler',
      configured: false,
      connectivity: 'FAIL',
      details: 'VITE_MAPTILER_API_KEY is not configured in client/.env or .env',
    };
    return;
  }

  const start = Date.now();
  try {
    // Streets v2 / v4 style JSON endpoint
    const url = `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;
    const res = await fetch(url);
    const latency = Date.now() - start;

    if (res.ok) {
      const data = await res.json() as any;
      results['MapTiler'] = {
        provider: 'MapTiler',
        configured: true,
        connectivity: 'PASS',
        details: `Streets style JSON fetched successfully (name: ${data.name || 'streets-v2'}, version: ${data.version})`,
        latencyMs: latency,
      };
    } else {
      results['MapTiler'] = {
        provider: 'MapTiler',
        configured: true,
        connectivity: 'FAIL',
        details: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs: latency,
      };
    }
  } catch (err: any) {
    results['MapTiler'] = {
      provider: 'MapTiler',
      configured: true,
      connectivity: 'FAIL',
      details: `Request error: ${err.message}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function testGeoapify() {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) {
    ['Geocoding', 'ReverseGeocoding', 'Places', 'Routing'].forEach((svc) => {
      results[`Geoapify_${svc}`] = {
        provider: `Geoapify ${svc}`,
        configured: false,
        connectivity: 'FAIL',
        details: 'GEOAPIFY_API_KEY is not configured in .env',
      };
    });
    return;
  }

  // 1. Geocoding
  try {
    const start = Date.now();
    const url = `https://api.geoapify.com/v1/geocode/search?text=Tokyo%20Station&limit=1&apiKey=${key}`;
    const res = await fetch(url);
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json() as any;
      const feat = data.features?.[0];
      const coords = feat?.geometry?.coordinates;
      results['Geoapify_Geocoding'] = {
        provider: 'Geoapify Geocoding API',
        configured: true,
        connectivity: 'PASS',
        details: `Geocoded 'Tokyo Station' to [${coords ? coords.join(', ') : 'found'}] (${feat?.properties?.formatted || 'OK'})`,
        latencyMs: latency,
      };
    } else {
      results['Geoapify_Geocoding'] = {
        provider: 'Geoapify Geocoding API',
        configured: true,
        connectivity: 'FAIL',
        details: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs: latency,
      };
    }
  } catch (err: any) {
    results['Geoapify_Geocoding'] = {
      provider: 'Geoapify Geocoding API',
      configured: true,
      connectivity: 'FAIL',
      details: err.message,
    };
  }

  // 2. Reverse Geocoding
  try {
    const start = Date.now();
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=35.6586&lon=139.7454&apiKey=${key}`;
    const res = await fetch(url);
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json() as any;
      const feat = data.features?.[0];
      results['Geoapify_ReverseGeocoding'] = {
        provider: 'Geoapify Reverse Geocoding API',
        configured: true,
        connectivity: 'PASS',
        details: `Resolved coordinates (35.6586, 139.7454) to: ${feat?.properties?.formatted?.substring(0, 50) || 'OK'}`,
        latencyMs: latency,
      };
    } else {
      results['Geoapify_ReverseGeocoding'] = {
        provider: 'Geoapify Reverse Geocoding API',
        configured: true,
        connectivity: 'FAIL',
        details: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs: latency,
      };
    }
  } catch (err: any) {
    results['Geoapify_ReverseGeocoding'] = {
      provider: 'Geoapify Reverse Geocoding API',
      configured: true,
      connectivity: 'FAIL',
      details: err.message,
    };
  }

  // 3. Places API
  try {
    const start = Date.now();
    const url = `https://api.geoapify.com/v2/places?categories=tourism.sights&filter=circle:139.7005,35.6895,3000&limit=3&apiKey=${key}`;
    const res = await fetch(url);
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json() as any;
      const count = data.features?.length || 0;
      const names = data.features?.map((f: any) => f.properties?.name || 'Unnamed').join(', ');
      results['Geoapify_Places'] = {
        provider: 'Geoapify Places API',
        configured: true,
        connectivity: 'PASS',
        details: `Discovered ${count} sights near Shinjuku (e.g. ${names.substring(0, 50)})`,
        latencyMs: latency,
      };
    } else {
      results['Geoapify_Places'] = {
        provider: 'Geoapify Places API',
        configured: true,
        connectivity: 'FAIL',
        details: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs: latency,
      };
    }
  } catch (err: any) {
    results['Geoapify_Places'] = {
      provider: 'Geoapify Places API',
      configured: true,
      connectivity: 'FAIL',
      details: err.message,
    };
  }

  // 4. Routing API
  try {
    const start = Date.now();
    const url = `https://api.geoapify.com/v1/routing?waypoints=35.6938,139.7034|35.6585,139.7022&mode=drive&apiKey=${key}`;
    const res = await fetch(url);
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json() as any;
      const leg = data.features?.[0]?.properties;
      const distKm = leg?.distance ? Math.round(leg.distance / 100) / 10 : 'N/A';
      const timeMins = leg?.time ? Math.round(leg.time / 60) : 'N/A';
      results['Geoapify_Routing'] = {
        provider: 'Geoapify Routing API',
        configured: true,
        connectivity: 'PASS',
        details: `Route computed: Shinjuku -> Shibuya (${distKm} km, ~${timeMins} mins driving)`,
        latencyMs: latency,
      };
    } else {
      results['Geoapify_Routing'] = {
        provider: 'Geoapify Routing API',
        configured: true,
        connectivity: 'FAIL',
        details: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs: latency,
      };
    }
  } catch (err: any) {
    results['Geoapify_Routing'] = {
      provider: 'Geoapify Routing API',
      configured: true,
      connectivity: 'FAIL',
      details: err.message,
    };
  }
}

async function testOpenWeather() {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    results['OpenWeather'] = {
      provider: 'OpenWeather API',
      configured: false,
      connectivity: 'FAIL',
      details: 'OPENWEATHER_API_KEY is not configured in .env',
    };
    return;
  }

  const start = Date.now();
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=35.6895&lon=139.6917&units=metric&appid=${key}`;
    const res = await fetch(url);
    const latency = Date.now() - start;

    if (res.ok) {
      const data = await res.json() as any;
      const temp = Math.round(data.main?.temp);
      const desc = data.weather?.[0]?.description || 'clear';
      const city = data.name || 'Tokyo';
      results['OpenWeather'] = {
        provider: 'OpenWeather API',
        configured: true,
        connectivity: 'PASS',
        details: `Current weather in ${city}: ${temp}°C, ${desc} (humidity: ${data.main?.humidity}%, wind: ${data.wind?.speed} m/s)`,
        latencyMs: latency,
      };
    } else {
      results['OpenWeather'] = {
        provider: 'OpenWeather API',
        configured: true,
        connectivity: 'FAIL',
        details: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs: latency,
      };
    }
  } catch (err: any) {
    results['OpenWeather'] = {
      provider: 'OpenWeather API',
      configured: true,
      connectivity: 'FAIL',
      details: err.message,
      latencyMs: Date.now() - start,
    };
  }
}

async function testFrankfurter() {
  const start = Date.now();
  try {
    const url = 'https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP,JPY';
    const res = await fetch(url);
    const latency = Date.now() - start;

    if (res.ok) {
      const data = await res.json() as any;
      const rates = data.rates || {};
      results['Frankfurter'] = {
        provider: 'Frankfurter Currency API',
        configured: true,
        connectivity: 'PASS',
        details: `Base: INR, Date: ${data.date}, Rates -> USD: ${rates.USD}, EUR: ${rates.EUR}, GBP: ${rates.GBP}, JPY: ${rates.JPY}`,
        latencyMs: latency,
      };
    } else {
      results['Frankfurter'] = {
        provider: 'Frankfurter Currency API',
        configured: true,
        connectivity: 'FAIL',
        details: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs: latency,
      };
    }
  } catch (err: any) {
    results['Frankfurter'] = {
      provider: 'Frankfurter Currency API',
      configured: true,
      connectivity: 'FAIL',
      details: err.message,
      latencyMs: Date.now() - start,
    };
  }
}

async function runAll() {
  console.log('==================================================================');
  console.log('TRIPGUARD SYSTEM INTEGRATION AUDIT & CONNECTIVITY VERIFICATION');
  console.log('==================================================================\n');

  await Promise.all([
    testMongo(),
    testGemini(),
    testMapTiler(),
    testGeoapify(),
    testOpenWeather(),
    testFrankfurter(),
  ]);

  for (const [key, res] of Object.entries(results)) {
    const icon = res.connectivity === 'PASS' ? '🟢 PASS' : '🔴 FAIL';
    console.log(`${icon} [${res.provider}]`);
    console.log(`   Configured: ${res.configured}`);
    console.log(`   Status: ${res.connectivity}`);
    console.log(`   Latency: ${res.latencyMs !== undefined ? `${res.latencyMs}ms` : 'N/A'}`);
    console.log(`   Details: ${res.details}`);
    console.log('');
  }

  const allPassed = Object.values(results).every((r) => r.connectivity === 'PASS');
  console.log('==================================================================');
  console.log(`Overall Result: ${allPassed ? 'ALL INTEGRATIONS PASSING' : 'SOME INTEGRATIONS FAILED/MISSING'}`);
  console.log('==================================================================');
}

runAll();

