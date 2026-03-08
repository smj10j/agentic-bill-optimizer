# PRD-003 — Smart Bill Pay Timing

**Priority**: P0
**Status**: In Review
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Every day a dollar sits in a yield-bearing account instead of a bank's checking account earns real money. Smart Bill Pay captures the "float" between when a bill arrives and when it actually must be paid, using that window to maximize yield without ever missing a due date or incurring a fee. The result: bills are always paid on time, users earn more yield, and cash flow is optimized automatically.

---

## Problem Statement

Most people pay bills one of two ways: the moment they arrive (leaving yield on the table) or on the due date (risking late payment if something goes wrong). The optimal window — the grace period after the due date when no fee is charged — is almost never exploited because it requires knowing each biller's exact policies, monitoring cash flow, and timing payments manually. No consumer tool does this. Orbit can.

---

## The Opportunity

At a 5% APY yield rate:
- $200 electric bill, held 10 extra days = **$0.27 saved**
- $150 internet bill, held 7 extra days = **$0.14 saved**
- $350 insurance premium, held 28 extra days (safe grace) = **$1.34 saved**
- $500 credit card balance (beyond minimum), held 15 extra days = **$1.03 saved**

Across a typical household with 8-12 recurring bills, this captures **$3–15/month** in additional yield — a small but real and automatic gain that compounds over time. More importantly, it teaches users that timing matters without them needing to do anything.

---

## Scheduling Algorithm

### Inputs per Bill
- `due_date`: hard due date
- `grace_period_days`: confirmed safe delay past due date (0 by default; updated as we learn)
- `late_fee`: fee if paid after grace period expires
- `payment_rail`: ACH (D+1 or D+2), same-day ACH, card, check
- `minimum_payment`: for credit cards (always pay at least the minimum)
- `user_float_minimum`: amount user wants to keep available at all times

### Optimal Payment Date Formula
```
safe_pay_by = due_date + confirmed_grace_period_days - 1_day_buffer
lead_time = payment_rail_settlement_days + 1_business_day_buffer  // for weekends/holidays

optimal_initiate_date = safe_pay_by - lead_time

// If optimal_initiate_date would drop balance below float:
//   Find latest date that keeps balance ≥ float
//   If no such date exists: alert user, request top-up or reduce float threshold
```

### Grace Period Confidence System
Orbit never assumes a grace period exists. Grace periods are confirmed through:
1. **Biller data**: known grace periods for major billers (pre-populated database)
2. **User transaction history**: if user has paid 3+ days late N times without a fee, infer grace
3. **User confirmation**: user can explicitly confirm a grace period they know about
4. **Conservative default**: 0 grace days (pay by due date) until confirmed

Grace periods are surfaced to users: "Your internet provider gives a 7-day grace. Orbit will use this to earn you more yield."

---

## Bill Categories & Timing Strategy

| Bill Type | Strategy | Notes |
|---|---|---|
| Credit card — full balance | Pay by statement due date (not statement close) | Paying before statement close doesn't help credit; paying after due date triggers interest |
| Credit card — minimum only | Pay minimum by due date; flag to user that interest is accruing | Never hold below minimum |
| Utilities | Pay on due date or within confirmed grace | Grace common; Orbit uses only if confirmed |
| Insurance | Use full grace period (often 28–30 days) | Insurance grace is contractual, extremely safe |
| Rent/Mortgage | Pay on due date (1st of month, grace often 5–15 days) | Default: never exploit mortgage grace (credit risk); user can opt in |
| Streaming/Subscriptions | No grace — charged on billing date | No timing opportunity; just track and confirm payment |
| Medical bills | Flexible; negotiate before paying | Orbit flags for negotiation before scheduling |

---

## Cash Flow Conflict Resolution

When multiple bills compete for the same cash window:

**Priority order:**
1. Bills where late payment triggers credit score impact (credit cards, mortgage)
2. Bills where late payment triggers a fee (utilities, insurance)
3. Bills where late payment has no penalty (some medical, some utilities with long grace)
4. Yield sweeps (always lowest priority — never delay a bill to earn yield)

If paying all bills would drop the user below their float minimum, Orbit:
1. Alerts the user 5 days in advance
2. Proposes options: "Pull from yield ($150 available)" or "Delay non-urgent bill X"
3. Executes user's choice or escalates if no safe option exists

---

## Autopay Coexistence

Many users have existing autopay configured at their bank or biller. Orbit must not double-pay.

**Detection**: When an account is linked, Orbit scans for recurring ACH debits that match known billers. If found, it marks those billers as "Bank Autopay Detected."

**Default behavior**: Track-only. Orbit monitors the autopay, confirms it executes, and notes it in the user's bill history. No timing optimization (since we don't control the date).

**Opt-in override**: User can explicitly choose "Let Orbit control timing for this bill." This requires the user to cancel their existing autopay first. Orbit guides this flow step by step.

---

## Payment Methods

For MVP, Orbit initiates payments from linked checking accounts via ACH. Future:
- Same-day ACH (if bank supports)
- Stablecoin settlement (see PRD-026) for instant settlement, eliminating lead time padding
- Card payment for billers that don't accept ACH

---

## User Interface

**Bill Timeline View**: A horizontal timeline (or vertical list) showing all upcoming bills with:
- Bill name and amount
- Optimal pay date (Orbit's calculated date)
- Due date
- Yield saved by using optimal timing (shown in cents/dollars)
- Color coding: Green (handled), Yellow (needs attention), Red (at risk)

**Per-Bill Controls**: User can override any individual scheduled payment date. Orbit recalculates and warns if the override creates risk.

**One-Time Bills**: Manual entry flow for bills not detected automatically.

---

## Open Questions — Resolved

**Q: What if a payment fails after we've held it close to the due date?**
A: Orbit always initiates payment 2 business days before the target pay date (not the due date). ACH settlement is 1–2 business days; this buffer ensures on-time delivery. If payment fails, Orbit alerts immediately with "Pay now" as the CTA. The conservative buffer means there's still time to pay before the due date.

**Q: How do we handle federal holidays and bank closures?**
A: All scheduling accounts for the Federal Reserve's ACH calendar. A payment scheduled for a holiday is initiated on the prior business day. Orbit maintains the official ACH holiday calendar and updates it annually.

**Q: Should Orbit ever pay credit card minimums only?**
A: Orbit defaults to full statement balance for credit cards to avoid interest. Users can configure "minimum + $X" mode for cash flow management. Orbit always shows the cost of not paying in full: "Paying the minimum today means ~$XX in interest this month."

**Q: What about users who have no grace period knowledge for their bills?**
A: Default is always 0-day grace (pay on due date). As Orbit observes late payments without fees in the transaction history, it updates the grace period estimate and asks the user to confirm. This is always opt-in — we never assume a grace period exists.

**Q: Is the yield gain too small to matter?**
A: $5–15/month in isolation is modest but: (1) it's completely automatic, (2) it compounds over time, (3) it's a tangible demonstration of Orbit's intelligence even when dollar amounts are small, and (4) it builds the mental model that timing = money, which supports adoption of bigger features like PRD-010 Yield Optimization.

---

## Success Metrics

| Metric | Target |
|---|---|
| Late payments caused by Orbit scheduling | 0 |
| Avg yield captured per user per month via timing | >$2 |
| Avg float days captured per bill | >3 days |
| % of linked bills managed via Smart Pay | >60% |
| Payment failure rate | <0.5% |
| User override rate (changing Orbit's schedule) | <10% (indicates trust) |
| Users with autopay conflict resolved successfully | >90% |
