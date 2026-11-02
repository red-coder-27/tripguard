# TripGuard — Visual Design System & UI Specifications

**Visual Identity:** Premium Hybrid SaaS + Emerald Fintech  
**Design Principle:** Clean, authoritative, confidence-inspiring financial intelligence.

---

## 1. Design Philosophy: Hybrid SaaS

TripGuard pairs a **Dark Navigation Sidebar** (evoking deep security, institutional strength, and focus) with a **Clean Light Workspace** (optimizing readability, dense financial data scanning, and clean tabular layouts), energized by **Emerald Fintech Accents** to signal savings, successful recovery, and fiscal health.

```
+------------------------------------------------------------------------------------+
| SIDEBAR (#101B2D)        | TOP HEADER (#FFFFFF, Border #E5EAF0)                    |
|                          | Breadcrumb / Title | Search | Status | User Avatar       |
| Logo [TripGuard Emerald] +---------------------------------------------------------+
|                          | WORKSPACE BACKGROUND (#F5F7FA)                          |
| Overview                 |                                                         |
| My Trips                 | [ Financial Health Card: Emerald / Amber / Red ]        |
| Itinerary                |                                                         |
| Expenses                 | [ Summary Stats Grid: Total | Spent | Projected | Gap ] |
| Bookings                 |                                                         |
| Recovery Center  [⚡]     | [ Recovery Strategy Cards / Data Tables / Recharts ]    |
| Recovery Ledger          |                                                         |
| What-If Simulator        |                                                         |
| Analytics                |                                                         |
| Copilot Assistant        |                                                         |
| Settings                 |                                                         |
+--------------------------+---------------------------------------------------------+
```

---

## 2. Color System & Design Tokens

### 2.1 Dark Navigation
- **Sidebar Background:** `#101B2D`
- **Sidebar Surface Secondary:** `#17243A`
- **Sidebar Border:** `#1E2D45`
- **Sidebar Muted Text:** `#A7B4C8`
- **Sidebar Active Surface:** `#22354A`
- **Sidebar Active Accent:** `#22C58B`
- **Sidebar Hover Surface:** `#192A40`

### 2.2 Workspace Surfaces
- **Workspace Background:** `#F5F7FA`
- **Card Background:** `#FFFFFF`
- **Card Muted Surface:** `#F0F4F7`
- **Primary Text:** `#172033`
- **Secondary / Muted Text:** `#64748B`
- **Subtle Text:** `#94A3B8`
- **Borders & Dividers:** `#E5EAF0`
- **Input Borders:** `#CBD5E1`

### 2.3 Semantic Accents & Statuses

#### Emerald (Success / Restored / Net Savings)
- **Primary Emerald:** `#059669` (Tailwind `emerald-600`)
- **Emerald Hover:** `#047857` (Tailwind `emerald-700`)
- **Emerald Light Surface:** `#D1FAE5` (Tailwind `emerald-100`)
- **Emerald Subtle Surface:** `#ECFDF5` (Tailwind `emerald-50`)
- **Emerald Text:** `#047857`
- *Usage:* Positive financial recovery, net savings, budget within limits, approve CTA, verified badge.

#### Warning (Budget Watch / Moderate Disruption)
- **Primary Amber:** `#D97706` (Tailwind `amber-600`)
- **Amber Background:** `#FEF3C7` (Tailwind `amber-100`)
- **Amber Subtle Surface:** `#FFFBEB` (Tailwind `amber-50`)
- **Amber Text:** `#92400E`
- *Usage:* Approaching usable budget limit (85-100%), pending reviews, moderate disruption score.

#### Critical (Over Budget / Infeasible / High Disruption)
- **Primary Red:** `#DC2626` (Tailwind `red-600`)
- **Red Background:** `#FEE2E2` (Tailwind `red-100`)
- **Red Subtle Surface:** `#FEF2F2` (Tailwind `red-50`)
- **Red Text:** `#991B1B`
- *Usage:* Overspending gap, hard constraint violation, non-refundable loss, cancellation warnings.

#### Information & Priorities
- **Must Do (Protected):** Violet `#7C3AED` / Surface `#EDE9FE` / Text `#5B21B6`
- **Flexible (Replaceable):** Blue `#2563EB` / Surface `#DBEAFE` / Text `#1D4ED8`
- **Optional (Removable):** Slate `#64748B` / Surface `#F1F5F9` / Text `#334155`

---

## 3. Typography & Numerical Formatting

- **Font Family:** `Inter`, system `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif.
- **Financial Numerals:** Always apply CSS `font-variant-numeric: tabular-nums` (`tabular-nums` in Tailwind) so currency amounts align vertically in tables, cards, and comparison lists.
- **Hierarchy:**
  - Page Titles: `text-2xl font-bold tracking-tight text-[#172033]`
  - Section Headings: `text-lg font-semibold text-[#172033]`
  - Metric Values: `text-2xl font-bold tabular-nums`
  - Body Text: `text-sm text-[#64748B] leading-relaxed`
  - Captions & Meta: `text-xs font-medium text-[#94A3B8]`

---

## 4. Component Patterns

### 4.1 Financial Stat Card
```tsx
<div className="bg-white rounded-xl border border-[#E5EAF0] p-5 shadow-sm hover:shadow transition-shadow">
  <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
    <span>{label}</span>
    <Icon className="w-4 h-4 text-[#94A3B8]" />
  </div>
  <div className="mt-2 text-2xl font-bold tabular-nums text-[#172033]">
    {formattedAmount}
  </div>
  <div className="mt-1 flex items-center text-xs font-medium">
    {trendBadge}
  </div>
</div>
```

### 4.2 Priority Badges
- **`MUST_DO` (Protected):**
  `bg-purple-100 text-purple-800 border-purple-200 border px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1`
- **`FLEXIBLE` (Replaceable):**
  `bg-blue-100 text-blue-800 border-blue-200 border px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1`
- **`OPTIONAL` (Removable):**
  `bg-slate-100 text-slate-700 border-slate-200 border px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1`

### 4.3 Recovery Strategy Card
- Highlighted with top border accent:
  - Minimum Disruption: Emerald/Teal accent border
  - Balanced Recovery: Emerald accent border with `RECOMMENDED` badge
  - Maximum Savings: Blue/Indigo accent border
- Displays: Revised Cost, Net Savings with positive badge, Disruption Score (0-100), Affected Items, and CTA to open Details Drawer.

---

## 5. Layout & Responsiveness Guidelines

- **Desktop (min-width: 1024px):**
  - Sidebar fixed width: `250px` (`w-[250px] shrink-0 min-h-screen bg-[#101B2D]`).
  - Content workspace: `flex-1 min-w-0 bg-[#F5F7FA] overflow-y-auto`.
  - Top header: sticky `h-16 border-b border-[#E5EAF0] bg-white px-6`.
- **Mobile (width < 1024px):**
  - Sidebar collapses into an animated backdrop drawer toggled by a hamburger button.
  - Cards stack vertically into single-column responsive grids.
  - Horizontal scrolling tables wrapped in `overflow-x-auto` with subtle scroll indicators.
  - Absolutely zero horizontal window overflow (`overflow-x-hidden` on outer shell).
