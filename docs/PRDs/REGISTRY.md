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

| ID | Title | Priority | Status | Last Updated | Notes |
|---|---|---|---|---|---|
| [PRD-001](./PRD-001-mvp-foundation.md) | MVP Foundation | P0 | `Implemented` | 2026-03-08 | Phase 1 complete and deployed. Phase 2 (autopilot, real integrations) complete. |
| [PRD-002](./PRD-002-autopilot-mode.md) | Autopilot Mode & Agent Autonomy | P0 | `Implemented` | 2026-03-08 | Tiered autopilot, guardrail evaluation, trust score, pending action approval — deployed |
| [PRD-003](./PRD-003-smart-bill-pay.md) | Smart Bill Pay Timing | P0 | `Implemented` | 2026-03-08 | Scheduling algo, grace periods, yield savings estimate, smart pay UI — deployed |
| [PRD-004](./PRD-004-approval-undo-framework.md) | Action Approval & Undo Framework | P0 | `Implemented` | 2026-03-09 | Approve/reject/pending HTTP routes; undo countdown; pending action UI. Step-up auth deferred (P1). |
| [PRD-005](./PRD-005-real-account-linking.md) | Real Account Linking | P0 | `Implemented` | 2026-03-09 | Phase 1 complete: Plaid Link, token exchange, account upsert, background transaction sync. Webhooks (PRD-048) and OAuth callback deferred. |
| [PRD-006](./PRD-006-notifications-alerts.md) | Push Notifications & Alerts | P0 | `Implemented` | 2026-03-09 | In-app feed, anti-fatigue rules, service worker scaffolding deployed. VAPID/email deferred. |
| [PRD-007](./PRD-007-proactive-insights.md) | Proactive Agent Insights | P0 | `Implemented` | 2026-03-09 | Detection pipeline, scoring, routes, InsightsPage — deployed. |
| [PRD-008](./PRD-008-bill-negotiation.md) | Bill Negotiation Agent | P1 | `Draft` | 2026-03-09 | Updated: tiered approach (coaching → computer use → partnership), provider playbooks, success-fee model, data model. |
| [PRD-009](./PRD-009-subscription-cancellation.md) | Subscription Cancellation Agent | P1 | `Draft` | 2026-03-09 | Updated: computer use architecture, cancellation method tiers, safeguards, provider DB, post-cancellation monitoring. |
| [PRD-010](./PRD-010-yield-optimization.md) | Yield Optimization Engine | P1 | `Draft` | 2026-03-09 | Updated: current rate landscape (4-5% APY), float algorithm, embedded banking partners, stablecoin yield path. |
| [PRD-011](./PRD-011-spending-forecast.md) | Spending Forecast Engine | P1 | `Draft` | 2026-03-08 | ML-based spending prediction and planning |
| [PRD-012](./PRD-012-subscription-roi.md) | Subscription ROI Analyzer | P1 | `Draft` | 2026-03-08 | Quantify cost-per-use for subscriptions |
| [PRD-013](./PRD-013-paycheck-splitter.md) | Paycheck Auto-Splitter | P1 | `Draft` | 2026-03-08 | Auto-allocate incoming deposits by rules |
| [PRD-014](./PRD-014-emergency-fund.md) | Emergency Fund Autopilot | P1 | `Draft` | 2026-03-08 | Invisible micro-savings toward emergency fund |
| [PRD-015](./PRD-015-two-factor-auth.md) | Two-Factor Authentication | P1 | `Draft` | 2026-03-08 | TOTP, passkeys, and step-up auth |
| [PRD-016](./PRD-016-anomaly-detection.md) | Anomaly Detection & Fraud Alerts | **P0** | `Draft` | 2026-03-09 | **Elevated to P0** — now directly achievable with real Plaid data. Updated: detection algorithms, alert severity model, dispute assistance, implementation phases. |
| [PRD-017](./PRD-017-deal-scout.md) | Deal Scout & Cashback Finder | P1 | `Draft` | 2026-03-08 | Proactive deal surfacing based on spending patterns |
| [PRD-018](./PRD-018-debt-optimizer.md) | Debt Paydown Optimizer | P1 | `Draft` | 2026-03-08 | Optimal debt repayment strategy engine |
| [PRD-019](./PRD-019-budget-guardrails.md) | Category Budget Guardrails | P1 | `Draft` | 2026-03-08 | Flexible soft-limit budgeting with agent nudges |
| [PRD-020](./PRD-020-agent-memory.md) | Agent Conversation Memory | P1 | `Draft` | 2026-03-09 | Updated: Claude tool-based memory extraction, structured schema (goals/preferences/facts), goal tracking, context injection. |
| [PRD-021](./PRD-021-round-up-savings.md) | Round-Up Savings to Yield | P2 | `Draft` | 2026-03-08 | Micro-saving via purchase round-ups with yield |
| [PRD-022](./PRD-022-bill-calendar.md) | Bill Calendar & Payment Scheduling | P2 | `Draft` | 2026-03-08 | Visual calendar view of financial obligations |
| [PRD-023](./PRD-023-weekly-digest.md) | Weekly Financial Digest | P2 | `Draft` | 2026-03-08 | Periodic email/push summary of financial activity |
| [PRD-024](./PRD-024-financial-health-score.md) | Financial Health Score | P2 | `Draft` | 2026-03-08 | Holistic financial wellness metric |
| [PRD-025](./PRD-025-price-memory.md) | Price Memory & Increase Alerts | P2 | `Draft` | 2026-03-08 | Historical price tracking and increase detection — feeds PRD-008 and PRD-016 |
| [PRD-026](./PRD-026-stablecoin-settlement.md) | Stablecoin Settlement Layer | P2 | `Draft` | 2026-03-09 | Updated: GENIUS Act regulatory context, USDC architecture, invisible-to-user design, DeFi yield path, risk mitigations. |
| [PRD-027](./PRD-027-cashflow-engine.md) | Cashflow Timing Engine | P2 | `Draft` | 2026-03-08 | Payment timing optimization for cash flow |
| [PRD-028](./PRD-028-household-mode.md) | Family & Household Mode | P2 | `Draft` | 2026-03-08 | Multi-user shared financial management |
| [PRD-029](./PRD-029-savings-challenges.md) | Savings Challenges & Gamification | P2 | `Draft` | 2026-03-08 | Gamified savings goals and streaks |
| [PRD-030](./PRD-030-onboarding-optimization.md) | Onboarding Flow Optimization | P2 | `Draft` | 2026-03-08 | Minimize time-to-value for new users |
| [PRD-031](./PRD-031-income-analysis.md) | Income Pattern Analysis | P2 | `Draft` | 2026-03-08 | Variable/gig income prediction and planning |
| [PRD-032](./PRD-032-receipt-scanner.md) | Smart Receipt Scanner | P2 | `Draft` | 2026-03-08 | OCR receipt capture and categorization |
| [PRD-033](./PRD-033-merchant-intelligence.md) | Merchant Intelligence | P2 | `Draft` | 2026-03-08 | Merchant pricing insights and alternatives |
| [PRD-034](./PRD-034-subscription-alternatives.md) | Subscription Alternative Finder | P2 | `Draft` | 2026-03-08 | Suggest better-value subscription replacements |
| [PRD-035](./PRD-035-voice-agent.md) | Voice Agent Interface | P3 | `Draft` | 2026-03-08 | Voice-based financial agent interaction |
| [PRD-036](./PRD-036-messaging-commands.md) | SMS & Messaging Commands | P3 | `Draft` | 2026-03-08 | Financial commands via SMS/iMessage/WhatsApp |
| [PRD-037](./PRD-037-group-negotiation.md) | Group Bill Negotiation | P3 | `Draft` | 2026-03-08 | Collective bargaining for lower rates |
| [PRD-038](./PRD-038-warranty-tracker.md) | Warranty & Return Tracker | P3 | `Draft` | 2026-03-08 | Track return windows and warranty expiry |
| [PRD-039](./PRD-039-credit-monitoring.md) | Credit Score Monitoring | P3 | `Draft` | 2026-03-08 | Continuous score tracking with AI improvement recs |
| [PRD-040](./PRD-040-developer-api.md) | Developer API & Webhooks | P3 | `Draft` | 2026-03-08 | Open API for third-party integrations |
| [PRD-041](./PRD-041-annual-report.md) | Annual Financial Report | P3 | `Draft` | 2026-03-08 | Spotify Wrapped-style year-end financial summary |
| [PRD-042](./PRD-042-dashboard-home-experience.md) | Dashboard & Home Experience | P0 | `Implemented` | 2026-03-08 | Full dashboard: balance bar, action queue, autopilot card, bills, yield, activity — deployed |
| [PRD-043](./PRD-043-first-run-demo-mode.md) | First-Run Experience & Demo Mode | P0 | `Implemented` | 2026-03-09 | 5-step onboarding, demo persona (Alex), demo middleware, demo banner — deployed. |
| [PRD-044](./PRD-044-settings-configuration-hub.md) | Settings & Configuration Hub | P0 | `Implemented` | 2026-03-09 | 6-section settings hub with deep linking, notification prefs, autopilot, profile — deployed. |
| [PRD-045](./PRD-045-bill-payment-execution.md) | Bill Payment Execution & Money Movement | P0 | `Implemented` | 2026-03-09 | Phase 1 simulation deployed. Phase 2 (real ACH) → PRD-046. |
| [PRD-046](./PRD-046-real-ach-money-movement.md) | Real ACH Money Movement | **P0** | `Draft` | 2026-03-09 | **NEW** — Phase 2 of PRD-045. Plaid Transfer integration, ACH origination, regulatory path, return handling. |
| [PRD-047](./PRD-047-computer-use-agent.md) | Computer Use Agent | **P1** | `Draft` | 2026-03-09 | **NEW** — Claude computer use for autonomous cancellations, negotiations, refund chasing. Core competitive moat. |
| [PRD-048](./PRD-048-plaid-webhooks-realtime-sync.md) | Plaid Webhooks & Real-Time Sync | **P1** | `Draft` | 2026-03-09 | **NEW** — Real-time transaction delivery, connection health automation, cursor-based sync. |
| [PRD-049](./PRD-049-tax-optimization.md) | Tax Optimization & Self-Employment Tools | **P1** | `Draft` | 2026-03-09 | **NEW** — Deduction detection, quarterly estimated taxes, tax reserve, year-end summary. High value for 1099 workers. |
| [PRD-050](./PRD-050-credit-card-optimizer.md) | Credit Card Reward Optimizer | **P1** | `Draft` | 2026-03-09 | **NEW** — Optimal card per category, rotating bonus tracking, annual fee analysis, affiliate revenue. |
| [PRD-051](./PRD-051-insurance-monitor.md) | Insurance Rate Monitor | **P1** | `Draft` | 2026-03-09 | **NEW** — Premium detection, benchmark overpayment, shopping triggers, affiliate partnerships. |
| [PRD-052](./PRD-052-native-mobile-app.md) | Native Mobile App | **P1** | `Draft` | 2026-03-09 | **NEW** — React Native + Expo, reliable push notifications (APNs/FCM), biometric auth, home screen widgets. |
| [PRD-053](./PRD-053-monetization-model.md) | Monetization Model | **P0** | `Draft` | 2026-03-09 | **NEW** — Subscription tiers (Free/$8/$15), success fees, yield spread, affiliate, anti-patterns. |

---

## Priority Summary

### P0 — Ship Next
| PRD | Blocker? | Estimated Complexity |
|---|---|---|
| PRD-016 Anomaly Detection | No — real data available now | Medium (2 weeks) |
| PRD-046 Real ACH Money Movement | Yes — PRD-010 yield needs this | Large (4-6 weeks, regulatory) |
| PRD-048 Plaid Webhooks | No — polling works as fallback | Small (1 week) |
| PRD-053 Monetization | No — required to monetize product | Medium (2 weeks) |

### P1 — High Value Next Sprint
- PRD-020 Agent Memory — dramatically improves agent quality
- PRD-047 Computer Use — core competitive differentiation
- PRD-049 Tax Optimization — high value, especially for freelancers
- PRD-050 Credit Card Optimizer — affiliate revenue + high engagement
- PRD-051 Insurance Monitor — large savings, affiliate revenue
- PRD-052 Native Mobile — required for reliable push + App Store

### Still Relevant P1 (original)
- PRD-008 Bill Negotiation — needs computer use first (PRD-047)
- PRD-009 Subscription Cancellation — needs computer use first (PRD-047)
- PRD-010 Yield Optimization — needs real ACH first (PRD-046)
- PRD-018 Debt Optimizer — valuable, transaction data available
- PRD-019 Budget Guardrails — valuable, can build on existing data

---

## Adding a New PRD

1. Create `docs/PRDs/PRD-NNN-short-description.md` using the next sequential ID (054+)
2. Add a row to this registry table
3. Set status to `Draft`
4. Update status as it moves through review → approval → implementation
