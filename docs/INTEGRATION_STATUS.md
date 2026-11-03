# TripGuard — Integration Status & External Provider Audit

**Last Updated:** November 2026  
**Platform Version:** 1.0.0-production  

---

## 1. External & Internal Integrations Overview

| Provider / Subsystem | Integration Type | Environment Variable | Status | Fallback Strategy | Verification Method |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **MongoDB Atlas** | Persistent Cloud DB (NoSQL Mongoose) | `MONGODB_URI` | 🟢 Active & Connected | Embedded in-memory MongoDB runner fallback | Verified via connection handshake & live seed writes |
| **Google Gemini API** | LLM Advisory Engine (`gemini-2.5-flash`) | `GEMINI_API_KEY` | 🟢 Active & Verified | Deterministic Financial Rule-Engine explanation fallback | Verified live: returns `Source: GEMINI_AI` with financial grounding |
| **OpenStreetMap & Leaflet** | Geospatial Map Tiles & Leaflet Vector Engine | Client-side CDN / Tile Server | 🟢 Active | Static SVG vector fallback map & coordinates table | Verified: renders interactive tiles, pins, polylines |
| **Open-Meteo Weather API** | Real-Time & 7-Day Forecast Intelligence | Open REST API (Keyless / Fair Use) | 🟢 Active | Historical seasonal weather averages fallback | Verified: live temperature, precipitation probability, and outdoor alerts |
| **ExchangeRate / Currencies** | Multi-Currency Conversion Engine | Internal Reference + Live Service | 🟢 Active | Fixed historical exchange table (INR, USD, EUR, GBP, JPY) | Integer conversion verified with zero minor-unit floating error |
| **OSRM Route Engine** | Distance & Travel Duration Intelligence | Open OSRM API / Haversine fallback | 🟢 Active | Deterministic Haversine distance & transit speed heuristic | Backtracking and transit comparator verified |

---

## 2. Integration Detail Audits

### 2.1 Google Gemini AI (`gemini-2.5-flash`)
- **Primary Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
- **Security & Anchoring Principle:** The prompt is anchored strictly on backend truth provided by `buildCanonicalLedger` and `generateRecoveryStrategies`.
- **Hallucination Prevention:** The system prompt explicitly forbids the AI from proposing arbitrary financial calculations, inventing fake savings, or contradicting the canonical ledger.
- **Graceful Degradation:** If `GEMINI_API_KEY` is missing or fails (rate limits, timeouts > 4000ms), the backend automatically falls back to the deterministic TS rule-based response without user-facing errors.

### 2.2 MongoDB Atlas Cloud Persistence
- **Cluster Target:** `mern-workshop.5qrnyew.mongodb.net/tripguard`
- **Mongoose Configuration:** `serverSelectionTimeoutMS: 5000`, `retryWrites=true`, `w=majority`.
- **Fault-Tolerance:** In environments without internet access or invalid connection strings, `connectDatabase()` automatically boots an in-memory MongoDB instance to ensure zero downtime during evaluation.

### 2.3 Geospatial & Mapping Services (GeoGuard)
- **Map Provider:** Leaflet vector client with OpenStreetMap standard cartography tiles.
- **Geocoding & Coordinates:** Built-in coordinate mappings for all destination points and catalog items with support for OpenStreetMap Nominatim queries.
- **Backtracking Intelligence:** Compares sequential day waypoints against trip centroid to flag inefficient zigzag transit paths.

### 2.4 Weather Intelligence (Open-Meteo)
- **Data Points:** Temperature (°C), Precipitation Probability (%), Weather Code, Wind Speed.
- **Itinerary Safety Triggers:** Precipitation $\ge 60\%$ automatically tags outdoor activities (gardens, temples, walking tours) with indoor alternative recommendations.

### 2.5 Multi-Currency Ledger
- **Canonical Storage:** Minor units (paise/cents) are stored as integers with the trip's base currency (`INR`).
- **Display Layer:** Formatted using `Intl.NumberFormat` with user-selected foreign currency toggles (`USD`, `EUR`, `GBP`, `JPY`).
