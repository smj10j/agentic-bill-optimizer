# PRD-004 — Action Approval & Undo Framework

**Priority**: P0
**Status**: In Review
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Every action Orbit takes on a user's behalf must be explainable, approvable, and reversible. This framework is the trust infrastructure that makes all other agent features possible. Without a clear, consistent model for how actions are proposed, approved, and undone, users will never feel safe granting Orbit autonomy over their money. This PRD specifies that model.

---

## Problem Statement

Agent-initiated financial actions are meaningfully different from user-initiated ones: the user didn't explicitly decide to take them, which means they need stronger transparency, clearer consent mechanisms, and a reliable safety net. Currently, Orbit has no consistent model for any of this. This framework must be implemented before Autopilot Mode (PRD-002) can ship.

---

## Action State Machine

All agent-initiated actions follow a single state machine:

```
                    ┌─ auto_approved ─┐
proposed ──────────►│                 ├──► executing ──► completed ──► undo_requested
                    └─ pending ───────┘      │                │             │
                         │                  └──► failed       │         reversing
                         ├──► approved                        │             │
                         └──► rejected → cancelled            │         ┌───┴────────┐
                                                              │         │            │
                                                              └─────────► reversed   ► reversal_failed
```

**State definitions:**
- `proposed`: Agent has identified a candidate action; not yet acted on
- `auto_approved`: Action meets user's autopilot guardrails; will proceed automatically
- `pending`: Action exceeds guardrails or requires explicit approval
- `approved/rejected`: User responded to a pending action
- `executing`: Payment or operation in flight
- `completed`: Successfully finished
- `undo_requested`: User requested reversal within the undo window
- `reversing`: Reversal in progress
- `reversed`: Successfully undone
- `reversal_failed`: Reversal not possible; support escalation triggered

---

## Action Risk Classification

Every action is classified at proposal time. Classification drives default approval behavior.

| Risk Level | Criteria | Default Behavior |
|---|---|---|
| **Low** | Known biller, amount ≤ user limit, action type enabled in user's tier | Auto-approve |
| **Medium** | Known biller, amount near limit, or first time for this action type | Notify + 1hr window |
| **High** | New biller, amount exceeds limit, high-risk action type (cancel, large transfer) | Require explicit approval |
| **Critical** | Any action > $1,000, any action on credit/loan accounts, account disconnect | Require step-up auth |

Risk levels are computed server-side and cannot be overridden by the client.

---

## Approval Request Format

Every approval request — whether delivered as a push notification, in-app card, or email — must include exactly:

| Field | Description | Example |
|---|---|---|
| **Action** | Plain-English verb phrase | "Pay your electric bill" |
| **Amount** | Dollar amount with sign | "$127.45" |
| **Timing** | When this will happen | "Today, March 8" |
| **Reason** | Why Orbit is doing this | "Due date is March 10. Paying now captures 2 more days of yield." |
| **Outcome** | What happens if approved | "Funds transfer from Chase ····4821 to Electric Co." |
| **Risk** | Short risk statement | "Low — you've paid this biller 14 times before." |
| **Undo availability** | Whether this can be reversed | "You can undo this within 24 hours." |

**Action buttons**: [Approve] [Modify] [Reject] [Explain more]

"Explain more" opens an expanded view with full reasoning chain, account balances, and alternatives considered.

---

## Undo Window & Reversibility

### Undo Availability by Action Type

| Action Type | Undo Window | Reversibility |
|---|---|---|
| Yield sweep (in or out) | 24 hours | Always reversible (internal operation) |
| Bill payment via ACH (not yet settled) | Until T+1 business day | Return via ACH reversal |
| Bill payment via ACH (settled) | Not reversible via Orbit | Guide user to contact biller; Orbit assists |
| Subscription cancel (still in grace period) | Until billing cycle ends | Orbit helps user resubscribe |
| Subscription cancel (processed, no grace) | Not reversible | Orbit helps user resubscribe at current price |
| Rate negotiation initiation | Anytime before acceptance | Cancel outreach |
| Anomaly flag | Always | Unflag; no financial impact |

### Undo UX
- Undo is accessible from: push notification, action history feed, agent chat
- One tap: "Undo this" → confirmation → reversal in progress
- Undo status updates are pushed to the user in real time
- If reversal fails, Orbit immediately escalates to human support and provides a case number

### Undo Time Display
The undo window countdown is always visible in the action history: "Undo available for 21 more hours."

---

## Audit Trail

Every action is recorded in the `agent_actions` table with:
```
action_id, user_id, type, status, amount_cents, description,
reasoning, risk_level, approval_method, approved_by, approved_at,
executed_at, completed_at, undo_requested_at, reversed_at,
reversal_reason, metadata (JSON)
```

**Retention**: 7 years (standard financial record-keeping)

**User-facing action history:**
- Scrollable feed of all agent actions, newest first
- Plain-English description of each action and its outcome
- Status badge (Completed, Pending, Reversed, Failed)
- "View details" expands to show full reasoning + supporting data
- Filter by action type, date range, amount

---

## Pending Action Queue

When an action requires approval:
1. Action is created in `pending` state
2. Push notification + email sent (per PRD-006)
3. Pending action appears prominently in app (badge on nav, card at top of dashboard)
4. If no response within:
   - 4 hours: reminder notification
   - 24 hours: action auto-expires with notification ("Your pending electric bill approval expired. Pay it manually?")
5. Expired actions are never auto-approved on expiry

**Batch approval**: User can pre-approve a class of future actions: "Always auto-pay bills from this biller under $300." This creates a guardrail rule, not a blanket approval.

---

## Step-Up Authentication

Actions classified as Critical require step-up auth at the point of approval:
- Primary: WebAuthn (Face ID / Touch ID / passkey) — preferred
- Fallback: TOTP code (if 2FA enrolled)
- Fallback: Email confirmation link (if no 2FA)

Step-up auth is per-session with a 15-minute grace: approving a Critical action within 15 minutes of another does not require re-auth.

---

## Error Handling & Support Escalation

When an action fails or reversal is impossible, Orbit escalates:
1. Push + email notification with plain-English explanation
2. One-tap "Get help" CTA opens a support case
3. Support case includes the full action audit record (user-consented)
4. Orbit commits to making the user whole for platform errors (see policy)

"Platform error" = Orbit initiated an action it shouldn't have, or an action failed due to Orbit's bug. "User error" = user approved an action and changed their mind outside the undo window.

---

## Open Questions — Resolved

**Q: What if the user is unreachable (no push, email bouncing) and an action needs approval?**
A: The action expires in 24 hours and is never executed. We alert on next app open. Orbit always errs on the side of not acting without consent.

**Q: Should "Modify" be supported for all actions?**
A: Yes, but scoped: for bill payments, user can modify the date (within safe range) or decline; they cannot modify the amount (that's the biller's amount). For yield sweeps, user can modify the amount within the proposed ± 50% range.

**Q: How do we handle actions the user approved but didn't read?**
A: This is a feature, not a bug — if a user enables autopilot, rapid approval is intended. We track approval time and if a user reverses an action they approved in < 5 seconds, we show: "Next time, Orbit can handle this automatically. Want to update your settings?"

**Q: Are all undos free?**
A: Yes. Reversal costs (ACH return fees, etc.) are absorbed by Orbit. This is a trust investment. Users must never feel punished for correcting an agent error.

**Q: What is the data model for approval rules (guardrails)?**
A: Stored as `autopilot_rules` per user: `{action_type, max_amount_cents, biller_id (null = all), enabled, created_at}`. The agent evaluates rules at action-proposal time.

---

## Success Metrics

| Metric | Target |
|---|---|
| Successful undo rate (when requested within window) | 100% |
| Actions with explanation available | 100% |
| Avg time to approve a pending action | <60 seconds |
| Approval abandonment rate (seen but not acted on) | <10% |
| Step-up auth success rate | >95% |
| Support escalations due to failed reversals | <0.1% of actions |
| Actions reversed within undo window | <3% (indicates agent quality) |
| User trust score on action transparency | >4.2/5.0 in survey |
