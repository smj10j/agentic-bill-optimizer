# PRD-008 — Bill Negotiation Agent

**Priority**: P1
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Americans overpay billions annually on recurring bills (internet, phone, insurance) because negotiation is time-consuming and awkward. Most people know they could get a better rate but never call. An AI agent could handle negotiations via chat, email, or structured provider APIs to secure lower rates on behalf of the user.

---

## Key Ideas

- **Provider-specific negotiation playbooks**: scripted strategies per provider type
- **Competitive rate research**: automatically gather competitor pricing as leverage
- **Success-based fee model**: Orbit takes a % of savings, user pays nothing if no savings
- **Negotiation history tracking**: log all attempts, outcomes, and expiration dates
- **Re-negotiation reminders**: alert when promotional rates expire
- **Estimated savings calculator**: show potential savings before user opts in
- **Letter of authorization flow**: user grants agent permission to negotiate on their behalf

---

## Success Metrics

| Metric | Target |
|---|---|
| Avg savings per successful negotiation | >$15/month |
| Negotiation success rate | >50% |
| Users opting into negotiation | >30% of eligible users |
| Time from initiation to resolution | <5 business days |
| Re-negotiation rate (user uses it again) | >60% |
