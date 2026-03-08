# PRD-012 — Subscription ROI Analyzer

**Priority**: P1
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Users pay for subscriptions but have no idea if they're getting value. A streaming service at $15/mo used twice is $7.50/use; one used daily is $0.50/use. Without quantifying ROI, users can't make informed keep/cancel decisions and default to keeping everything.

---

## Key Ideas

- **Usage tracking integration**: connect to service APIs or infer usage from transaction/app data
- **Cost-per-use calculation**: simple $/use metric for each subscription
- **Peer comparison benchmarks**: "most users who pay for X use it N times/month"
- **Alternative suggestions**: recommend lower-cost alternatives for low-ROI subscriptions
- **"Last used" tracking**: surface how long since a subscription was actually used
- **ROI score and ranking**: stack-rank all subscriptions from best to worst value
- **Trial expiration alerts**: warn before free trials convert to paid

---

## Success Metrics

| Metric | Target |
|---|---|
| Subscriptions analyzed per user | >90% of detected subscriptions |
| Users who cancel a low-ROI subscription | >20% act on recommendations |
| Avg monthly savings from ROI-driven cancellations | >$10 |
| Trial-to-paid conversions prevented (unwanted) | >50% of flagged trials |
| User engagement with ROI dashboard | >1 view/week |
