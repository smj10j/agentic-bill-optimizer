# PRD-025 — Price Memory & Increase Alerts

**Priority**: P2
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Subscription prices and recurring bills creep up over time. A $1/month increase across 10 services is $120/year that most people never notice. Without historical price tracking, users have no visibility into how much more they're paying compared to last year. The agent should remember what you used to pay and alert you when prices increase.

---

## Key Ideas

- Historical price tracking per merchant and service
- Automatic increase detection and alerting with dollar and percentage change
- Annual price inflation summary across all recurring charges
- Competitor price comparison when increases are detected
- Negotiation trigger on price increases (agent offers to help reduce)
- Dashboard: "you've paid $X more this year due to price increases"

---

## Success Metrics

- Price increases detected per user per year
- Alert-to-action rate (users who take action after increase alerts)
- Dollars saved through negotiation or switching triggered by alerts
- Detection accuracy (true increases vs. false positives)
- User awareness improvement (survey: "did you know X went up?")
