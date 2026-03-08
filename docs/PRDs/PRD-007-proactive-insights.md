# PRD-007 — Proactive Agent Insights

**Priority**: P0
**Status**: In Review
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

A financial agent that only answers questions isn't a copilot — it's a calculator. The most valuable thing Orbit can do is notice things the user didn't know to ask about: a price increase, a pattern, an idle opportunity. Proactive insights transform Orbit from a reactive tool into an active financial partner that watches out for the user 24/7. This is the "wow" feature that earns long-term trust and drives word-of-mouth.

---

## Problem Statement

The current agent only activates when the user opens the app and types a question. This means the agent's intelligence is only applied when the user thinks to use it — precisely when they're already thinking about their finances. The bigger opportunity is applying that intelligence when the user isn't thinking about it, catching things they would have missed, and surfacing them at the right moment. That's what turns a budgeting app into a financial safety net.

---

## Insight Architecture

### Three-Layer Design

```
Layer 1: Detection (rule-based, deterministic)
  → Fast, cheap, runs on every transaction sync and daily/weekly crons
  → Pure functions: detectPriceIncrease(), detectUnusedSubscription(), etc.
  → Outputs: candidate insights with raw data

Layer 2: Scoring & Deduplication (rule-based)
  → Ranks candidates by relevance score
  → Deduplicates (don't surface the same insight twice within 30 days)
  → Filters by user preferences and feedback history
  → Outputs: prioritized delivery queue

Layer 3: Narrative (Claude-powered)
  → Takes a structured insight + user context → generates natural language
  → Personalizes framing: same insight, different tone for different users
  → Runs only for insights that pass scoring (minimizes API cost)
  → Outputs: final notification text + in-app explanation
```

This hybrid approach keeps costs predictable (rule-based detection is free; Claude API runs only for high-scoring, delivery-ready insights) while maintaining high-quality, personalized communication.

---

## Insight Catalog

### Category 1: Savings Opportunities

**Price Increase Detected**
- Trigger: Same biller, same billing cycle length, higher amount than last 3 months
- Confidence: High (math)
- Message pattern: "Your [Biller] bill went up $X/month. That's $Y/year more. [Negotiate] [Find alternatives] [Dismiss]"
- Dollar impact: Quantified as annual cost increase

**Duplicate / Double-Charge**
- Trigger: Two transactions to same merchant within 72 hours, similar amount (within 5%)
- Confidence: Medium (verify against billing cycle)
- Message: "You may have been charged twice by [Merchant] this week — $X on [date1] and $X on [date2]. Is this expected? [Flag for dispute] [It's fine]"
- Dollar impact: Amount of potential erroneous charge

**Cheaper Alternative Exists**
- Trigger: Subscription detected with known cheaper equivalent (curated database)
- Confidence: Medium (depends on feature parity)
- Message: "You pay $X/month for [Service]. We found a similar option for $Y/month — saving you $Z/year."
- Dollar impact: Annual savings if switched

**Unused Subscription**
- Trigger: Subscription is active (recurring charge) but no transactions at associated merchant for N weeks (category-dependent: streaming = 4 weeks; gym = 6 weeks; software = 8 weeks)
- Confidence: Medium-High
- Message: "You haven't used [Service] ($X/month) in N weeks. That's $Y you've paid without using it. [Cancel] [Keep]"
- Dollar impact: Monthly cost × months unused

**Annual vs Monthly Savings**
- Trigger: Subscription detected on monthly cycle; annual plan available and cheaper
- Message: "Switching [Service] to annual billing would save you $X/year."

**Bundle Opportunity**
- Trigger: User has 3+ streaming services from the same parent company with a known bundle
- Message: "You pay separately for [A], [B], and [C]. The [Bundle Name] covers all three for $X/month less."

---

### Category 2: Risk Alerts

**Upcoming Bill, Insufficient Funds**
- Trigger: Scheduled bill within 5 days; projected balance at payment time < bill amount + float minimum
- Confidence: High
- Message: "Your [Bill] ($X) is due [date]. Your projected balance is only $Y. [Add funds] [Move from yield] [Adjust timing]"
- Urgency: Critical

**Overdraft Risk**
- Trigger: Sum of bills due within 7 days > current balance minus float floor
- Message: "3 bills totaling $X are due this week. Estimated balance after: -$Y. [Review bills] [Move funds]"
- Urgency: Critical

**Credit Card: Approaching Minimum Only**
- Trigger: Current balance on credit card + expected charges through due date would leave user with less than full statement balance
- Message: "Heads up: at your current pace, you may only cover the minimum on your [Card] ($X). Carrying a balance costs ~$Y/month in interest."
- Dollar impact: Monthly interest estimate

**Late Payment Risk**
- Trigger: Bill is past due date and no payment detected
- Message: "Your [Bill] ($X) was due [date]. Late fees may apply. [Pay now]"
- Urgency: Critical

---

### Category 3: Pattern Insights

**Spending Spike by Category**
- Trigger: Category spending in current month > 1.4× trailing 3-month average (must be ≥ $20 delta)
- Confidence: High (math)
- Message: "You've spent $X on [Category] this month — 40% more than your average ($Y). [View transactions] [Set a limit]"
- Framing: Non-judgmental. Never say "you're overspending."

**Positive Trend**
- Trigger: Category spending down >20% month-over-month for 2+ consecutive months
- Message: "Your [Category] spending is down $X this month vs last. Great momentum!"
- Framing: Celebrate wins, even small ones.

**Subscription Creep**
- Trigger: Total subscription spend increased >15% compared to 6 months ago
- Message: "Your monthly subscriptions have grown from $X to $Y over the past 6 months. [Review all subscriptions]"

**Merchant Loyalty Opportunity**
- Trigger: User visits same merchant 4+ times/month with no loyalty program detected
- Message: "You've spent $X at [Merchant] this month. They have a rewards program — you may be leaving points on the table."

---

### Category 4: Yield Opportunities

**Idle Cash Alert**
- Trigger: Average daily checking balance > (float_floor × 1.5) for 14+ consecutive days
- Message: "You've had ~$X sitting in checking for N days earning 0%. At current rates, that's $Y in missed yield."
- Action: "Sweep to yield" (auto or manual)

**Yield Rate Improvement**
- Trigger: External yield rate improved > 0.5% since user's last configured sweep threshold
- Message: "Yield rates are up — you could earn more. [Update settings]"

**Post-Expense Sweep Opportunity**
- Trigger: Large expense processed; remaining balance now > float threshold by significant margin
- Message: "After your recent expenses, you still have $X above your float minimum. Want to sweep the excess to yield?"

---

## Relevance Scoring

Every candidate insight receives a score (0–100) before delivery:

```
relevance_score =
  (dollar_impact_percentile × 40)    // normalized against user's income/spend
  + (urgency_score × 30)              // 0=informational, 100=critical
  + (personalization_score × 20)      // how specific to this user vs generic
  + (user_interest_score × 10)        // based on past engagement with this insight type

// Hard filters (discard if any fail):
// - dollar_impact < $1 AND urgency < 50 → discard
// - same insight type generated for same entity within 30 days → discard
// - user has dismissed this insight type 3+ times → discard for 60 days
// - confidence < 70% → discard (don't surface uncertain insights)
```

---

## Delivery Pipeline

```
Transaction sync / cron
        ↓
Detection functions run (all types)
        ↓
Scoring & deduplication
        ↓
Insights with score ≥ 60 → queued for delivery
        ↓
Claude generates narrative (structured prompt → natural text)
        ↓
Delivery via notification channel (see PRD-006 for rules)
        ↓
User action tracked → updates model (thumbs up/down, acted, dismissed)
```

**Cron schedule:**
- Realtime: on every transaction sync (for urgency ≥ 80)
- Daily (7am local): spending spikes, subscription detection, idle cash
- Weekly (Sunday): pattern insights, subscription creep, annual savings opportunities

---

## Feedback Loop

User feedback trains per-user relevance weights:

| Action | Signal | Effect |
|---|---|---|
| Taps CTA (acts on insight) | Strong positive | +15% weight for this insight type |
| Thumbs up | Positive | +10% weight for this insight type |
| Thumbs down | Negative | -20% weight; suppress type for 14 days |
| Dismisses without reading | Weak negative | -5% weight for this insight type |
| Opens and reads | Neutral positive | +3% weight |

After 3 thumbs-down on the same insight type: disable that type for the user and offer "What would make this more useful?" prompt.

---

## Cold Start (New Users, No Data)

For users with < 30 days of transaction history, use baseline benchmarks:
- National averages by age bracket and income band for common categories
- "People with similar spending profiles typically pay X for streaming — you pay 2X" style insights
- These are clearly labeled as benchmark-based, not personal-history-based
- Transition automatically to personal-history insights after 30 days

---

## Insight Data Model

```sql
CREATE TABLE insights (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'price_increase', 'unused_sub', 'spending_spike', etc.
  category TEXT NOT NULL,       -- 'savings', 'risk', 'pattern', 'yield', 'opportunity'
  status TEXT DEFAULT 'new',    -- new | delivered | viewed | acted | dismissed | expired
  title TEXT NOT NULL,
  body TEXT NOT NULL,           -- Claude-generated narrative
  dollar_impact_cents INTEGER,  -- null if not quantifiable
  relevance_score INTEGER,
  urgency INTEGER,              -- 0-100
  entity_type TEXT,             -- 'subscription', 'bill', 'merchant', 'account'
  entity_id TEXT,               -- reference to the relevant entity
  metadata TEXT,                -- JSON: raw detection data for audit
  action_taken TEXT,            -- what the user did (if anything)
  delivered_at INTEGER,
  viewed_at INTEGER,
  acted_at INTEGER,
  dismissed_at INTEGER,
  expires_at INTEGER,           -- auto-expire after 30 days
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Claude Prompt Design

The narrative generation prompt is structured and tightly scoped:

```
System: You are Orbit's financial intelligence layer. Generate a short, clear,
non-judgmental notification message for the following financial insight.
Rules:
- Max 2 sentences
- Never use dollar signs in the title (use them in the body)
- Never say "you're overspending" or similar judgmental language
- Always include a concrete dollar amount where available
- Tone: friendly, knowledgeable, like a trusted friend who happens to be a CFO

Insight type: {type}
Data: {structured_data}
User context: {relevant_history}

Output JSON: { "title": "...", "body": "...", "cta_primary": "...", "cta_secondary": "..." }
```

Output is always structured JSON to prevent narrative drift and enable consistent UI rendering.

---

## Open Questions — Resolved

**Q: Should insights be generated by Claude or rule-based?**
A: Hybrid. Detection is rule-based (deterministic, cheap, fast, auditable). Narrative generation is Claude-powered (natural language, personalized). Delivery logic is rule-based (scheduling, deduplication, rate limiting). This architecture minimizes Claude API costs to ~$0.001/insight while keeping communication quality high.

**Q: How do we avoid insight fatigue (too many notifications)?**
A: Hard cap of 5 unread insights in the feed (new ones queue until old ones are cleared). Max 1 insight push notification per day. Anti-fatigue rules in PRD-006 further protect the channel. The scoring system naturally filters low-relevance insights.

**Q: What if an insight is factually wrong (false positive)?**
A: User can dismiss with "Not helpful" → reason dropdown. After 3 false positives of same type, that insight type is suppressed for 60 days. All detection functions are logged with their inputs for debugging. False positive rate is a primary quality metric.

**Q: How do we handle insights for new users with no transaction history?**
A: Benchmark-based insights using national averages for the first 30 days. Clearly labeled as "based on typical spending patterns, not your history yet." This ensures new users get value immediately while setting accurate expectations.

**Q: Is the Claude API cost sustainable as we scale?**
A: At MVP scale (1K users, 3-5 insights/week/user): ~5,000 narrative generations/week. At ~$0.001/insight = $5/week = $260/year. Well within budget. At 100K users, revisit — but by then revenue should support it. Detection (free) gates Claude calls, so costs scale only with high-quality insights, not all events.

---

## Success Metrics

| Metric | Target |
|---|---|
| Insights generated per active user / week | 3–5 |
| Insight action rate (user acts on it) | >20% |
| Avg dollar impact per actionable insight | >$5 |
| False positive rate (dismissed as irrelevant) | <15% |
| Thumbs-up rate | >50% of rated insights |
| Time from trigger event to delivery | <5 minutes (urgent), <24 hours (normal) |
| User satisfaction with insight quality | >4.0/5.0 in survey |
| Total $ saved by users via insight-triggered actions | Track monthly |
