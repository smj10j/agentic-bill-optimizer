# PRD-003 — Smart Bill Pay Timing

**Priority**: P0
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Most people pay bills when they arrive or on due dates, but optimal timing depends on cash flow, due dates, grace periods, and yield opportunity cost. Paying too early means lost yield on idle cash; paying too late means late fees and credit score damage. No consumer tool optimizes the timing of bill payments holistically.

---

## Key Ideas

- **Cashflow-aware scheduling**: time payments around income deposits
- **Grace period exploitation**: safely delay payments to maximize yield without risking fees
- **Batch payment optimization**: group payments to reduce cognitive load and transaction costs
- **Yield-aware timing**: calculate opportunity cost of paying early vs. earning yield
- **Predictive cash flow modeling**: forecast balances to ensure sufficient funds at payment time
- **Autopay integration**: work alongside existing autopay rather than fighting it

---

## Success Metrics

| Metric | Target |
|---|---|
| Avg yield gained per user/month from timing optimization | >$2 |
| Late payments caused by smart scheduling | 0 |
| % of bills managed through smart pay | >60% of linked bills |
| User-reported financial stress reduction | Measurable improvement in survey |
| Avg days of float captured per bill | >3 days |
