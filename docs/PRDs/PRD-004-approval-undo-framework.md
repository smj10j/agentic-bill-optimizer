# PRD-004 — Action Approval & Undo Framework

**Priority**: P0
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Users won't trust an AI agent with their money without robust approval workflows and the ability to reverse actions. Currently there is no consistent framework for how the agent requests permission, how users review pending actions, or how they can undo completed actions. This framework is a prerequisite for Autopilot Mode and all other agent-initiated actions.

---

## Key Ideas

- **Approval tiers by amount/risk**: low-risk actions auto-approve, high-risk require explicit consent
- **24-hour undo window**: every agent action is reversible within a grace period
- **Pending action queue**: users can review, approve, modify, or reject queued actions
- **Push notification approvals**: approve/reject directly from notification without opening app
- **Batch approval for routine actions**: "approve all bills under $50" style bulk actions
- **Plain-English action summaries**: every action described in clear language with expected outcome

---

## Success Metrics

| Metric | Target |
|---|---|
| % of actions with successful undo when requested | 100% within window |
| Avg time to approve a pending action | <30 seconds |
| User trust score (post-action survey) | >4.0 / 5.0 |
| Approval abandonment rate | <10% |
| Actions reversed within undo window | <3% (indicates agent quality) |
