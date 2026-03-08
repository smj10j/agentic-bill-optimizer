# PRD-027 — Cashflow Timing Engine

**Priority**: P2
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Cash flow management is the number one financial stress for most Americans. Deciding when to pay what — given variable income timing and multiple obligations — is a complex optimization problem that humans solve poorly. Late fees, overdrafts, and missed opportunities result. The agent should optimize payment timing to maximize cash availability and minimize fees.

---

## Key Ideas

- Income prediction based on historical deposit patterns
- Obligation scheduling with priority ranking
- Payment prioritization algorithm (late fee risk, interest cost, due date)
- Minimum balance maintenance to avoid overdraft fees
- Just-in-time payments (pay as late as possible without penalty)
- Cash flow gap detection and early warning
- Short-term cash flow forecast (next 7/14/30 days)
- "What if I buy X today" impact analysis on upcoming obligations

---

## Success Metrics

- Overdraft and late fee reduction per user
- Average available balance improvement (cash not locked up early)
- Cash flow gap predictions vs. actual shortfalls (accuracy)
- User-reported financial stress reduction
- Payment timing optimization savings (interest and fee avoidance)
