# PRD-010 — Yield Optimization Engine

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

The average US checking account earns 0.08% APY while high-yield alternatives earn 4–5% APY. For a user with $10,000 in checking, that's $400–500 of free money being left on the table every year. Orbit should automatically identify idle cash, move it to the best available yield position, and return it on demand — all without the user having to think about it or open a second app.

---

## Problem Statement

Three problems prevent most people from earning meaningful yield on idle cash:

1. **Inertia**: Opening a HYSA account at a separate bank is friction-ful. Most people never do it.
2. **Fear of illiquidity**: "What if I need that money?" keeps people from moving it.
3. **Analysis paralysis**: Too many options (HYSA, money market, T-bills, CDs) with no obvious right answer.

Orbit eliminates all three: no new account to open (we operate the allocation), instant liquidity on demand, and automated selection of the best product for the user's situation.

---

## Current Yield Landscape (2026)

| Product | Typical APY | Liquidity | Min Balance |
|---|---|---|---|
| Big bank checking | 0.01–0.08% | Instant | $0 |
| High-Yield Savings Account (HYSA) | 4.0–5.0% | 1-3 business days | $0–1,000 |
| Money Market Fund (VMFXX, SWVXX) | 4.5–5.2% | 1 business day | $0 |
| 3-Month T-Bill (TreasuryDirect) | 4.3–4.8% | 3-4 weeks (at maturity) | $100 |
| 1-Month T-Bill | 4.4–4.9% | 4-5 weeks | $100 |
| No-Penalty CD | 4.5–5.0% | Instant (with some notice) | $0–1,000 |

*Rates approximate as of Q1 2026. Fed Funds Rate influences heavily; integrate a rate-feed to keep current.*

**Orbit's recommendation engine** matches yield product to user's liquidity needs:
- Needs money within 1 week → HYSA
- Comfortable with 1-2 week horizon → Money Market Fund
- Comfortable with 4-week horizon for portion → T-Bills (highest rate, no state tax)

---

## Architecture

### Phase 1: Partner HYSA (MVP Path)
Orbit partners with a HYSA provider (e.g., Synchrony, Marcus by Goldman Sachs, Ally) to open a sub-account on behalf of the user. Orbital's value: automatic sweep in/out. No new account onboarding for user.

**Technical**: Partnership API with the HYSA provider for account creation and ACH transfers. Or use an embedded banking provider (Treasury Prime, Unit, Increase.com) that provides FDIC-insured accounts via API.

### Phase 2: Smart Allocation
Once Phase 1 is live, the engine can recommend split allocations:
- 80% in HYSA (liquid, lower yield)
- 20% in T-Bills or money market (slightly higher yield, 30-day horizon)

### Phase 3: Stablecoin Yield (see PRD-026)
USDC deposited into on-chain yield protocols (AAVE, Compound, or Coinbase's institutional yield) can earn 4-6%+ with instant liquidity via stablecoin rails. Invisible to user — shown as APY, settled as USD.

---

## Core Algorithm: Float Calculation

The agent maintains a **safe float** for each user — the minimum checking balance needed to cover upcoming obligations without risking overdraft:

```
safe_float = (
  sum(upcoming_bills_14_days)          // known bills due in next 14 days
  + (avg_daily_discretionary × 10)     // 10-day spending buffer
  + overdraft_risk_premium              // extra cushion based on income volatility
)

available_to_sweep = checking_balance - safe_float

if available_to_sweep > sweep_threshold (default $100):
  → sweep available_to_sweep to yield position
```

**Adaptive**: The algorithm adjusts for:
- Upcoming large expenses (detected from subscriptions, bills, or user input)
- Paycheck timing (sweep more right after payday)
- Spending pattern volatility (users with erratic spending get larger buffers)

---

## User-Facing Features

### Yield Dashboard (exists in mock, needs real data)
- Current yield position balance and APY
- Estimated annual earnings at current allocation
- Interest earned this month / this year
- Comparison: "without Orbit's yield feature, you'd have earned $0.06"

### Auto-Sweep Controls
- Toggle on/off
- Minimum sweep amount: $50–$500 (default $100)
- Target float multiplier: 1x–3x (default 1.5x — extra cautious)
- Sweep frequency: daily / weekly / manual

### Instant Recall
User can pull any amount from yield position to checking in 1 business day (HYSA) or instantly (stablecoin). Agent confirms: "Moving $500 from yield to checking. Available by [time]."

### Rate Comparison
Monthly: "Your current HYSA rate is 4.2%. A money market fund is offering 4.8% for the same liquidity. Switch?"

---

## Agent Integration

The agent uses yield optimization as a tool in conversations:
- "You have $2,400 sitting in checking earning nothing. I can move $1,800 to yield (keeping $600 for upcoming bills). That would earn you about $7/month. Want me to set this up?"
- When a new paycheck lands: "Your $3,200 paycheck just arrived. After reserving for upcoming bills, $1,800 is available for yield. Sweep it automatically?"

---

## Current State

The MVP already has:
- `GET /api/v1/yield` — yield position data
- `POST /api/v1/yield/sweep-in` and `sweep-out` — simulate sweeps
- Mock MoneyAdapter (instant yield position changes)

What's needed for real:
1. Real embedded banking partner for HYSA sub-accounts
2. Real ACH transfer capability (PRD-046)
3. Live rate feed (Plaid or direct provider API)
4. Float calculation algorithm with real transaction data
5. Auto-sweep scheduling (Cloudflare Cron Triggers)

---

## Success Metrics

| Metric | Target |
|---|---|
| Avg incremental yield per user/month | >$8 |
| Users with active yield allocation | >50% of users with linked accounts |
| Liquidity shortfall events (insufficient float) | <0.5% of months |
| Avg idle cash reduction | >40% of excess balance |
| Avg APY earned vs. user's prior bank APY | >3.5% improvement |
| User satisfaction with yield features | >4.2 / 5.0 |

---

## Dependencies

- PRD-005 (Real Account Linking) — balance data and spending patterns
- PRD-046 (Real ACH Money Movement) — actual fund transfers
- PRD-027 (Cashflow Engine) — float calculation accuracy
- PRD-011 (Spending Forecast) — upcoming expense prediction for float buffer
