# PRD-016 — Anomaly Detection & Fraud Alerts

**Priority**: P1
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Fraudulent charges and billing errors cost consumers billions annually. Most people don't notice small unauthorized charges or billing mistakes buried in long transaction lists. The agent should continuously monitor transactions and flag anything unusual — duplicate charges, unexpected amount changes, unknown merchants — before the user even has to look.

---

## Key Ideas

- Statistical anomaly detection on transaction amounts and frequency
- Merchant pattern matching (known merchants vs. unknown/suspicious)
- Duplicate charge detection (same amount, same merchant, short timeframe)
- Amount deviation alerts (e.g., your electric bill jumped 40%)
- Geographic anomaly flags (charges from unusual locations)
- One-tap dispute initiation directly from the alert
- Learning from user feedback to reduce false positives over time

---

## Success Metrics

- Fraud/error detection rate (% of anomalous charges caught)
- False positive rate (alerts dismissed as "not a problem")
- Average time-to-detection vs. user self-discovery
- Dispute initiation rate from alerts
- Dollars recovered through flagged charges
