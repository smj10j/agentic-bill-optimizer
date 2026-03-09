# TODO — Orbit

Current implementation tasks, updated as work progresses.

---

## Sprint 1: MVP Scaffold + Core API — COMPLETE ✅

### Project Setup
- [x] CLAUDE.md with implementation loop
- [x] README.md with setup and deploy instructions
- [x] .gitignore
- [x] Root package.json (npm workspaces)
- [x] docs/PRDs/REGISTRY.md
- [x] docs/PRDs/PRD-001-mvp-foundation.md
- [x] docs/TDD.md
- [x] docs/API.md
- [x] docs/SECURITY.md
- [x] docs/DESIGN.md
- [x] Root tsconfig.json
- [x] packages/shared — shared types + money utils
- [x] apps/api — Cloudflare Workers + Hono setup
- [x] apps/web — React + Vite + TanStack Router setup
- [x] GitHub Actions CI workflow
- [x] Initial git commit

### Cloudflare Provisioning
- [x] D1 database created (`orbit-db`)
- [x] KV namespace created (`SESSIONS`)
- [x] D1 schema migrated (local + remote)
- [x] JWT_SECRET set as Worker secret
- [x] Cloudflare Pages project created (`orbit-app`)

### API Foundation
- [x] Hono app entry point with middleware (CORS, auth, error handling)
- [x] Auth routes (signup, login, refresh, logout)
- [x] Accounts routes (list, link, sync)
- [x] Transactions routes (list, get by id)
- [x] Subscriptions routes (list, update status, cancel)
- [x] Bills routes (list, pay)
- [x] Yield routes (get position, sweep-in, sweep-out)
- [x] Agent routes (chat/SSE, conversations, actions, reverse)
- [x] Finance service (D1 read/write for all entities)
- [x] Agent service (Claude API + tool use + SSE streaming)
- [x] Health endpoint
- [x] wrangler.toml configuration

### Mock Data Layer
- [x] Mock financial account adapter
- [x] Mock yield/money interface
- [x] Seed data for development

### Web Foundation
- [x] Vite config for Cloudflare Pages
- [x] Tailwind + CSS setup
- [x] TanStack Router setup
- [x] Auth store (context + localStorage)
- [x] Login/Signup pages
- [x] Protected layout shell (nav, header)
- [x] Dashboard page
- [x] Agent chat page (SSE streaming)
- [x] Bills page
- [x] Subscriptions page
- [x] Yield page
- [x] MoneyAmount, StatusBadge, Skeleton components
- [x] API client utility

### Deployment
- [x] API deployed to Cloudflare Workers
  → https://orbit-api.stevej-67b.workers.dev
- [x] Web deployed to Cloudflare Pages
  → https://orbit-app-c97.pages.dev
- [x] Health endpoint validated ✅

---

## Sprint 2: PRD-002 — Autopilot Mode ✅ COMPLETE

### DB / Migration
- [x] `0002_autopilot.sql` — `autopilot_settings` table + `agent_actions` extensions
- [x] Apply migration local D1
- [x] Apply migration remote D1

### Shared Types
- [x] `AutopilotTier`, `AutopilotSettings`, `ActionRiskLevel`, `ActionApprovalStatus`
- [x] Extend `AgentAction` with new fields

### Backend — Service
- [x] `services/autopilot.ts`: getSettings, updateSettings, evaluateAction, calculateTrustScore
- [x] Update `finance.ts`: insertAgentAction accepts new fields, reverseAgentAction uses 24h window
- [x] `finance.ts`: getPendingActions, approveAction, rejectAction

### Backend — Route
- [x] `routes/autopilot.ts`: GET/PUT settings, GET trust-score, GET/POST pending actions
- [x] Register in index.ts

### Backend — Agent integration
- [x] Wire evaluateAction into agent tool execution
- [x] Pass approval_status + risk_level when inserting actions

### Frontend
- [x] `lib/autopilot.ts` — typed API client
- [x] `pages/AutopilotPage.tsx` — tier selector, sliders, trust score, pending count
- [x] Add `/autopilot` route to TanStack Router + nav link

### Tests
- [x] evaluateAction guardrail tests (16 tests passing)
- [x] calculateTrustScore / getTrustLabel tests

### Docs + Deploy
- [x] Update PRD-002 status → Implemented
- [x] Update API.md with autopilot endpoints
- [x] Deploy + validate
- [x] Commit + push

---

## Sprint 2: PRD-042 — Dashboard & Home Experience ✅ COMPLETE

### Backend
- [x] `routes/dashboard.ts`: GET /dashboard/summary aggregate endpoint
- [x] Register in index.ts

### Frontend
- [x] `lib/dashboard.ts` — typed API client + DashboardSummary type
- [x] Rewrite `DashboardPage.tsx`:
  - [x] Net Worth Bar (real account + yield data)
  - [x] Action Required cards (pending approval actions + overdue bills)
  - [x] Autopilot Status card (enabled state, tier, actions this week)
  - [x] Upcoming Bills (next 7 days, pending only)
  - [x] Yield Snapshot (APY, balance, earnings)
  - [x] Recent Activity (last 5 agent actions)
  - [x] Flagged subscriptions banner
- [x] Loading skeleton + error state + refresh button

### Docs + Deploy
- [x] Update PRD-042 status → Implemented
- [x] Update API.md with dashboard/summary endpoint
- [x] Deploy + validate
- [x] Commit + push

---

## Sprint 2: PRD-003 — Smart Bill Pay Timing ✅ COMPLETE

### DB / Migration
- [x] `0003_smart_bill_pay.sql` — add smart pay columns to bills table
- [x] Apply migration local + remote D1

### Shared Types
- [x] Extend `Bill` type with smart pay fields (gracePeriodDays, lateFeeCents, paymentRail, smartPayEnabled, billerCategory)

### Backend — Service
- [x] `services/smart-bill-pay.ts`: calculateOptimalPayDate, effectiveGracePeriod, getSmartBillSchedule
- [x] Update `finance.ts` getBills/toBill to read new columns + updateBillSmartPay

### Backend — Route
- [x] `GET /bills/schedule` — bills with computed smart pay timing + yield savings
- [x] `PUT /bills/:id` — update grace_period_days, smart_pay_enabled, biller_category

### Frontend
- [x] `lib/bills.ts` — typed API client
- [x] Rewrite `BillsPage.tsx` — real data, smart pay dates, yield savings, color-coded badges, summary bar

### Tests
- [x] 15 unit tests for scheduling algorithm (calculateOptimalPayDate + effectiveGracePeriod)

### Docs + Deploy
- [x] Update PRD-003 → Implemented, REGISTRY.md, API.md
- [x] Deploy + validate
- [x] Commit + push

---

## Sprint 3: PRD-007 / PRD-043 / PRD-044 ✅ COMPLETE

- [x] PRD-007 Proactive Agent Insights: detection pipeline, scoring, routes, InsightsPage
- [x] PRD-043 First-Run & Demo Mode: 5-step onboarding, demo persona (Alex), demo middleware
- [x] PRD-044 Settings Hub: autopilot, accounts, notifications, profile, intelligence sections

---

## Sprint 4: Remaining P0 PRDs — IN PROGRESS

### PRD-004: Action Approval & Undo Framework ✅ COMPLETE

#### Backend
- [x] `POST /actions/:id/approve` — HTTP route
- [x] `POST /actions/:id/reject` — HTTP route
- [x] `GET /actions/pending` — HTTP route
- [x] Demo middleware intercepts for pending/approve/reject

#### Frontend
- [x] `pages/ActionHistoryPage.tsx` — pending actions section with Approve/Reject buttons + polling
- [x] `approveAction()`, `rejectAction()`, `getPendingActions()` in `lib/actions.ts`
- [x] Undo countdown timer

---

### PRD-045: Bill Payment Execution (Phase 1 — Simulation) ✅ COMPLETE

#### DB / Migration
- [x] `0007_payments.sql` — payments table
- [x] Apply migration local + remote D1

#### Backend — Service
- [x] `services/payment-sim.ts` — `advancePaymentStatus()` with timed transitions + 5% failure rate
- [x] `finance.ts`: createPayment, getPayments, getPaymentByIdempotencyKey, updatePaymentStatus, cancelPayment
- [x] `services/notifications.ts`: notifyPaymentFailed()

#### Backend — Route
- [x] Updated `POST /bills/:id/pay` — idempotency key, creates payment record
- [x] `GET /payments` — list payments with sim advancement
- [x] `POST /payments/:id/cancel`
- [x] Registered in index.ts + demo middleware

#### Frontend
- [x] `lib/payments.ts`
- [x] `pages/ActionHistoryPage.tsx` — pending action cards with approve/reject

#### Tests
- [x] 6 payment-sim unit tests

---

### PRD-006: Push Notifications & Alerts ✅ COMPLETE (Phase 1)

#### Backend
- [x] Anti-fatigue rules: 7-day dedup on type + max 3 non-critical/day
- [x] `notifyPaymentFailed()` helper (bypasses anti-fatigue, critical priority)

#### Frontend
- [x] `public/sw.js` — service worker for push events
- [x] Register service worker in `main.tsx`
- [ ] VAPID web push send — deferred pending VAPID keys
- [ ] Email (Resend) — deferred pending API key

---

### PRD-005: Real Account Linking
- [ ] **Deferred** — requires Plaid API credentials. Stubs + UI already in place.

---

### Registry + Docs ✅
- [x] Update REGISTRY.md: PRD-007, PRD-043, PRD-044, PRD-004, PRD-045, PRD-006 → Implemented
- [ ] Update API.md with new endpoints
- [x] Commit + push

---

## Sprint 2: Backlog

### Auth & UX
- [x] Anthropic API key set as Worker secret ✅
- [ ] Add credits to Anthropic account at console.anthropic.com (balance currently zero)
- [ ] Validate agent chat end-to-end in production
- [ ] Token refresh flow wired in web API client
- [ ] Better error toasts on auth failures

### Real Data Integration
- [ ] Real account link flow (Plaid or equivalent)
- [ ] Periodic background sync via Cron Triggers

### Agent Improvements
- [ ] Conversation history trimming (summarize when >20 messages)
- [ ] Rate limiting on /agent/chat endpoint
- [ ] Agent proactive insights push (scheduled triggers)

### Testing
- [ ] API unit tests (auth, finance service)
- [ ] API integration tests (route-level with Workers test bindings)
- [ ] E2E tests for auth flow (Playwright)

### Production Hardening
- [ ] GitHub repo remote set + push to origin
- [ ] GitHub Actions connected to Cloudflare (CLOUDFLARE_API_TOKEN secret)
- [ ] Cloudflare Pages connected to GitHub for auto-deploy
- [ ] Custom domain (optional)
