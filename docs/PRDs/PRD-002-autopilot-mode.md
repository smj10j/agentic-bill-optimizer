# PRD-002 — Autopilot Mode & Agent Autonomy

**Priority**: P0
**Status**: Implemented
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Autopilot is the core Orbit differentiator. Users should be able to hand over the tedious work of financial management — paying bills, optimizing timing, sweeping idle cash, flagging waste — and trust that Orbit handles it correctly within guardrails they control. The product earns autonomy progressively, starting with low-risk actions and expanding as the agent proves its accuracy and judgment.

---

## Problem Statement

Requiring user approval for every agent action defeats the purpose of an AI financial autopilot. But granting unconstrained autonomy over someone's money is a non-starter for trust. The solution is a progressive trust model: the agent starts in "suggestions only" mode, earns autonomy by demonstrating accuracy, and unlocks higher tiers as users gain confidence. Guardrails are always user-controlled, always visible, and always reversible.

---

## Autonomy Tiers

| Tier | Name | Behavior | Default |
|---|---|---|---|
| 0 | **Suggestions Only** | Agent surfaces insights and recommendations; user takes all actions manually | Yes (new users) |
| 1 | **Notify & Do** | Agent acts, then immediately notifies. User has a 1-hour undo window per action. | Opt-in |
| 2 | **Supervised Autopilot** | Agent acts within configured limits; sends a daily digest of all actions. | Opt-in |
| 3 | **Full Autopilot** | Agent acts on everything within guardrails; weekly summary only. | Opt-in (high trust) |

Tier 3 is only available after 30 days of activity with an undo rate < 2% and a trust score ≥ 80.

---

## Guardrails (User-Configurable)

### Global Guardrails
- **Daily spend limit**: Maximum total Orbit can move in 24 hours (default: $500; range: $0–$5,000)
- **Single-action limit**: Maximum per action (default: $200; range: $0–$2,000)
- **New biller protection**: Never pay a biller not previously paid without explicit approval (always on, non-configurable)
- **Night/weekend freeze**: Optionally pause all autonomous actions during quiet hours

### Per-Category Guardrails
| Category | Default Limit | User Can Adjust |
|---|---|---|
| Bill payment (known biller) | $500/action | Yes |
| Yield sweep (to yield) | $1,000/day | Yes |
| Yield sweep (from yield) | $500/day | Yes |
| Subscription flag | Any amount | N/A |
| Subscription cancel | Requires approval always | Yes (unlock in Tier 3) |
| Rate negotiation initiation | Any | N/A |

### Whitelist / Blacklist
- **Always autopay**: specific billers that should always be handled automatically
- **Never autopay**: specific billers the user wants to always approve manually (e.g. mortgage)

---

## Trust Score

The Trust Score (0–100) reflects how well Orbit's decisions align with what the user would have done themselves.

**Inputs:**
- Undo rate: undone actions reduce score (weighted by recency and amount)
- Approval rate: when the agent asks, how often does the user approve?
- Savings delivered: higher $ savings = higher trust
- User feedback: explicit thumbs-up on agent actions increases trust

**Formula (simplified):**
```
trust_score = 100
  - (undo_rate_30d × 40)        // penalize reversals heavily
  - (escalation_rate_30d × 10)  // penalize excessive uncertainty
  + (savings_delivered_percentile × 20)  // reward real savings
  + (explicit_approval_rate × 15)        // reward user validation
  + (feedback_positive_rate × 15)        // reward explicit thumbs-up
```

The trust score is shown to users in plain language ("Orbit has earned your trust on routine bills") not as a raw number.

---

## User Stories

- As a user, I can choose how much autonomy Orbit has over different action types.
- As a user, I can set a daily spending limit that Orbit will never exceed.
- As a user, I receive a notification every time Orbit takes an action on my behalf (in Tier 1 and 2).
- As a user, I can see a full history of every action Orbit has taken autonomously, with plain-English explanations.
- As a user, I can undo any recent Orbit action from my action history.
- As a user, I can instantly disable all autonomous actions with a single tap.
- As a user, I see Orbit's trust score and understand why it's at that level.
- As a user, certain actions (new biller, large amount) always require my explicit approval regardless of tier.

---

## Configuration UX

**Onboarding flow** (first-time setup):
1. "What would you like Orbit to handle?" — 3 presets:
   - "Just show me insights" (Tier 0)
   - "Handle routine bills" (Tier 1 with $200 limit on known billers)
   - "Full autopilot" (Tier 2 with default limits)
2. Set daily limit (slider, not text input)
3. "These are always off limits" — toggle list of high-stakes categories
4. Confirm with "Start Autopilot"

**Settings page (post-onboarding):**
- Autopilot toggle (on/off)
- Tier selector with plain-English descriptions
- Per-category guardrail sliders
- Whitelist/blacklist management
- Trust score card with breakdown

No jargon. No policy editor UI. No boolean configuration grids.

---

## Action Lifecycle

All autonomous actions follow this state machine (see PRD-004 for full spec):

```
proposed → auto_approved → executing → completed
         → pending_approval (exceeds limits or new biller)
                          → user_approved → executing
                          → user_rejected → cancelled
completed → undo_requested → reversing → reversed
                                       → reversal_failed (user notified)
```

---

## Escalation Logic

The agent escalates to the user (pauses and asks) when:
- Action exceeds any configured guardrail
- Biller is new (never paid before)
- Action type is disabled in user's tier
- Agent confidence < 85% (e.g. ambiguous bill amount)
- Multiple high-value actions would occur on the same day

When escalating, the agent must explain why and offer a "never ask again for this" option.

---

## Open Questions — Resolved

**Q: What happens if the user's bank rejects a payment Orbit initiated?**
A: Orbit retries once after 2 hours. On second failure, it notifies the user immediately and offers manual payment. The failed action is logged. Orbit never silently drops a payment.

**Q: Does enabling autopilot conflict with the user's existing bank autopay?**
A: Users explicitly choose: "Use Orbit for payment timing" vs. "Keep my bank autopay." If bank autopay is detected on a biller, Orbit defaults to tracking-only mode for that biller and won't double-pay. User must explicitly opt in to let Orbit override.

**Q: Should increasing autonomy tier require re-authentication?**
A: Yes. Increasing from any tier to a higher tier requires step-up authentication (Face ID, fingerprint, or 2FA code). Decreasing or disabling autopilot does not.

**Q: What if the agent makes a costly mistake?**
A: The undo window covers most reversals. For actions where undo is impossible (subscription already cancelled, payment already settled), Orbit escalates to human support and commits to making the user whole for errors caused by the platform.

---

## Success Metrics

| Metric | Target |
|---|---|
| % of users enabling Tier 1+ within 30 days | >40% |
| Autonomous actions per active user / week | >3 |
| Undo rate on auto-approved actions | <5% |
| User trust score (30-day moving avg) | Positive trend for >70% of users |
| Escalation rate | <15% of eligible actions |
| Time to disable autopilot (panic stop) | <3 taps / <10 seconds |
| User-reported comfort with autopilot | >4.0/5.0 in survey |
