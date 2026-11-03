# TripGuard — Security Architecture & Vulnerability Audit

**Last Updated:** November 2026  
**Auditor:** TripGuard Security Systems Engineering  
**Scope:** Backend REST API, Database Persistence, Authentication, Authorization, Input Validation, Secrets Management

---

## 1. Executive Summary

TripGuard incorporates defense-in-depth financial and application security principles. The platform handles user financial budgets, travel commitments, and itinerary modifications. The system enforces zero trust between the client and server: all financial computations, net savings calculations, and recovery approvals are executed exclusively server-side.

| Vulnerability Category | Risk Rating | Mitigation Status | Technical Verification |
| :--- | :---: | :---: | :--- |
| **Authentication & Session Security** | Critical | 🟢 Mitigated | Signed JWT tokens, bcrypt salted passwords (cost 10), token expiry (7d) |
| **Object-Level Authorization (BOLA)** | Critical | 🟢 Mitigated | `requireTripOwnership` middleware checks `userId` on all trip sub-resources |
| **NoSQL Injection / Query Tampering** | High | 🟢 Mitigated | Mongoose Schema strict typing, parameter sanitization, no raw `$where` clauses |
| **Financial Manipulation / Float Drift** | Critical | 🟢 Mitigated | Integer minor unit arithmetic (paise), zero floating point math in ledger |
| **LLM Prompt Injection / Financial Drift** | High | 🟢 Mitigated | Deterministic TS calculation layer; LLM cannot execute or alter financial states |
| **Cross-Origin Resource Sharing (CORS)** | Medium | 🟢 Mitigated | Whitelisted origins (`http://localhost:5173`), credentialed requests restricted |
| **Secrets Exposure & Leakage** | Critical | 🟢 Mitigated | `.env` strictly git-ignored; sanitization filters prevent logging secret keys |

---

## 2. Authentication & Authorization Architecture

### 2.1 JWT Implementation
- **Algorithm:** HMAC SHA-256 (`HS256`).
- **Signature Secret:** Configured via `JWT_SECRET` environment variable with strict fallback warning.
- **Payload Structure:** `{ userId: string, email: string, name: string }`.
- **Middleware:** `authMiddleware` validates `Authorization: Bearer <token>`, decodes claims, verifies user existence in database, and attaches authenticated user context to `req.user`.

### 2.2 Broken Object-Level Authorization (BOLA) Prevention
- In travel applications, malicious users may attempt to alter trips, expenses, or bookings belonging to other users by changing URL parameters (`/api/v1/trips/:id`).
- TripGuard enforces `requireTripOwnership`:
  ```typescript
  const trip = await Trip.findOne({ _id: tripId, userId: req.user._id });
  if (!trip) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Trip does not belong to you' });
  }
  ```
- Sub-resource endpoints (Itinerary Items, Bookings, Expenses, Recovery Runs) strictly check trip ownership before mutating database state.

---

## 3. Financial Integrity & Immutability

### 3.1 Integer Minor Units (Paise)
- Standard JavaScript floating-point numbers (`0.1 + 0.2 === 0.30000000000000004`) lead to accumulated precision errors in financial balances.
- TripGuard stores all monetary figures as integers representing the smallest currency denomination (e.g., 5,000,000 paise for ₹50,000).
- Rounding occurs only at presentation boundaries via standard currency formatters.

### 3.2 Recovery Approval Immutability & Audit Trail
- A recovery plan cannot be applied repeatedly or retroactively tampered with.
- When a recovery strategy is approved:
  1. An SHA-256 state snapshot hash is recorded.
  2. The parent trip version increments atomically (`v1 -> v2`).
  3. Replaced itinerary items are archived with `isRemoved: true` and linked to replacement items via `replacedByItemId`.
  4. An immutable `AuditEvent` is generated and logged to the persistent ledger.

---

## 4. AI Copilot Safety & Grounding

- **Threat Model:** Adversarial user attempts to prompt inject Copilot into approving unverified discounts, overriding safety reserves, or fabricating budget surpluses.
- **Mitigation:**
  - The Gemini model is an **advisory read-only assistant**. It has zero write privileges to the database.
  - Financial data provided to the model prompt is pre-computed by the deterministic TS ledger (`buildCanonicalLedger`).
  - If the LLM generates any incorrect budget figure, the UI displays ground-truth metrics directly from the server API, not the LLM response text.

---

## 5. External Provider API Security & Sanitization

- **Zero Client-Side Exposure of Private Keys:** Private keys for Google Gemini, Geoapify, and OpenWeather are stored strictly in the root/server `.env` file and queried solely by backend proxy clients (`server/src/providers/`).
- **Database Connection URI Sanitization:** `server/src/config/db.ts` strips database usernames, passwords, and connection strings prior to outputting connection status messages to stdout.
- **Origin-Restricted Browser Key:** MapTiler keys use HTTP Referer restrictions (`http://localhost:5173` and allowed domains) preventing unauthorized third-party quota consumption.
- **Strict Git Exclusions:** `.gitignore` enforces exclusion of `.env`, `client/.env`, `server/.env`, and build artifacts across both workspaces.

---

## 6. Security Checklist & Test Results

- [x] All database queries use parameterization.
- [x] Password fields have `select: false` on Mongoose queries to prevent accidental leakage in JSON responses.
- [x] Passwords hashed with bcrypt (salt rounds = 10).
- [x] Rate limiting friendly headers and error handling.
- [x] No sensitive credentials checked into version control.
- [x] External API credentials proxied through backend with 5s timeouts and deterministic fallbacks.
- [x] Database logs sanitized to hide cluster credentials and connection tokens.

