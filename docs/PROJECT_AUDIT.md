# TripGuard — Project Audit & Repository Baseline

**Audit Date:** November 2026  
**Auditor:** Principal Software Architect & Full-Stack Engineering Team  
**Workspace:** `C:\Users\nithe\tripguard`  
**Status:** Initial Baseline / Clean Greenfield State  

---

## 1. Executive Summary

TripGuard is an **Adaptive Travel Budget & Itinerary Recovery Intelligence Platform** designed to solve a specific, high-stakes problem: **When an existing travel itinerary becomes financially infeasible, what can change, what must remain protected, and which recovery plan restores affordability with minimal disruption?**

An audit of the target directory `C:\Users\nithe\tripguard` was performed prior to any modifications:
- The workspace was completely clean (an empty directory with no legacy codebase or prior commits).
- Git repository was initialized at the start of this phase.
- Host system environment:
  - **Operating System:** Windows 11
  - **Node.js:** `v24.18.0` (LTS-class modern runtime)
  - **npm:** `11.16.0`
  - **pnpm:** `11.9.0`
  - **Git:** `2.54.0.windows.1`
  - **Docker:** `29.8.2`
  - **Python:** `3.13.14`

This clean state offers a major architectural advantage: **Zero legacy technical debt or broken patterns.** We can establish an uncompromised, clean modular monolith architecture with rigorous financial accounting, deterministic optimization, and visual consistency from day one.

---

## 2. Environment & Dependency Audit

| Component | Host Status | Target Version / Library | Architectural Role |
| :--- | :--- | :--- | :--- |
| **Node.js Runtime** | `v24.18.0` Installed | Node.js 20+ / 24 | Backend execution & frontend tooling |
| **Package Manager** | `npm 11.16.0`, `pnpm 11.9.0` | npm (workspaces) | Monorepo package management |
| **Database** | Docker available; Atlas compatible | MongoDB with Mongoose | Canonical persistence for financial, trip, itinerary, and ledger models |
| **Embedded DB Fallback** | Supported | `mongodb-memory-server` | Zero-configuration local development and deterministic automated test runner |
| **Backend Framework** | Node.js ecosystem | Express.js + TypeScript | REST API, authentication, forecasting, recovery engine |
| **Frontend Framework** | Node.js ecosystem | React 18/19 + TypeScript + Vite | Responsive SPA, hybrid SaaS layout (Dark nav + Light workspace) |
| **Styling & Icons** | N/A | Tailwind CSS + Lucide Icons | Emerald Fintech design system tokens |
| **Data Visualization** | N/A | Recharts | Financial health, spending trends, utilization charts |
| **Validation** | N/A | Zod | Runtime schema validation across client and server |
| **AI Integration** | N/A | Google Gemini API (`@google/genai`) | Server-side advisory copilot with deterministic fallback |

---

## 3. Core Functional Requirements Matrix

Following the Master Build Prompt, the platform must deliver:

1. **Authentication & Identity:** Secure JWT/cookie auth, password hashing (bcrypt), profile management, ownership isolation.
2. **Trip & Itinerary Management:** Multi-trip tracking, day-by-day itinerary timeline, activities with priority levels (`MUST_DO`, `FLEXIBLE`, `OPTIONAL`) and flexibility indicators.
3. **Financial Accounting Foundation:**
   - Integer minor currency units (paise/cents) to eliminate IEEE 754 floating-point inaccuracies.
   - Canonical accounting identities preventing duplicate counting between planned expenses, confirmed bookings, and actual settled expenses.
   - Usable budget computation: `Total Budget - Protected Emergency Reserve`.
   - Real-time financial forecasting: Actual spent + outstanding liabilities + future estimates.
   - Four transparent risk states: `Safe`, `Watch`, `At Risk`, `Over Budget`.
4. **Deterministic Recovery Optimization Engine:**
   - Three distinct strategies:
     - **Minimum Disruption:** Protects experiences, confirmed bookings, minimizes itinerary disruption.
     - **Balanced Recovery:** Optimal balance of net savings and travel experience.
     - **Maximum Savings:** Aggressive valid net savings while respecting hard constraints.
   - Hard constraint preservation: `MUST_DO` activities and locked items are non-negotiable.
   - Realistic net savings arithmetic: Original liability avoided - replacement cost - cancellation fees + verified refunds.
   - Honest infeasibility reporting when mathematical recovery within constraints is impossible.
5. **Immutable Recovery Ledger & Versioning:**
   - Audit trail of all recovery runs.
   - Snapshot hash and staleness detection when itinerary or expenses change after recovery generation.
   - Explicit user approval creating new itinerary versions without silently mutating historical snapshots.
6. **Interactive What-If Simulator:** Real-time simulation of variable alterations without altering canonical records.
7. **TripGuard Copilot:** Structured Google Gemini advisory integration grounded strictly in backend financial data, with deterministic fallbacks when offline or unconfigured.
8. **Seeded Realistic Scenario:** ₹50,000 budget, ₹57,000 projected expenditure (₹7,000 overspend), with actual calculations demonstrating ₹7,000 net recovery down to exactly ₹50,000.

---

## 4. Technical Risks & Mitigation Strategy

| Risk Area | Specific Failure Mode | TripGuard Mitigation Architecture |
| :--- | :--- | :--- |
| **Financial Arithmetic** | Floating-point rounding errors (`0.1 + 0.2 !== 0.3`) | All monetary values are represented as integers in minor units (e.g. 5000000 paise for ₹50,000). Conversion to major units occurs strictly at presentation boundaries. |
| **Double Counting** | Counting a booking cost both in "Bookings" and in "Expenses" or "Future Estimates" | Canonical accounting identity mapping: Every financial commitment is linked (`bookingId`, `expenseId`, `itineraryItemId`) and categorized into settled, outstanding, or estimated. |
| **AI Hallucination** | LLM inventing fake prices, fake refunds, or overriding hard constraints | LLM is strictly prohibited from running the optimization algorithm. The recovery engine is 100% deterministic TypeScript code. The LLM only receives verified structured results for natural language explanation. |
| **External AI Outage** | Application crashes if Gemini API key is missing or network fails | Graceful fallback: Copilot includes rule-based deterministic explanation templates so the entire platform remains 100% functional without an API key. |
| **Database Dependency** | User cannot run locally if MongoDB service is not started | Server automatically falls back to an embedded in-memory MongoDB instance for local dev and testing if no external `MONGODB_URI` is reachable. |
| **Visual Inconsistency** | Disjointed dashboard components looking like mixed templates | Single Emerald Fintech design system token set codified in Tailwind CSS and reusable UI primitives. |

---

## 5. Next Audit Milestone

Proceed immediately to create `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/FEATURE_STATUS.md`, and `docs/DESIGN_SYSTEM.md`, followed by Phase 1 Foundation scaffolding.
