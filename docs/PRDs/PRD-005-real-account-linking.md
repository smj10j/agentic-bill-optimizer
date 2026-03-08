# PRD-005 — Real Account Linking

**Priority**: P0
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

The MVP uses mock financial data, which limits Orbit to a demo experience. To deliver real value, Orbit must connect to users' actual bank accounts, credit cards, and billers to see real balances, transactions, and bills. This is the critical path from demo to real product and the single biggest unlock for user trust and retention.

---

## Key Ideas

- **Plaid (or equivalent) integration**: leverage established aggregator for broad institution coverage
- **Secure token storage**: encrypted credentials, never store raw bank passwords
- **Institution search**: let users find their bank/credit union quickly
- **Multi-account support**: checking, savings, credit cards, loans all in one view
- **Automatic refresh**: keep data fresh without user intervention
- **Connection health monitoring**: detect and alert on stale or broken connections
- **Graceful degradation**: app remains functional with partial or failed connections

---

## Success Metrics

| Metric | Target |
|---|---|
| Account link success rate | >85% on first attempt |
| Institutions supported | Top 95% of US deposit volume |
| Avg time to link first account | <2 minutes |
| Connection uptime | >99% |
| Data freshness (time since last sync) | <6 hours |
