# PRD-010 — Yield Optimization Engine

**Priority**: P1
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Users have idle cash sitting in checking accounts earning 0% while high-yield options exist. Even users who want to earn yield don't know the optimal amount to allocate between liquid spending money and yield-bearing positions. The agent should automatically optimize cash allocation to maximize earnings while ensuring liquidity for upcoming expenses.

---

## Key Ideas

- **Minimum float calculation**: determine safe liquid balance based on spending patterns
- **Auto-sweep schedules**: move excess cash to yield-bearing accounts on a cadence
- **Yield rate comparison**: continuously monitor and recommend best available rates
- **Risk-adjusted allocation**: match user risk tolerance to yield products
- **Instant withdrawal for unexpected expenses**: never lock up money the user might need
- **Yield projection dashboard**: show estimated annual earnings at current allocation

---

## Success Metrics

| Metric | Target |
|---|---|
| Avg incremental yield per user/month | >$5 |
| Users with active yield allocation | >50% of linked accounts |
| Liquidity shortfall events (insufficient float) | 0 |
| Avg idle cash reduction | >40% of excess balance |
| User satisfaction with yield features | >4.0 / 5.0 |
