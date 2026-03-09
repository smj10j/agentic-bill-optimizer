# PRD-053 — Monetization Model

**Priority**: P0
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Orbit's monetization must be perfectly aligned with user value: we make money when you save money and when your money grows. No selling your data, no pushing financial products that benefit us at your expense, no subscription that costs more than it saves. Every revenue stream should pass the test: "Would I be proud to explain exactly how we make money to our users?"

---

## Revenue Streams

### Stream 1: Subscription — Orbit Pro
**Model**: Flat monthly or annual subscription for full autopilot capabilities

| Tier | Price | Features | Target |
|---|---|---|---|
| Free | $0 | Account linking, dashboard, insights, read-only agent chat | Acquisition funnel |
| Pro | $8/month ($80/year) | Full autopilot, bill pay, yield optimization, anomaly alerts, subscription management | Core paying user |
| Plus | $15/month ($150/year) | Pro + computer use agent (negotiations, cancellations), tax tools, priority support | Power user |

**Revenue model justification**:
- A user saving $300/year on bills + $150/year in yield + $100/year in caught anomalies = $550/year in value
- $96/year (Pro) represents a 5.7× ROI — very compelling
- Free tier creates a large acquisition funnel; conversion to paid happens when user sees their first real savings

**Annual billing discount**: 2 months free for annual payment. Reduces churn, improves cash flow.

### Stream 2: Success Fees — Bill Negotiation
**Model**: One month's savings for each successful negotiation (PRD-008)

- No negotiation fee for Pro/Plus subscribers (included)
- Free tier users pay 25% of first year's savings
- High alignment: we only earn when you save

**Example**: Negotiate internet from $89/month to $65/month = $24 savings/month
- Free tier fee: $24 × 12 × 25% = $72 one-time
- Pro subscribers: included in subscription

### Stream 3: Yield Spread (Future)
**Model**: When managing user funds in yield positions, retain a small basis point spread

- User earns, say, 4.5% APY
- Underlying instrument earns 4.8% APY
- Orbit retains 0.30% spread on AUM
- On $10,000 average balance: $30/year per user

This only works when we manage actual funds (requires embedded banking infrastructure per PRD-046). Long-term, this is the largest revenue opportunity — aligned with user success (more money under management = better for both).

### Stream 4: Affiliate Revenue — Card & Insurance Recommendations
**Model**: Referral fees for recommendations that lead to account openings

| Product | Revenue per conversion |
|---|---|
| Credit card application (via affiliate) | $50–200 |
| Insurance quote lead | $15–50 |
| Insurance policy conversion | $100–200 |
| HYSA account opening | $25–75 |

**Critical rule**: Only recommend when it's genuinely better for the user. Affiliate revenue is a secondary benefit of making good recommendations — not a reason to make recommendations. Fully disclose affiliate relationships.

**Revenue potential at 10K users**:
- 500 card recommendations → 20% conversion = 100 conversions × $100 avg = $10,000/year
- 1,000 insurance benchmarks → 10% quote conversion = 100 leads × $30 avg = $3,000/year

### Stream 5: Data (Future, Privacy-Preserving)
**Model**: Anonymized, aggregated financial intelligence for institutional buyers (NOT individual user data)

Examples:
- "Average internet bill in Atlanta has increased 8% YoY" — value to ISPs, cable companies
- "Households in X income bracket overpay on auto insurance by Y%" — value to insurers
- Inflation and spending pattern indices — value to economists, hedge funds

**Non-negotiable constraints**:
- Individual user data is NEVER sold
- Only aggregate, anonymized statistics
- Users can opt out of contributing to aggregated analytics
- Revenue from this stream is explicitly disclosed in privacy policy

---

## Anti-Patterns to Avoid

| Pattern | Why We Won't Do It |
|---|---|
| Lead generation for lenders | Creates conflict of interest; we'd recommend debt rather than financial health |
| Payday loan / BNPL referrals | Predatory; directly harms the users we exist to help |
| "Premium" features that are actually just table stakes | Everything in the free tier must be genuinely useful |
| Opaque affiliate relationships | Always disclose; trust is the product |
| Charging per-transaction fees on small amounts | Death by a thousand cuts; use subscription instead |
| Advertising (banner ads, sponsorships) | Destroys trust in financial advice; never |

---

## Pricing Psychology

### Anchoring to Value
Always frame pricing against what users save:
- "Pro costs $8/month. Most Pro users save $45/month in the first 30 days."
- "The average Pro user saved $612 last year — that's a 6.4× return on their $96 annual fee."

### Free Trial
- 30-day free trial of Pro — no credit card required
- Trial starts automatically when user links first real account
- Day 25 email: "Your trial ends in 5 days. Here's what you've saved so far."

### Upgrade Triggers
Surface upgrade prompts at peak value moments:
- After detecting an anomaly that free tier can't act on: "Upgrade to Pro to let Orbit dispute this charge for you"
- When yield sweep is ready but free tier lacks it: "Upgrade to start earning on $1,800 in idle cash"
- After subscription ROI analysis shows $30+/month opportunity: "Pro pays for itself 3× over with just this one cancellation"

---

## Unit Economics (Target at Scale)

| Metric | Target |
|---|---|
| Free → Pro conversion rate | >15% within 60 days |
| Monthly churn (Pro) | <3% |
| LTV (Pro, 3-year) | ~$288 |
| CAC (target) | <$30 |
| LTV:CAC ratio | >9× |
| Avg revenue per user (Pro + affiliate + success fees) | >$15/month |
| Break-even users | ~5,000 Pro subscribers at 40% margin |

---

## Competitive Pricing Context

| Product | Price | Model |
|---|---|---|
| Copilot | $14.99/month | Subscription, iOS only |
| Monarch Money | $14.99/month | Subscription, excellent UI |
| YNAB | $14.99/month | Subscription, methodology-based |
| Rocket Money Premium | $6–12/month | Subscription + success fees |
| Cleo Plus | $5.99/month | Subscription, Gen Z focused |
| Albert Genius | $14.99/month | Subscription |

Orbit Pro at $8/month undercuts most competitors while delivering superior value through actual automation (not just analysis).

---

## Implementation Priority

1. **Free tier**: Already live (all current features)
2. **Pro gate**: Add subscription system — gate computer use, auto-sweep, tax tools behind Pro
3. **Stripe integration**: Billing infrastructure (`POST /api/v1/billing/subscribe`, webhook for subscription events)
4. **Success fees**: Prompt after successful negotiation; Stripe one-time charge
5. **Affiliate links**: Add to card optimizer and insurance monitor recommendations

---

## Dependencies

- Stripe integration for subscription billing
- PRD-008 (Bill Negotiation) — success fees
- PRD-050 (Card Optimizer) — affiliate revenue
- PRD-051 (Insurance Monitor) — affiliate revenue
- PRD-047 (Computer Use) — Plus tier differentiator
- PRD-046 (Real ACH) — yield spread model (long-term)
