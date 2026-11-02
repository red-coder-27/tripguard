# TripGuard — Master Implementation Plan

**Execution Methodology:** Phased Engineering with Continuous Verification  
**Primary Directive:** Engineering correctness first, product experience second, visual polish third.

---

## Phase Breakdown & Milestone Schedule

```mermaid
flowchart LR
    P0[Phase 0: Audit & Architecture] --> P1[Phase 1: Foundation & Scaffold]
    P1 --> P2[Phase 2: Travel Data Models & CRUD]
    P2 --> P3[Phase 3: Financial Ledger & Forecast]
    P3 --> P4[Phase 4: Deterministic Recovery Engine]
    P4 --> P5[Phase 5: Recovery Center & Ledger UI]
    P5 --> P6[Phase 6: Simulator, Copilot & Analytics]
    P6 --> P7[Phase 7: Testing & Verification]
    P7 --> P8[Phase 8: Demo & Production Packaging]
```

---

## Phase 0 — Audit & System Documentation (Current)
- [x] Inspect existing workspace state (`C:\Users\nithe\tripguard`).
- [x] Audit runtime tooling (Node v24, npm 11, Docker, Python 3.13, Git).
- [x] Create `docs/PROJECT_AUDIT.md`.
- [x] Create `docs/ARCHITECTURE.md`.
- [x] Create `docs/IMPLEMENTATION_PLAN.md`.
- [ ] Create `docs/FEATURE_STATUS.md`.
- [ ] Create `docs/DESIGN_SYSTEM.md`.

---

## Phase 1 — Foundation & Monorepo Scaffolding
- [ ] Initialize monorepo structure:
  - Root `package.json` with scripts for `dev`, `build`, `test`, `seed`.
  - `.gitignore`, `.env.example`.
- [ ] Backend (`/server`):
  - Setup Express, TypeScript, Mongoose, Zod, CORS, Helmet, dotenv.
  - Connect to MongoDB with in-memory fallback (`mongodb-memory-server`) for deterministic testing.
  - Setup JWT Auth middleware, password hashing (`bcryptjs`), error handler.
- [ ] Frontend (`/client`):
  - Setup Vite + React 18/19 + TypeScript.
  - Setup Tailwind CSS with Emerald Fintech tokens.
  - Configure Lucide icons, Recharts, and routing.
  - Implement Shell layout (Dark sidebar `#101B2D` + Light workspace `#F5F7FA` + Top header).

---

## Phase 2 — Travel Management (Core Entities & CRUD)
- [ ] Data Models:
  - `User`, `Trip`, `ItineraryItem`, `Expense`, `Booking`, `AlternativeOption`.
- [ ] REST API Endpoints:
  - `/api/v1/auth` (register, login, me).
  - `/api/v1/trips` (CRUD, status, preferences).
  - `/api/v1/itineraries` (day-wise items, priority, locked flags).
  - `/api/v1/expenses` (categorized records, link to booking/activity).
  - `/api/v1/bookings` (accommodations, transport, tickets, cancellation policies).
- [ ] Frontend Screens:
  - **Screen 1: Authentication** (Login, Register).
  - **Screen 3: My Trips** (Trip list, status filters, Create Trip modal).
  - **Screen 4: Trip Details** (Trip overview, financial summary bar, tabs).
  - **Screen 5: Itinerary Planner** (Day tabs, timeline, activity cards, priority pills: `MUST_DO`, `FLEXIBLE`, `OPTIONAL`).
  - **Screen 6: Expense Management** (Summary cards, tabular list, Add Expense dialog).
  - **Screen 7: Booking Management** (Accommodation, transport, cancellation policies).

---

## Phase 3 — Financial Accounting Foundation & Forecasting
- [ ] Minor unit currency calculations (paise/cents):
  - Planned vs Paid vs Outstanding vs Settled.
  - Prevention of double-counting between bookings and expenses.
- [ ] Financial forecasting service:
  - `Projected Final Cost = Settled + Outstanding + Future Estimates`.
  - `Usable Budget = Total Budget - Emergency Reserve`.
  - Risk engine: `SAFE`, `WATCH`, `AT_RISK`, `OVER_BUDGET`.
- [ ] REST Endpoints:
  - `/api/v1/forecast/:tripId` (canonical calculation with breakdown).
- [ ] UI Integration:
  - **Screen 2: Overview Dashboard** (Active trips, total budget, actual spending, projected expenditure, risk banner).
  - Dynamic budget health gauge and progress bars across all trip views.

---

## Phase 4 — Deterministic Recovery Optimization Engine
- [ ] Core Engine (`server/src/recovery/recoveryEngine.ts`):
  - Input ingestion (trip, itinerary, bookings, catalog of alternatives).
  - Hard constraint validation:
    - Never delete or invalidate `MUST_DO` activities.
    - Never modify `isLocked` items.
    - Respect confirmed booking cancellation fees and non-refundable deposits.
    - Preserve emergency reserve.
  - Strategy Generation:
    - **Minimum Disruption:** Preserves all experiences, optimizes logistics and flexible transport.
    - **Balanced Recovery:** Combines targeted accommodation/transit alternatives with minimal activity adjustments.
    - **Maximum Savings:** Aggressive cost optimization, replaces high-cost activities with budget/free alternates.
  - Realistic net savings calculator:
    `Net Savings = Avoided Liability - Replacement Cost - Cancellation Fee + Verified Refund`.
  - Deterministic tie-breaking and honest infeasibility detection.
- [ ] REST Endpoints:
  - `POST /api/v1/recovery/:tripId/generate`
  - `GET /api/v1/recovery/:tripId/runs`

---

## Phase 5 — Recovery Experience & Decision Ledger
- [ ] Frontend Implementation:
  - **Screen 8: Recovery Center** (Financial risk alert, strategy comparison cards, disruption scores).
  - **Recovery Details Drawer** (Side-by-side original vs replacement, net savings math, constraint validation).
  - **Screen 9: Recovery Ledger** (Historical runs, snapshot hashes, status: Generated, Approved, Rejected, Stale).
- [ ] Approval & Versioning Workflow:
  - `POST /api/v1/recovery/:tripId/approve`
  - Creates Itinerary Version `N + 1`, marks historical run as `APPROVED`.
  - Flags old runs as `SUPERSEDED` or `STALE` if trip data changed.
  - Auditable transaction log in `AuditEvent`.

---

## Phase 6 — Supporting Intelligence Modules
- [ ] **Screen 10: What-If Simulator:**
  - Interactive variable sliders/toggles (accommodations, transport tiers, optional activities).
  - Live recalculation via `/api/v1/simulator/evaluate`.
  - "Simulation only" indicators and "Save Proposal" workflow.
- [ ] **Screen 11: Analytics:**
  - Recharts dashboard: Category spending breakdown, daily burn rate, projected vs actual, recovery savings summary.
- [ ] **Screen 12: TripGuard Copilot:**
  - Server-side integration with Google Gemini (`gemini-2.5-flash` or `gemini-1.5-pro`).
  - Strict grounding: Prompt injects authoritative backend-calculated financial figures.
  - Deterministic fallback when API key is missing or offline.
  - Suggested contextual questions and explainability queries.
- [ ] **Screen 13: Settings:**
  - User profile, currency selector, emergency reserve default, theme settings.

---

## Phase 7 — Testing & Quality Assurance
- [ ] Automated Financial Test Suite:
  - Integer paise precision verification.
  - Zero double-counting validation.
  - Cancellation fee & refund accuracy.
- [ ] Recovery Optimizer Test Suite:
  - `MUST_DO` violation prevention.
  - Determinism verification (identical outputs for identical inputs).
  - Infeasibility reporting tests.
- [ ] API & Integration Tests:
  - Auth, Trip CRUD, Itinerary updates, Recovery generation and approval.
- [ ] Production Build & Lint:
  - TypeScript compilation across server and client.
  - Vite production bundle optimization.

---

## Phase 8 — Seeded Demonstration & Verification
- [ ] Seed script (`npm run seed`):
  - Idempotent scenario: ₹50,000 budget, ₹57,000 projected cost (₹7,000 overspend).
  - Accommodation replacement (₹3,500 saving), transport optimization (₹2,000 saving), optional activity replacement (₹1,500 saving).
  - Revised projected cost: Exactly ₹50,000.
  - Seeded user: `demo@tripguard.ai` / `TripGuard2026!`.
- [ ] End-to-end verification of Scenes 1 through 7.
- [ ] Final Documentation & README update.
