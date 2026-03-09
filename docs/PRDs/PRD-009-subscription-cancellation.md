# PRD-009 — Subscription Cancellation Agent

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Cancellation should take one tap. The user says "cancel Netflix" and Orbit handles everything — navigating the cancellation flow, responding to retention offers according to user preferences, and confirming the cancellation is complete. No more Dark Pattern obstacle courses. No more forgetting to cancel free trials. No more 45-minute phone holds.

---

## Problem Statement

The subscription cancellation problem has three layers:

1. **Dark patterns**: Companies design cancellation to be as difficult as possible — buried menu items, "pause" defaults, mandatory phone calls, multiple confirmation screens, misleading CTAs ("Keep your benefits")
2. **Human inertia**: Even when cancellation is straightforward, people put it off. ~35% of people pay for subscriptions they no longer use.
3. **Trial-to-paid conversion exploitation**: Free trials convert automatically. Users forget. This alone costs US consumers an estimated $48B/year.

Current partial solutions:
- **Privacy.com / DoNotPay**: Attempt automated cancellation but limited coverage and reliability
- **Rocket Money / Trim**: Human-assisted cancellation; slow, expensive, limited providers
- **Credit card blocking**: Nuclear option — breaks the relationship and may cause service termination mid-cycle

An AI agent with computer use capability can execute the actual cancellation flow in a sandboxed browser session with human-level reliability at machine-level scale and speed.

---

## Cancellation Methods (by Provider Type)

### Tier 1: Online-Cancellable (automated via Computer Use)
Most streaming, SaaS, and digital subscriptions allow online cancellation:
- Netflix, Hulu, Disney+, Max, Peacock, Paramount+
- Spotify, Apple Music, YouTube Premium
- Adobe Creative Cloud, Microsoft 365
- Gym apps (Peloton digital, ClassPass)

**Method**: Agent navigates to account settings → cancellation flow → responds to retention offers per user prefs → captures confirmation number.

### Tier 2: Chat-Cancellable (automated via Computer Use)
Some providers require live chat but don't require phone:
- Many gym memberships
- Some insurance products
- Various SaaS tools

**Method**: Agent opens chat, identifies as authorized representative of account holder, executes cancellation, captures confirmation.

### Tier 3: Phone-Required (assisted with script + coaching)
A minority of providers require a phone call:
- Many gym chains
- Some cable/satellite providers
- Some insurance products

**Method**: Agent provides a step-by-step phone script, predicted retention offers with recommended responses, and post-call confirmation instructions.

### Tier 4: Mail/Certified-Letter (generated document)
Some contracts require written notice:
- Gym contracts with annual commitments
- Some service contracts

**Method**: Agent generates a certified cancellation letter with correct legal language, provides instructions for mailing with proof of delivery.

---

## User Flow

```
1. Orbit detects subscription with <1 use/month (from PRD-012 ROI analysis)
   OR user taps "Cancel" on a subscription

2. Pre-cancellation screen:
   - Service name, monthly cost, total paid this year
   - "Last used: 47 days ago"
   - Cancellation method: [Online — automated] / [Phone — guided]
   - What happens to your data after cancellation
   - Refund eligibility: "You're 3 days into your billing cycle. No refund expected."

3. Retention offer preferences (one-time setup, remembered):
   - "If offered a discount, accept if ≥50% off for ≥3 months"
   - "If offered a pause, decline (I want to fully cancel)"
   - "Accept free months offer if ≥2 months free"

4. User confirms: "Yes, cancel [Service]"

5. Agent executes (automated):
   - Opens browser session, navigates to account settings
   - Follows cancellation flow
   - Evaluates any retention offers against user preferences
   - Accepts/declines automatically per prefs
   - Captures confirmation screenshot and number

6. Confirmation to user:
   - "Cancelled ✓ — [Service] confirmed cancelled. Last day of service: March 31."
   - Confirmation number + screenshot stored
   - Monthly savings: +$14.99
   - Cumulative savings from all cancellations: $47/month

7. Post-cancellation monitoring:
   - Watch for any charge from this provider in next 2 billing cycles
   - Alert immediately if charged after cancellation date
   - If charged: generate dispute evidence package
```

---

## Subscription Intelligence (builds on PRD-012)

Before surfacing cancellation, the agent computes:

- **Usage inference**: Transaction frequency (if a subscription charges monthly but there's no associated usage data, infer low usage). For app subscriptions, usage can be inferred from linked account activity patterns.
- **Cost-per-use score**: Monthly cost ÷ estimated uses/month. Subscriptions with $10+/use are flagged.
- **Pairing detection**: Detect duplicate/redundant services (e.g., both Spotify and Apple Music). Suggest cancelling the lower-used one.
- **Bundle entanglement**: Warn if cancelling one service affects another (e.g., cancelling Amazon Prime removes free shipping).
- **Auto-renewal alerts**: 7-day warning before annual subscriptions auto-renew.

---

## Provider Cancellation Database

Maintained as structured data (updated by the agent as it learns):

```json
{
  "netflix": {
    "method": "online",
    "url": "https://www.netflix.com/cancelplan",
    "steps": ["Account → Membership → Cancel Membership"],
    "retention_offers": ["1 month free", "downgrade plan"],
    "confirmation": "email + on-screen",
    "typical_duration_seconds": 45
  }
}
```

The agent updates this database after each successful cancellation, learning new flows as providers change their UX.

---

## Safeguards

- **Confirmation required**: User must explicitly confirm each cancellation. No accidental cancellations.
- **Undo window**: 30-minute undo window after cancellation (agent resubscribes if possible, or shows resubscribe link)
- **Shared account warning**: "This account may be shared with family members. Check before cancelling."
- **Contract penalty warning**: "This subscription has a $50 ETF if cancelled before [date]. Proceed?"
- **Active service warning**: "You used this service 3 times this month. Are you sure?"

---

## Surprise Charge Detection

After cancellation, the agent monitors for any charge from the cancelled provider:
- If charged within 30 days: immediate alert + dispute package
- Dispute package: cancellation screenshot, confirmation number, transaction amount, recommended dispute language for credit card company

---

## Data Model

```sql
CREATE TABLE subscription_cancellations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  provider_name TEXT NOT NULL,
  monthly_cost_cents INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('automated', 'phone_guided', 'mail', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'confirmed', 'failed', 'disputed', 'resubscribed')),
  confirmation_number TEXT,
  last_service_date INTEGER,
  retention_offer_received TEXT,
  retention_offer_accepted INTEGER DEFAULT 0,  -- 0/1 boolean
  dispute_opened INTEGER DEFAULT 0,
  initiated_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  created_at INTEGER NOT NULL
);
```

---

## Success Metrics

| Metric | Target |
|---|---|
| Cancellation success rate (automated) | >85% |
| Cancellation success rate (phone-guided) | >70% |
| Avg time to complete cancellation (automated) | <5 minutes |
| Avg time to complete cancellation (phone-guided) | <48 hours |
| Monthly savings per cancelled subscription | Avg >$12 |
| Surprise charges after confirmed cancellation | <1% of cancellations |
| Users who cancel at least one sub | >25% within 30 days of activation |
| Cumulative annual savings per active user | >$150 |

---

## Dependencies

- PRD-005 (Real Account Linking) — subscription detection from real transactions
- PRD-012 (Subscription ROI) — usage scoring to identify cancellation candidates
- PRD-047 (Computer Use Agent) — automated cancellation execution
- PRD-016 (Anomaly Detection) — post-cancellation charge monitoring
