# TripGuard — Adaptive Travel Budget & Itinerary Recovery Intelligence Platform

> **Product Tagline:** *Save your trip. Not just your budget.*  
> **Visual Identity:** Premium Hybrid SaaS + Emerald Fintech  
> **Architecture:** Modular Monolith (Express.js TypeScript Backend + Vite React TypeScript Frontend)

---

## 1. Problem & Mission

Travelers plan trips with a fixed budget, but financial conditions evolve: accommodation rates surge, transport costs exceed forecasts, and activities create rigid commitments. When an itinerary becomes financially infeasible, existing apps only offer generic expense tracking or chatbot suggestions.

TripGuard solves a fundamentally different decision-making challenge:
**When a trip becomes financially infeasible, what can change, what must remain protected, and which recovery plan restores affordability with the least experiential disruption?**

---

## 2. Core Architectural Pillars

1. **Deterministic Optimization Core:** Pure TypeScript constraint-satisfaction engine generating three mathematically distinct recovery plans (*Minimum Disruption*, *Balanced Recovery*, *Maximum Savings*) with zero hallucination.
2. **Canonical Financial Accounting:** Monetary calculations execute strictly in **integer minor currency units** (paise/cents) to eliminate IEEE 754 floating-point drift. Strict canonical identity tracking eliminates double-counting across confirmed bookings, settled expenses, and future estimates.
3. **Hard Constraint Guarantees:** Sights and activities marked `MUST_DO` or locked (`isLocked`) are strictly protected from modification or removal.
4. **Immutable Decision Ledger & Versioning:** Every recovery run creates an immutable cryptographic snapshot hash. Approving a proposal transitions the itinerary to version `N + 1` without silently modifying historical records.
5. **TripGuard Copilot:** Server-side Google Gemini advisory integration grounded strictly in verified backend financial facts, with seamless deterministic fallback when offline or without an API key.

---

## 3. Technology Stack

- **Backend:** Node.js, Express.js, TypeScript, Mongoose, Zod, JWT (`jsonwebtoken`), `bcryptjs`, Helmet, CORS, Rate Limiting.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Database:** MongoDB (with automatic embedded `mongodb-memory-server` fallback for zero-configuration local development and automated testing).
- **Test Framework:** Vitest with Supertest.

---

## 4. Quick Start & Local Development

### 4.1 Prerequisites
- Node.js `v20.0.0+` or `v24.0.0+`
- npm `10.0.0+` or `11.0.0+`

### 4.2 Installation
Clone the repository and install all dependencies:
```bash
git clone <repository_url>
cd tripguard
npm install
```

### 4.3 Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(TripGuard runs out of the box with zero external configuration. If no external `MONGODB_URI` is reachable, an embedded in-memory MongoDB instance automatically initializes).*

### 4.4 Seed Demonstration Data
Seed the master demonstration scenario (Tokyo Autumn Discovery 2026):
```bash
npm run seed
```
**Seeded Demo Credentials:**
- **Email:** `demo@tripguard.ai`
- **Password:** `TripGuard2026!`

### 4.5 Run Development Servers
Start both backend API (`http://localhost:5000`) and frontend client (`http://localhost:5173`):
```bash
npm run dev
```

### 4.6 Execute Automated Test Suite
Run the financial accounting, deterministic optimizer, and end-to-end API test suites:
```bash
npm test
```

### 4.7 Production Build
Compile and bundle both backend and frontend for production:
```bash
npm run build
```

---

## 5. Walkthrough of the Hackathon Demonstration

| Step | Scene | What to Observe |
| :---: | :--- | :--- |
| **1** | **Sign In** | Click **"Demo Credentials"** on the login screen to autofill `demo@tripguard.ai` / `TripGuard2026!`. |
| **2** | **Financial Diagnosis** | Overview dashboard displays: **Budget: ₹50,000**, **Projected: ₹57,000**, and **Deficit: ₹7,000** with an `OVER_BUDGET` alert. |
| **3** | **Itinerary Constraint Inspection** | Open **Itinerary Planner**. Inspect Day 2: *Senso-ji Temple* is marked `MUST_DO` & `LOCKED` (unalterable constraint). Day 1: *Shibuya Sky Observation Deck* (₹1,500) is marked `OPTIONAL`. |
| **4** | **Recovery Generation** | Open **Recovery Center**. Click **"Regenerate Analysis"** to see three distinct strategies computed by the deterministic optimizer. |
| **5** | **Strategy Comparison** | Compare *Minimum Disruption* (disruption score 20/100), *Balanced Recovery* (Recommended, saves ₹7,000, disruption 35/100), and *Maximum Savings* (saves ₹10,700, disruption 65/100). |
| **6** | **Impact Details Inspection** | Open **"View Details"** on Balanced Recovery. Inspect side-by-side replacements: Ryokan replaces hotel (+₹3,500 net), Skyliner Rail replaces VIP taxi (+₹2,000 net), Free Metropolitan Observatory replaces paid deck (+₹1,500 net). Total: **+₹7,000 net savings**. |
| **7** | **Approval & Versioning** | Click **"Approve Plan"**. Confirm decision. Itinerary transitions from **v1 → v2**. Forecast updates to **₹50,000** (budget fully recovered, ₹0 deficit). |
| **8** | **Audit Ledger Verification** | Navigate to **Recovery Ledger**. Verify the immutable snapshot hash and chronological approval event. |
| **9** | **TripGuard Copilot** | Navigate to **TripGuard Copilot**. Ask: *"Why was my trip over budget?"* or *"Compare my recovery strategies"*. Observe authoritative answers anchored in backend truth. |

---

## 6. Project Structure

```
tripguard/
├── docs/                      # Architectural specifications and plans
│   ├── PROJECT_AUDIT.md       # Audit baseline & environment findings
│   ├── ARCHITECTURE.md        # Technical architecture & mathematical definitions
│   ├── IMPLEMENTATION_PLAN.md # Phased execution roadmap
│   ├── FEATURE_STATUS.md      # Screen-by-screen feature matrix
│   └── DESIGN_SYSTEM.md       # Emerald Fintech UI design tokens
├── server/                    # Express.js + TypeScript Backend
│   ├── src/
│   │   ├── config/            # DB connectors, constants, env validation
│   │   ├── financial/         # Canonical ledger & forecasting engine
│   │   ├── recovery/          # Deterministic multi-strategy optimizer
│   │   ├── copilot/           # Gemini AI integration with deterministic fallback
│   │   ├── models/            # Mongoose schemas (User, Trip, ItineraryItem, etc.)
│   │   ├── routes/            # REST API endpoints (/api/v1/*)
│   │   └── seed/              # Master demo seed script
│   └── tests/                 # Vitest financial, recovery, and API tests
└── client/                    # Vite + React + TypeScript Frontend
    ├── src/
    │   ├── components/        # Layout, StatCard, StrategyCard, DetailsDrawer, Modals
    │   ├── context/           # AuthContext, TripContext
    │   ├── pages/             # 13 Application Screens
    │   └── services/          # Typed API client
    └── tailwind.config.js     # Emerald Fintech theme tokens
```

---

## 7. License
UNLICENSED — Built for TripGuard Hackathon & Enterprise Demo.
