# PRD-008 — Bill Negotiation Agent

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

The average US household overpays $300–600/year on recurring services — internet, wireless, insurance, streaming bundles — because negotiation is awkward and time-consuming. Orbit eliminates the awkwardness entirely. The user taps "negotiate," grants permission, and the agent handles everything: researching competitor rates, initiating contact, evaluating retention offers, and reporting back with the result. The agent earns its keep through documented, auditable savings.

---

## Problem Statement

Americans overpay billions annually on recurring bills because:
1. Negotiation requires time, confidence, and knowledge of competitor rates
2. Customer retention lines are designed to wear you down
3. People forget promotional rates expire and the real rate kicks in
4. Companies count on inertia — most people never call

Existing services (Billshark, Trim, BillCutterz) are human-powered concierge services that use your credentials to call or chat on your behalf. They charge 30-50% of first-year savings, work on a limited set of providers, and have slow turnaround. An AI agent changes all three constraints: it's faster, cheaper to operate, and scales to any provider with a chat/phone interface.

---

## Approach

### Tier 1: AI-Scripted Phone/Chat Negotiation (MVP)
The agent prepares a negotiation brief and the user makes the call with a real-time script and live coaching from Orbit. The agent:
1. Identifies the provider, current rate, and contract status from transactions
2. Researches current promotional rates and competitor offers
3. Generates a provider-specific negotiation script with talking points
4. Provides live coaching during the call (if user shares the conversation)
5. Logs the outcome and schedules re-negotiation reminders

**No agent access required** — user makes the call, agent coaches. This is immediately implementable with zero legal complexity.

### Tier 2: Computer Use Automated Negotiation (see PRD-047)
Using Claude's computer use capability, the agent operates live chat interfaces on the user's behalf after explicit authorization:
1. User grants permission with a "letter of authorization" style approval flow
2. Agent opens provider's chat in a headless browser session
3. Executes the negotiation autonomously
4. Reports outcome to user for approval before accepting any offer

**Legal note**: Computer use automation acting as an authorized agent is explicitly permitted in Plaid's policies and consistent with the CFPB's definition of authorized third-party access. User must grant explicit, revocable authorization per session.

### Tier 3: Provider Partnerships
Direct API agreements with large providers to initiate retention offers programmatically. Higher cost but highest success rate and best user experience. Longer term.

---

## Provider Coverage

### High-Value Initial Targets (Tier 1 — scripted coaching available immediately)

| Category | Avg Monthly Cost | Typical Savings | Notes |
|---|---|---|---|
| Internet / Cable | $80–120 | $15–30/mo | Highest success rate via phone |
| Wireless (AT&T, Verizon, T-Mobile) | $60–100 | $10–25/mo | Competitor threat is strong leverage |
| Home/Auto Insurance | $100–300 | $20–60/mo | Annual review trigger |
| Streaming bundles | $50–100 | $5–20/mo | Pause vs. cancel leverage |
| Gym memberships | $40–80 | Full cancel or 50% | "Freeze" option often available |

### Detection from Plaid Transactions
- Recurring charge pattern recognition (same merchant, consistent amount, monthly cadence)
- Provider name normalization (e.g., "AT&T*Mobile" → "AT&T Wireless")
- Rate increase detection (price jumped → immediate negotiation trigger)
- Promotional rate expiry prediction (many intros last exactly 12-24 months)

---

## User Flow

```
1. Orbit flags: "Your internet bill went up $15 last month. Typical competitor rate
   for your area is $10/mo less than you're paying."

2. User taps "Negotiate" → sees:
   - Current rate vs. competitor rates
   - Estimated savings range: $10–20/month ($120–240/year)
   - Success probability: 65% based on provider and account age
   - Negotiation approach: phone call (agent coaches) OR live chat (agent automates)

3. User selects approach and grants permission

4. [Phone coaching]: Agent provides real-time script and prompts
   [Chat automation]: Agent operates chat window, user approves any offer before acceptance

5. Outcome logged:
   - Success: new rate, savings amount, expiry date
   - Failure: reason, retry recommendation, escalation path (e.g., "call retention dept")
   - Partial: retention offer details, agent evaluates against goal

6. Success-fee prompt: "Orbit saved you $18/month ($216/year). Our fee is $36 (first
   month's savings). Apply it now or bank it?"
```

---

## Negotiation Intelligence

### Provider-Specific Playbooks
Each provider has a negotiation playbook maintained by the agent:
- Best times to call (avoid peak hours; call Tuesday-Thursday 10am-2pm)
- Keywords that trigger escalation to retention department
- Known promotions currently available
- Common objection responses
- Contract and ETF implications

### Competitive Rate Research
Before any negotiation, the agent fetches:
- Current promotional rates (from provider websites via computer use)
- Local ISP competition (to use as leverage)
- Competitor win-back offers (cable companies run these constantly)

### Offer Evaluation Engine
When a retention offer is made, the agent evaluates:
- Total savings over contract period vs. ETF risk
- Rate after promotion expires
- Bundling impact (getting cable with internet may not be worth it)
- Recommendation: Accept / Counter / Decline

---

## Success-Based Pricing Model

Orbit takes **one month's savings** as its fee for each successful negotiation.

Examples:
- Saved $20/month → Orbit fee: $20 (user keeps $220/year net)
- Saved $30/month → Orbit fee: $30 (user keeps $330/year net)

No savings → no fee. This aligns incentives perfectly and is easy to understand.

**Billing**: Deducted from the first month's savings transferred to yield position, or charged separately if user prefers.

---

## Data Model

```sql
CREATE TABLE negotiations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bill_id TEXT REFERENCES bills(id),
  provider_name TEXT NOT NULL,
  current_amount_cents INTEGER NOT NULL,
  target_amount_cents INTEGER,
  approach TEXT NOT NULL CHECK (approach IN ('coaching', 'automated', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'succeeded', 'failed', 'cancelled', 'expired')),
  savings_cents INTEGER,           -- monthly savings if succeeded
  orbit_fee_cents INTEGER,         -- one month's savings
  promotion_expires_at INTEGER,    -- when to re-negotiate
  notes TEXT,                      -- outcome details, offer details, failure reason
  initiated_at INTEGER NOT NULL,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL
);
```

---

## Re-Negotiation Lifecycle

- **Success**: Schedule re-negotiation reminder for 30 days before promotion expires
- **Failure**: Retry in 90 days (company may have new promotions)
- **Rate increase detected**: Immediate negotiation trigger (don't wait for scheduled review)
- **Competitor switch**: If negotiation fails twice, surface PRD-034 subscription alternative

---

## Success Metrics

| Metric | Target |
|---|---|
| Avg savings per successful negotiation | >$15/month |
| Negotiation success rate (coached) | >55% |
| Negotiation success rate (automated) | >45% |
| Users opting into negotiation | >30% of eligible users |
| Time from initiation to resolution | <5 business days (coached), <24h (automated) |
| Re-negotiation rate (user uses it again within 12 months) | >60% |
| Net promoter score for negotiation feature | >60 |

---

## Dependencies

- PRD-005 (Real Account Linking) — required for provider/rate detection from transactions
- PRD-025 (Price Memory) — required for increase detection and historical rate tracking
- PRD-047 (Computer Use Agent) — required for Tier 2 automated chat negotiation
- PRD-016 (Anomaly Detection) — shares price-increase detection logic
