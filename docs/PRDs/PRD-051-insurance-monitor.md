# PRD-051 — Insurance Rate Monitor

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Insurance is the most universally overpaid recurring expense. Auto insurance alone: the average American overpays by $400–800/year simply by staying with the same carrier instead of shopping annually. Orbit detects your insurance premiums, benchmarks them against market rates, and tells you exactly when and whether to shop around — then helps you do it.

---

## Problem Statement

Insurance has unique dynamics that cause persistent overpayment:

1. **Loyalty penalty**: Insurance companies charge existing customers MORE than new customers. Staying with your insurer for 5+ years typically means 20-40% above market rates.
2. **Annual renewal inertia**: Auto-renewal every year without shopping is the default for most people.
3. **Information asymmetry**: Consumers don't know what comparable coverage costs elsewhere.
4. **Complexity**: Insurance has dozens of variables — deductibles, coverage limits, riders, discounts — making comparison genuinely hard.
5. **No review trigger**: People only shop insurance after a bad experience (claim denied, huge rate increase). By then, they're in a reactive mindset.

The total addressable savings for US consumers in insurance overpayment is estimated at $100B+ annually.

---

## Insurance Categories

| Type | Avg Annual Premium | Shopping Frequency | Savings Potential |
|---|---|---|---|
| Auto insurance | $1,600–2,400 | Annually | $400–800/yr |
| Homeowners | $1,500–3,000 | Annually | $300–600/yr |
| Renters | $180–360 | Annually | $50–150/yr |
| Term life | $300–1,200 | Every 3-5 years | $100–400/yr |
| Health (employer) | N/A (employer-provided) | Open enrollment | Complex |
| Umbrella | $150–300 | Annually | $30–100/yr |

---

## Premium Detection

Identify insurance premiums from transaction data:
- Detect monthly/semi-annual/annual patterns
- Category signals: Plaid categorizes many insurance payments automatically
- Merchant names: "GEICO DIRECT", "STATE FARM", "ALLSTATE INS CO", etc.
- Amount patterns: Semi-annual payments ($600–1200) or monthly ($80–200 for auto)

```typescript
// Detection heuristics:
// - Plaid category includes 'INSURANCE'
// - Merchant name contains keywords: ['insurance', 'ins co', 'direct', 'mutual']
// - Recurring amount in typical insurance range
// - Semi-annual pattern (every ~182 days)
```

---

## Benchmarking Engine

### Benchmark Data
- Aggregate anonymous user data (with consent) to build regional benchmarks
- Integrate with public data sources: NAIC (National Association of Insurance Commissioners) publishes state-level average premium data
- Partner with comparison platforms (EverQuote, Policygenius, The Zebra) for real-time rate API access

### Benchmark Calculation
For a given user's profile (inferred from account data):
- Location (inferred from transaction merchants)
- Coverage level (inferred from premium amount)
- Policy type

```
benchmark_premium = regional_average × coverage_adjustment_factor
overpayment_estimate = user_premium - benchmark_premium
overpayment_percentage = overpayment_estimate / benchmark_premium
```

**Trigger**: Alert when user appears to be paying >15% above benchmark.

---

## Shopping Trigger Logic

Don't annoy users with constant insurance nudges. Trigger shopping recommendations at the right moment:

| Trigger | Example | Action |
|---|---|---|
| Annual renewal window | 60 days before estimated renewal | "Now is the time to shop — your policy likely auto-renews in 2 months" |
| Rate increase detected | Premium jumped >5% | "Your insurance went up $X. Here's what comparable policies cost." |
| Life event detected | New large purchase (car), address change from merchant location shift | "Looks like you may have gotten a new car / moved. Time to re-quote." |
| First detection | Insurance premium identified for first time | "We detected an insurance payment. Want us to benchmark it?" |
| 12 months since last shop | No action taken in a year | "Annual insurance check: you could save up to $X by shopping around." |

---

## User Flow

```
1. Orbit detects: "$189/month auto insurance — GEICO DIRECT"

2. Agent surfaces: "Your auto insurance is $2,268/year. Based on regional benchmarks,
   comparable policies typically cost $1,600–1,900. You may be paying $300–600 too much.
   Want to see your options?"

3. User taps "Show me options" →
   - High-level breakdown: what's typically included in comparable policies
   - Link to comparison tool (affiliate partner) with pre-filled data where possible
   - "Most people who switch save an average of $487/year"

4. Orbit monitors outcome:
   - If user switches: new lower premium detected → "Savings confirmed: $X/month ✓"
   - If user doesn't switch: snooze for 6 months, then re-surface

5. After switching: track premium going forward, alert to any increases
```

---

## Coverage Gap Analysis

Beyond price, check for common coverage gaps:

- **Auto**: Insufficient liability limits for net worth (umbrella recommendation)
- **Renters**: Many renters don't have insurance at all (detect by lack of renters insurance premium)
- **Life**: Identify users with dependents but no life insurance (complex, requires financial modeling)
- **Health**: HSA eligibility with HDHP — many miss this tax optimization

---

## Partnership Model

**Affiliate integration** with comparison platforms:
- The Zebra (auto/home comparison marketplace)
- Policygenius (life/health comparison)
- EverQuote (multi-line marketplace)

Revenue model: $15–50 per completed quote lead, $100–200 per converted policy.

**Transparency**: Always disclose affiliate relationship. Only surface when genuinely beneficial — no dark pattern recommendations.

---

## Data Model

```sql
CREATE TABLE insurance_policies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  account_id TEXT REFERENCES accounts(id),
  type TEXT NOT NULL CHECK (type IN ('auto', 'home', 'renters', 'life', 'umbrella', 'other')),
  provider_name TEXT NOT NULL,
  detected_premium_cents INTEGER NOT NULL,
  billing_frequency TEXT CHECK (billing_frequency IN ('monthly', 'semi_annual', 'annual')),
  annual_premium_cents INTEGER,     -- calculated
  benchmark_low_cents INTEGER,
  benchmark_high_cents INTEGER,
  overpayment_estimate_cents INTEGER,
  last_shopped_at INTEGER,
  last_alerted_at INTEGER,
  renewal_estimated_at INTEGER,
  created_at INTEGER NOT NULL
);
```

---

## Success Metrics

| Metric | Target |
|---|---|
| Insurance premiums detected per user | >80% of users with linked accounts |
| Users who initiate a quote after recommendation | >20% |
| Users who switch and confirm savings | >10% of recommended users |
| Avg annual savings for users who switch | >$350 |
| False positive rate (non-insurance flagged) | <5% |
| User satisfaction with insurance recommendations | >4.0/5.0 |

---

## Dependencies

- PRD-005 (Real Account Linking) — premium detection from transactions
- PRD-025 (Price Memory) — rate increase detection
- PRD-016 (Anomaly Detection) — shared recurring payment infrastructure
