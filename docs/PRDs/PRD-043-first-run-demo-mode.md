# PRD-043 — First-Run Experience & Demo Mode

**Priority**: P0
**Status**: In Review
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

The first 3 minutes are the product. If a user doesn't feel value within that window, they churn — and they tell no one about Orbit. For a POC/investor demo, a bad first-run experience means no second chance. This PRD specifies two parallel experiences: (1) the first-run flow for real new users, designed to get them to their first genuine "wow" moment as fast as possible; and (2) a Demo Mode that shows Orbit's full potential without requiring a real bank link — essential for demos, press, and users who aren't ready to connect their accounts.

---

## Problem Statement

Currently, a new user who signs up sees a dashboard populated with thin mock data and has no guidance on what to do next. There is no onboarding, no guided first conversation, no demo mode for users not ready to link their real bank. For a POC demo to investors or early adopters, asking "please link your real bank account first" is a hard stop. Demo Mode solves this by providing a rich, realistic, pre-built financial scenario that makes Orbit's full capabilities immediately apparent.

---

## Two Parallel Paths

```
Signup
  ├── "Connect my real accounts" → Real Onboarding Flow (Section A)
  └── "Show me how it works first" → Demo Mode (Section B)
```

Both paths converge on the same dashboard and agent experience. Demo Mode shows the same UI with pre-populated rich data. Transitioning from Demo → Real is one tap: "Ready to connect your real accounts?"

---

## Section A: Real Onboarding Flow

### Step 1: Welcome & Value Frame (30 seconds)
Not a carousel of marketing slides. One screen. One idea:

```
┌────────────────────────────────────────┐
│                                        │
│     Your money,                        │
│     on autopilot.                      │
│                                        │
│  Orbit pays your bills at the right    │
│  time, kills unused subscriptions,     │
│  and makes your idle cash earn more.   │
│                                        │
│  Takes 2 minutes to set up.            │
│                                        │
│           [Let's go →]                 │
│      [Show me first (Demo)]            │
└────────────────────────────────────────┘
```

One primary CTA, one secondary escape to Demo Mode. No feature list. No screenshots. No "next" buttons through 4 slides.

### Step 2: Connect Your First Account (60–90 seconds)
- Direct to Plaid Link with institution search pre-focused
- Framing: "Connect your main checking account. Read-only access — we can never move money without your permission."
- Security reassurance: brief (1 sentence each): encrypted, read-only read, bank-level security
- Skip option: "I'll do this later" → goes to Demo Mode with a banner "Connect your accounts when you're ready"

On successful link:
```
┌────────────────────────────────────────┐
│  ✓  Chase connected                    │
│  Importing 90 days of transactions...  │
│  This takes about 30 seconds           │
│  [spinner / progress]                  │
└────────────────────────────────────────┘
```

Don't make users wait with a blank screen. Show: "While we import, here's what Orbit will do for you" with 2–3 micro-facts that set expectations.

### Step 3: First Insight Reveal (the "wow" moment)
After sync completes (30–60 seconds), rather than dropping the user on the dashboard, show a single, focused "first insight" screen:

```
┌────────────────────────────────────────┐
│  🔍  We found something                │
│                                        │
│  You're paying $47/month for           │
│  Hulu that you haven't used            │
│  in 6 weeks.                           │
│                                        │
│  That's $564 this year.                │
│                                        │
│         [Cancel Hulu — save $47/mo]    │
│         [Keep it, I use it]            │
│         [See everything Orbit found →] │
└────────────────────────────────────────┘
```

The first insight must be:
- Specific (a real dollar amount, a real service)
- Immediately actionable
- Non-threatening (not "you overspend on restaurants")

Insight selection priority for first-run: unused subscription > price increase > idle cash > spending spike. The "cancel" CTA on this screen requires the PRD-004 approval flow inline.

If no high-value insight is found (insufficient data), fall back to: "Here's what Orbit found in your first look" → show agent chat pre-seeded with a question about their spending.

### Step 4: Set Up Autopilot (30 seconds, optional)
After the first insight, offer a lightweight autopilot setup:

```
┌────────────────────────────────────────┐
│  Want Orbit to handle this             │
│  automatically next time?              │
│                                        │
│  ○  Just show me — I'll decide         │
│  ○  Handle routine bills               │
│  ● Full autopilot (recommended)        │
│                                        │
│  Daily limit: $──────●────── $500      │
│                                        │
│           [Start Autopilot]            │
│           [Skip for now]               │
└────────────────────────────────────────┘
```

Single slider, 3 radio options, one tap to enable. Not a full configuration UI — that's in Settings (PRD-044).

### Step 5: Enable Notifications (30 seconds, contextual)
The natural ask after showing value:

```
┌────────────────────────────────────────┐
│  Stay in the loop                      │
│                                        │
│  We'll notify you when Orbit           │
│  takes an action or finds something    │
│  worth your attention.                 │
│                                        │
│  Quiet hours respected. Max 3/day.     │
│                                        │
│     [Yes, keep me posted]              │
│     [No thanks]                        │
└────────────────────────────────────────┘
```

Request push permission only after demonstrating value (the first insight). Never on cold open.

### Completion: Dashboard
Drop the user on the dashboard with:
- Onboarding progress ribbon hidden (don't show a checklist — it's patronizing post-completion)
- Insights feed populated from the sync
- A single "what to explore next" hint in the agent chat: pre-seeded with "I found 3 things to review — want me to walk you through them?"

---

## Section B: Demo Mode

### Purpose
Demo Mode shows Orbit's full capabilities using a pre-built, richly detailed fictional financial scenario. It is:
- Immediately available without any account linking
- Functionally identical to the real product (same UI, same agent, same actions)
- Populated with a realistic, relatable fictional persona
- Designed to be demonstrable by a founder in a 5-minute pitch

### The Demo Persona: "Alex"
Pre-built financial scenario with enough texture to make the AI agent look brilliant:

**Accounts:**
- Checking: $3,247.18 (Chase)
- Savings: $850.00 (barely touched)
- Credit card: $1,420 balance, due in 9 days (Capital One)

**Subscriptions (7 total):**
- Netflix $22.99/mo — used 3x last month
- Hulu $17.99/mo — **last used 6 weeks ago** ← key insight
- Spotify $11.99/mo — daily use
- Gym+ $64.99/mo — **last check-in: 8 weeks ago** ← key insight
- Dropbox $11.99/mo (monthly) — annual plan available for $9.99/mo
- Adobe Creative Cloud $59.99/mo — heavy use
- LinkedIn Premium $39.99/mo — **last login: 3 months ago** ← key insight

**Bills (5 upcoming):**
- Rent: $1,450 due in 6 days
- Electric: $134.22 due in 11 days (grace period: 5 days confirmed)
- Internet: $79.99 due in 14 days
- Car insurance: $187.00 due in 22 days (28-day grace)
- Credit card minimum: $28 due in 9 days (full balance: $1,420)

**Recent transactions (30 days):**
60 transactions across: dining, groceries, gas, shopping, entertainment — designed to surface:
- 38% above-average dining spend (12 restaurant transactions)
- 3 Starbucks visits/week ($127 total)
- Double-charge: Spotify charged twice in February

**Insights pre-loaded (the hits):**
1. "Gym+ $65/mo — no check-ins in 8 weeks. Paying $520 since your last visit."
2. "Hulu $18/mo — 6 weeks unused. Annual cost: $216."
3. "LinkedIn Premium $40/mo — last login 3 months ago. $480/year for no engagement."
4. "Spotify double-charged you in February. $11.99 may be recoverable."
5. "Switching Dropbox to annual saves $24/year."
6. "You have $850 in savings earning 0.01% APY. Move to yield and earn ~$43/year more."
7. "Dining spend is $340 this month vs $243 average. $97 above pace."
8. "Electric bill due in 11 days — Orbit will pay at day 5 of grace, saving $0.33 in yield. Tiny, but automatic."

**Yield position:**
- $0 currently in yield (this is a "before" state — the demo shows the opportunity)
- Opportunity: $850 savings earning 0.01% → could earn 5.12% APY = +$43/year

**Agent pre-loaded conversation starters (suggested prompts):**
- "What's the best thing I can do for my finances today?"
- "Am I wasting money on subscriptions?"
- "When should I pay my credit card?"
- "What would full autopilot look like for me?"
- "How much could I earn if I optimized my cash?"

The agent has full access to Alex's demo data via the existing tool set and responds as if this is real.

### Demo Mode Indicators
- Subtle banner: "Demo Mode — Alex's finances · [Connect my real accounts]"
- All actions that would normally execute (pay bill, cancel subscription) show a confirmation: "In Demo Mode, this action is simulated. [Connect real accounts to do this for real]"
- Demo data does NOT persist between sessions (fresh each time)
- Demo actions are fully simulated through the approval flow — show the UX without executing anything

### Transition from Demo → Real
At any point, user can tap "Connect my real accounts" → goes to Step 2 of Section A (Plaid Link). After linking, the demo data is replaced with real data and a fresh insight generation run fires.

---

## Demo Mode Data Implementation

Demo data is a static JSON fixture served from the API (no D1 writes). A demo session is identified by a special JWT claim (`"demo": true`). The API returns fixture data for all endpoints when demo flag is present. No real database reads or writes occur in demo mode.

```typescript
// Middleware check in API
if (payload.demo) {
  return demoDataHandlers[route](c);
}
```

The demo fixture is defined in `apps/api/src/demo/fixture.ts` and can be updated without a schema migration.

---

## Open Questions — Resolved

**Q: Should demo mode be available post-login or only pre-login?**
A: Both. The "Show me first" option during onboarding is pre-login. But users who signed up and didn't link an account should also be able to enter demo mode from the empty dashboard state. This prevents churn from users who got cold feet at the bank linking step.

**Q: Is the demo persona too specific (too high income, too many subscriptions)?**
A: "Alex" has a fairly normal middle-class profile — $3K in checking, 7 subscriptions, 5 bills, some credit card debt. The point of richness in the data is to make the AI look smart, not to target a specific demographic. The insights work better with more data.

**Q: What if the user asks the demo agent something we didn't anticipate?**
A: Demo mode uses the same Claude-powered agent as real mode, just with demo data as context. The agent can answer any question about Alex's finances naturally. The fixture data provides enough context for the agent to be genuinely impressive.

**Q: Should we A/B test onboarding variants?**
A: Yes — PRD-030 (Onboarding Optimization) covers ongoing A/B testing. This PRD establishes the v1 baseline. Specific variant tests belong in PRD-030.

---

## Success Metrics

| Metric | Target |
|---|---|
| Time from signup to first "wow" moment (real path) | <3 minutes |
| Demo Mode → real account link conversion | >25% |
| Onboarding completion rate (all 5 steps) | >70% |
| Users who see first insight during onboarding | >80% of completions |
| Autopilot enablement during onboarding | >40% |
| Notification opt-in during onboarding | >60% |
| D1 retention for users who complete onboarding | >50% |
| D1 retention for users who skip onboarding | <20% (expected; used to motivate investment in flow) |
