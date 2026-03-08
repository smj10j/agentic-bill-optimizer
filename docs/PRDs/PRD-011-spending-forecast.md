# PRD-011 — Spending Forecast Engine

**Priority**: P1
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Most people don't know what next month will cost them. Unexpected expenses cause overdrafts, missed payments, and financial stress. Predicting upcoming expenses based on historical patterns, known bills, and seasonal trends would help users plan ahead and avoid surprises.

---

## Key Ideas

- **ML-based spending prediction**: model trained on user's historical transaction patterns
- **Seasonal adjustment**: account for holidays, annual renewals, back-to-school, etc.
- **Upcoming known expenses**: incorporate confirmed bills and scheduled payments
- **Confidence intervals**: show range of expected spending, not just point estimates
- **"What if" scenarios**: let users model the impact of changes (new subscription, job change)
- **Forecast vs actual tracking**: show prediction accuracy to build user trust
- **Low-balance early warning**: alert when forecast predicts insufficient funds

---

## Success Metrics

| Metric | Target |
|---|---|
| Forecast accuracy (within 10% of actual) | >70% of months |
| Overdraft events prevented | Measurable reduction vs. pre-Orbit |
| Users checking forecast weekly | >30% |
| Avg forecast horizon usefulness | 30 days out |
| Low-balance warnings acted upon | >50% |
