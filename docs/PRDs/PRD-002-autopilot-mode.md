# PRD-002 — Autopilot Mode & Agent Autonomy

**Priority**: P0
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Users must manually approve every agent action, creating friction that undermines the "autopilot" value proposition. The agent should be able to act autonomously within user-defined guardrails such as spending limits, action types, and time windows. A progressive trust model lets the agent earn more autonomy as the user gains confidence in its decisions.

---

## Key Ideas

- **Tiered autonomy levels**: suggest only, auto-approve under $X, full autopilot
- **Per-category limits**: different thresholds for bills, subscriptions, yield sweeps
- **Cool-down / undo window**: every auto-action has a reversal grace period
- **Autonomy score**: agent earns trust based on track record (accuracy, savings delivered)
- **Weekly autonomy report**: summary of auto-taken actions, outcomes, and trust score trend
- **Guardrail configuration UI**: simple sliders/toggles, not a policy editor

---

## Success Metrics

| Metric | Target |
|---|---|
| % users enabling any autonomy tier | >40% within 30 days |
| Actions auto-approved per user/week | >3 |
| User trust score trend (month-over-month) | Positive for >70% of users |
| Undo rate on auto-approved actions | <5% |
| Escalation rate (agent unsure, asks user) | <15% of eligible actions |
