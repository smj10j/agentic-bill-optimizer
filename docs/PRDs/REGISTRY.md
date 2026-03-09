# PRD Registry — Orbit

All product requirements documents tracked here. Update status as PRDs move through review and implementation.

## Status Key

| Status | Meaning |
|---|---|
| `Draft` | In progress, not ready for review |
| `In Review` | Circulating for feedback |
| `Approved` | Signed off, ready for implementation |
| `In Progress` | Actively being implemented |
| `Implemented` | Feature shipped |
| `Deprecated` | Superseded or cancelled |

---

## Registry

| ID | Title | Status | Last Updated | Notes |
|---|---|---|---|---|
| [PRD-001](./PRD-001-mvp-foundation.md) | MVP Foundation | `Implemented` | 2026-03-08 | Phase 1 complete and deployed. Phase 2 (autopilot, real integrations) in backlog. |
| [PRD-002](./PRD-002-autopilot-mode.md) | Autopilot Mode & Agent Autonomy | `Implemented` | 2026-03-08 | Tiered autopilot, guardrail evaluation, trust score, pending action approval — deployed |
| [PRD-003](./PRD-003-smart-bill-pay.md) | Smart Bill Pay Timing | `Implemented` | 2026-03-08 | Scheduling algo, grace periods, yield savings estimate, smart pay UI — deployed |
| [PRD-004](./PRD-004-approval-undo-framework.md) | Action Approval & Undo Framework | `In Review` | 2026-03-08 | P0 — Action state machine; undo windows; step-up auth; audit trail |
| [PRD-005](./PRD-005-real-account-linking.md) | Real Account Linking | `In Review` | 2026-03-08 | P0 — Plaid integration; webhook sync; connection health; data governance |
| [PRD-006](./PRD-006-notifications-alerts.md) | Push Notifications & Alerts | `In Review` | 2026-03-08 | P0 — Web push + email; taxonomy; smart timing; anti-fatigue rules |
| [PRD-007](./PRD-007-proactive-insights.md) | Proactive Agent Insights | `In Review` | 2026-03-08 | P0 — Hybrid detection+Claude pipeline; insight catalog; relevance scoring |
| [PRD-008](./PRD-008-bill-negotiation.md) | Bill Negotiation Agent | `Draft` | 2026-03-08 | P1 — Automated bill negotiation for lower rates |
| [PRD-009](./PRD-009-subscription-cancellation.md) | Subscription Cancellation Agent | `Draft` | 2026-03-08 | P1 — Agent handles full cancellation flow |
| [PRD-010](./PRD-010-yield-optimization.md) | Yield Optimization Engine | `Draft` | 2026-03-08 | P1 — Auto-allocate idle cash to yield-bearing positions |
| [PRD-011](./PRD-011-spending-forecast.md) | Spending Forecast Engine | `Draft` | 2026-03-08 | P1 — ML-based spending prediction and planning |
| [PRD-012](./PRD-012-subscription-roi.md) | Subscription ROI Analyzer | `Draft` | 2026-03-08 | P1 — Quantify cost-per-use for subscriptions |
| [PRD-013](./PRD-013-paycheck-splitter.md) | Paycheck Auto-Splitter | `Draft` | 2026-03-08 | P1 — Auto-allocate incoming deposits by rules |
| [PRD-014](./PRD-014-emergency-fund.md) | Emergency Fund Autopilot | `Draft` | 2026-03-08 | P1 — Invisible micro-savings toward emergency fund |
| [PRD-015](./PRD-015-two-factor-auth.md) | Two-Factor Authentication | `Draft` | 2026-03-08 | P1 — TOTP, passkeys, and step-up auth |
| [PRD-016](./PRD-016-anomaly-detection.md) | Anomaly Detection & Fraud Alerts | `Draft` | 2026-03-08 | P1 — Continuous transaction monitoring and fraud flagging |
| [PRD-017](./PRD-017-deal-scout.md) | Deal Scout & Cashback Finder | `Draft` | 2026-03-08 | P1 — Proactive deal surfacing based on spending patterns |
| [PRD-018](./PRD-018-debt-optimizer.md) | Debt Paydown Optimizer | `Draft` | 2026-03-08 | P1 — Optimal debt repayment strategy engine |
| [PRD-019](./PRD-019-budget-guardrails.md) | Category Budget Guardrails | `Draft` | 2026-03-08 | P1 — Flexible soft-limit budgeting with agent nudges |
| [PRD-020](./PRD-020-agent-memory.md) | Agent Conversation Memory | `Draft` | 2026-03-08 | P1 — Persistent memory across agent conversations |
| [PRD-021](./PRD-021-round-up-savings.md) | Round-Up Savings to Yield | `Draft` | 2026-03-08 | P2 — Micro-saving via purchase round-ups with yield |
| [PRD-022](./PRD-022-bill-calendar.md) | Bill Calendar & Payment Scheduling | `Draft` | 2026-03-08 | P2 — Visual calendar view of financial obligations |
| [PRD-023](./PRD-023-weekly-digest.md) | Weekly Financial Digest | `Draft` | 2026-03-08 | P2 — Periodic email summary of financial activity |
| [PRD-024](./PRD-024-financial-health-score.md) | Financial Health Score | `Draft` | 2026-03-08 | P2 — Holistic financial wellness metric |
| [PRD-025](./PRD-025-price-memory.md) | Price Memory & Increase Alerts | `Draft` | 2026-03-08 | P2 — Historical price tracking and increase detection |
| [PRD-026](./PRD-026-stablecoin-settlement.md) | Stablecoin Settlement Layer | `Draft` | 2026-03-08 | P2 — Invisible instant settlement infrastructure |
| [PRD-027](./PRD-027-cashflow-engine.md) | Cashflow Timing Engine | `Draft` | 2026-03-08 | P2 — Payment timing optimization for cash flow |
| [PRD-028](./PRD-028-household-mode.md) | Family & Household Mode | `Draft` | 2026-03-08 | P2 — Multi-user shared financial management |
| [PRD-029](./PRD-029-savings-challenges.md) | Savings Challenges & Gamification | `Draft` | 2026-03-08 | P2 — Gamified savings goals and streaks |
| [PRD-030](./PRD-030-onboarding-optimization.md) | Onboarding Flow Optimization | `Draft` | 2026-03-08 | P2 — Minimize time-to-value for new users |
| [PRD-031](./PRD-031-income-analysis.md) | Income Pattern Analysis | `Draft` | 2026-03-08 | P2 — Variable/gig income prediction and planning |
| [PRD-032](./PRD-032-receipt-scanner.md) | Smart Receipt Scanner | `Draft` | 2026-03-08 | P2 — OCR receipt capture and categorization |
| [PRD-033](./PRD-033-merchant-intelligence.md) | Merchant Intelligence | `Draft` | 2026-03-08 | P2 — Merchant pricing insights and alternatives |
| [PRD-034](./PRD-034-subscription-alternatives.md) | Subscription Alternative Finder | `Draft` | 2026-03-08 | P2 — Suggest better-value subscription replacements |
| [PRD-035](./PRD-035-voice-agent.md) | Voice Agent Interface | `Draft` | 2026-03-08 | P3 — Voice-based financial agent interaction |
| [PRD-036](./PRD-036-messaging-commands.md) | SMS & Messaging Commands | `Draft` | 2026-03-08 | P3 — Financial commands via SMS/iMessage/WhatsApp |
| [PRD-037](./PRD-037-group-negotiation.md) | Group Bill Negotiation | `Draft` | 2026-03-08 | P3 — Collective bargaining for lower rates |
| [PRD-038](./PRD-038-warranty-tracker.md) | Warranty & Return Tracker | `Draft` | 2026-03-08 | P3 — Track return windows and warranty expiry |
| [PRD-039](./PRD-039-credit-monitoring.md) | Credit Score Monitoring | `Draft` | 2026-03-08 | P3 — Continuous score tracking with AI improvement recs |
| [PRD-040](./PRD-040-developer-api.md) | Developer API & Webhooks | `Draft` | 2026-03-08 | P3 — Open API for third-party integrations |
| [PRD-041](./PRD-041-annual-report.md) | Annual Financial Report | `Draft` | 2026-03-08 | P3 — Spotify Wrapped-style year-end financial summary |
| [PRD-042](./PRD-042-dashboard-home-experience.md) | Dashboard & Home Experience | `Implemented` | 2026-03-08 | Full dashboard: balance bar, action queue, autopilot card, bills, yield, activity — deployed |
| [PRD-043](./PRD-043-first-run-demo-mode.md) | First-Run Experience & Demo Mode | `In Review` | 2026-03-08 | P0 — Guided onboarding; rich demo persona ("Alex"); real→demo toggle |
| [PRD-044](./PRD-044-settings-configuration-hub.md) | Settings & Configuration Hub | `In Review` | 2026-03-08 | P0 — Cohesive home for autopilot, accounts, notifications, profile, intelligence |
| [PRD-045](./PRD-045-bill-payment-execution.md) | Bill Payment Execution & Money Movement | `In Review` | 2026-03-08 | P0 — Simulated (Phase 1) and real ACH (Phase 2) payment lifecycle |

---

## Adding a New PRD

1. Create `docs/PRDs/PRD-NNN-short-description.md` using the next sequential ID
2. Add a row to this registry table
3. Set status to `Draft`
4. Update status as it moves through review → approval → implementation
