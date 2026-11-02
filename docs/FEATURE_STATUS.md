# TripGuard — Feature Status Matrix

**Last Updated:** November 2026  
**Status Key:**  
- 🟢 **COMPLETE:** Implemented, verified, and integrated with live backend data.  
- 🟡 **IN_PROGRESS:** Active engineering in the current phase.  
- ⚪ **PLANNED:** Architected and scheduled for upcoming phase.  

---

## 1. Application Screens Status

| Screen # | Screen Name | Route / Path | Status | Real Backend Data | Key Capabilities |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Screen 1** | Authentication | `/auth` | ⚪ PLANNED | Yes | Login, Registration, JWT token management, Form validation |
| **Screen 2** | Overview Dashboard | `/dashboard` | ⚪ PLANNED | Yes | Financial health gauge, Active trips, Risk banner, Spending breakdown, Primary actions |
| **Screen 3** | My Trips | `/trips` | ⚪ PLANNED | Yes | Trip cards, Search, Status filter, Create Trip modal with emergency reserve |
| **Screen 4** | Trip Details | `/trips/:id` | ⚪ PLANNED | Yes | Contextual header, Financial summary bar, Workspace tabs |
| **Screen 5** | Itinerary Planner | `/trips/:id/itinerary` | ⚪ PLANNED | Yes | Day tabs, Activity timeline, `MUST_DO` / `FLEXIBLE` / `OPTIONAL` priority indicators |
| **Screen 6** | Expense Management | `/trips/:id/expenses` | ⚪ PLANNED | Yes | Ledger table, Category filters, Add Expense modal with booking linkage |
| **Screen 7** | Booking Management | `/trips/:id/bookings` | ⚪ PLANNED | Yes | Accommodation & transit records, cancellation policies, refund tracking |
| **Screen 8** | Recovery Center | `/trips/:id/recovery` | ⚪ PLANNED | Yes | **Signature Screen:** Financial gap, 3 distinct strategy cards, Details Drawer, Approval |
| **Screen 9** | Recovery Ledger | `/trips/:id/ledger` | ⚪ PLANNED | Yes | Auditable timeline, Snapshot hashes, Version history (`v1`, `v2`), Staleness indicators |
| **Screen 10** | What-If Simulator | `/trips/:id/simulator`| ⚪ PLANNED | Yes | Interactive variable toggles, real-time backend projection, "Save Proposal" |
| **Screen 11** | Analytics | `/trips/:id/analytics`| ⚪ PLANNED | Yes | Recharts visualizations: Category distribution, burn rate, recovery savings |
| **Screen 12** | TripGuard Copilot | `/trips/:id/copilot`  | ⚪ PLANNED | Yes | Gemini AI advisory chat with prompt injection of backend truth + deterministic fallback |
| **Screen 13** | Settings | `/settings`           | ⚪ PLANNED | Yes | User profile, default currency, reserve threshold, security credentials |

---

## 2. Core Engine & Backend Modules

| Module | Architectural Role | Status | Verification Plan |
| :--- | :--- | :---: | :--- |
| **Authentication & AuthZ** | JWT, bcryptjs, user ownership middleware | ⚪ PLANNED | Unit tests for auth tokens, password hashing, 401/403 responses |
| **Canonical Financial Ledger** | Integer minor units (paise), zero double-counting | ⚪ PLANNED | Mathematical test suite verifying exact paise balance calculations |
| **Financial Forecasting** | Settled + Outstanding + Estimates vs Usable Budget | ⚪ PLANNED | Test cases for SAFE, WATCH, AT_RISK, OVER_BUDGET triggers |
| **Deterministic Recovery Optimizer** | Pure TS constraint engine; 3 strategies; net savings | ⚪ PLANNED | Constraint verification tests (`MUST_DO`, locked, net savings math) |
| **Snapshotting & Versioning** | Immutability, hash generation, staleness flag | ⚪ PLANNED | Tests verifying itinerary `v1 -> v2` transition upon strategy approval |
| **AI Copilot (Gemini Integration)** | Advisory explanations with deterministic fallback | ⚪ PLANNED | Tests verifying clean output even when API key is unset |
| **Seeded Scenario Generator** | ₹50k budget, ₹57k projected, ₹7k recovery down to ₹50k | ⚪ PLANNED | Idempotent database seeder runnable via `npm run seed` |

---

## 3. Production Readiness & Non-Functional Requirements

| Non-Functional Area | Requirement | Status |
| :--- | :--- | :---: |
| **Zero Floating-Point Drift** | All monetary calculations in integer minor currency units | ⚪ PLANNED |
| **Deterministic Output** | Identical inputs produce bitwise identical recovery recommendations | ⚪ PLANNED |
| **Design System Alignment** | Dark navigation `#101B2D` + Light workspace `#F5F7FA` + Emerald `#059669` | ⚪ PLANNED |
| **Mobile Responsiveness** | Responsive layout without horizontal scroll overflow | ⚪ PLANNED |
| **Automated Test Coverage** | Suite covering financial logic, constraints, API endpoints | ⚪ PLANNED |
| **Deployment Packaging** | Monorepo build scripts, production bundle, health checks | ⚪ PLANNED |
