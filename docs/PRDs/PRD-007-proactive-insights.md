# PRD-007 — Proactive Agent Insights

**Priority**: P0
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

The current agent only responds when asked. A truly useful financial agent should initiate conversations when it spots opportunities, risks, or patterns. "I noticed your streaming bill went up $3" is more valuable than waiting for the user to ask. Reactive-only agents leave money on the table.

---

## Key Ideas

- **Insight generation pipeline**: continuously scan transactions and accounts for noteworthy events
- **Relevance scoring**: rank insights by potential dollar impact and user interest
- **Timing optimization**: deliver insights when user is most likely to engage
- **Insight categories**: savings, risk, pattern, opportunity, anomaly
- **Actionable insights**: each insight includes a one-tap action (cancel, negotiate, switch)
- **Insight history/feed**: scrollable log of past insights and outcomes
- **Feedback loop**: user thumbs-up/down trains relevance model

---

## Success Metrics

| Metric | Target |
|---|---|
| Insights generated per user/week | 3-5 |
| Insight action rate (user acts on insight) | >20% |
| Avg dollar value per actionable insight | >$5 |
| User satisfaction with insight quality | >4.0 / 5.0 |
| False positive rate (irrelevant insights) | <15% |
