# PRD-046 — Real ACH Money Movement (Phase 2)

**Priority**: P0
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Every feature Orbit has built — bill pay, yield sweeps, debt payments, emergency fund contributions — currently runs in simulation. Turning the simulation into real money movement is the single most important step toward Orbit being genuinely useful. This PRD defines the technical path from "pretend payments" to real ACH transfers.

---

## Problem Statement

PRD-045 (Bill Payment Execution) shipped a complete simulation: payments progress from `initiated → clearing → settled` on a timer, but no money actually moves. The same is true for yield sweeps (PRD-010) and every other money movement feature. Real money movement requires:

1. A licensed money transmitter or banking-as-a-service partner
2. A verified, compliant way to link user's external bank accounts for transfers
3. Actual ACH origination capability
4. Proper regulatory framing (are we an MSB? A payment processor? A bill payer?)

---

## Technical Options

### Option A: Plaid Transfer (recommended for MVP)
Plaid's Transfer product allows us to:
- Verify user's bank account ownership (via Plaid Auth — already have the item/access token)
- Originate ACH debit (pull money from user's checking)
- Originate ACH credit (push money to user's yield account or bill payment recipient)
- Risk evaluation included (Plaid Signal — real-time ACH return risk scoring)

**Pros**: Already have Plaid integration; same access token used for data aggregation; covers our use cases
**Cons**: Requires Plaid Transfer approval (separate product agreement); ~$0.25-$0.35 per transfer; still ACH timing (1-3 business days)

**Integration**: Plaid Transfer API at `/v1/transfer/authorization/create` then `/v1/transfer/create`

### Option B: Embedded Banking (Increase.com, Treasury Prime, Unit)
Banking-as-a-service providers that provision real bank accounts (FDIC-insured, SWIFT/ABA routing numbers) for each user. Orbit holds the funds and originates transfers.

**Pros**: Full control over UX; real-time internal transfers between Orbit accounts; yield product fits naturally (user's idle cash sits in our custodial account earning yield)
**Cons**: More complex compliance; Orbit becomes a money transmitter; KYC/AML requirements
**Best for**: Phase 3 when yield product is fully built

### Option C: Stripe (for bill payment only)
Stripe Payment Links / Financial Connections can handle some bill payment scenarios where the biller accepts Stripe payments.

**Pros**: Easy integration; no MSB license required
**Cons**: Not all billers accept Stripe; can't do bank-to-bank sweeps

**Verdict**: Use as supplemental for billers that support it.

---

## Recommended Phase 2 Path

**Phase 2A (MVP real money)**: Plaid Transfer for bill payments
- User links checking account (already done via Plaid)
- For bill pay: Plaid Auth verifies account, Plaid Transfer initiates ACH debit from user's checking to bill recipient
- Real timing: standard ACH (1-3 business days) or same-day ACH (+$0.05 fee)
- Requires: Plaid Transfer product agreement, MTL or partnership with licensed processor

**Phase 2B**: Plaid Transfer for yield sweeps
- Pull from checking → push to partner HYSA sub-account
- Both accounts linked via Plaid; same-day ACH makes this useful

**Phase 2C** (later): Embedded banking
- All money held in Orbit-custodied FDIC-insured accounts
- Instant internal transfers; yield earned directly
- Requires: MTL, banking partner, full KYC flow

---

## Regulatory Framing

Orbit must choose its regulatory posture:

### As a "Bill Payment Agent"
- Users authorize Orbit to pay their bills on their behalf
- Orbit is their agent, not a money transmitter (debatable — varies by state)
- Simpler compliance path for bill pay specifically

### As a Money Services Business (MSB)
- Register with FinCEN as MSB
- Implement AML/KYC program
- Apply for state Money Transmitter Licenses (MTLs) — required in most states
- High cost (~$2M+ to get licensed in all 50 states)

### Partnership model (recommended for MVP)
- Partner with a licensed processor (Dwolla, Synapse, Stripe) that holds the MTL
- Orbit operates as a technology platform on top of their license
- Faster to market; processor handles compliance
- Revenue share with processor

---

## Payment Safety Model

Before executing any real money movement:

1. **Idempotency key** (already implemented): Prevent duplicate payments
2. **Amount cap enforcement**: Check against autopilot single-action and daily limits
3. **Account balance verification**: Confirm sufficient funds via Plaid balance check before initiating
4. **Confirmation delay**: 4-hour cancellation window for autopilot-initiated payments
5. **Transfer limits**: Default max $2,500/transfer, $5,000/day, $15,000/month (user-configurable up to limits set by processor)
6. **Velocity monitoring**: Flag unusual patterns (e.g., 5+ payments in 1 hour)

---

## Data Model Updates

```sql
-- Update payments table (0007_payments.sql) with real fields:
ALTER TABLE payments ADD COLUMN plaid_transfer_id TEXT;
ALTER TABLE payments ADD COLUMN plaid_authorization_id TEXT;
ALTER TABLE payments ADD COLUMN rail TEXT DEFAULT 'simulation'
  CHECK (rail IN ('simulation', 'ach_standard', 'ach_same_day', 'rtp', 'wire'));
ALTER TABLE payments ADD COLUMN bank_account_id TEXT;
ALTER TABLE payments ADD COLUMN return_code TEXT;  -- ACH return codes (R01, R02, etc.)
```

---

## ACH Return Handling

ACH returns (failed payments) arrive 1-3 business days after initiation:

| Return Code | Meaning | Action |
|---|---|---|
| R01 | Insufficient funds | Alert user; offer retry; recommend yield sweep to cover |
| R02 | Account closed | Mark account requires_reauth; notify user |
| R03 | Account not found | Remove account; request re-link |
| R10 | Customer advises not authorized | Immediate freeze; contact user |
| R29 | Corporate customer advises not authorized | Same as R10 |

All returns: update payment status → `failed`, call `notifyPaymentFailed()`, update account `connection_status`.

---

## User Experience

### Bill Payment (real ACH)
1. User confirms payment: "Pay $87.50 to [Utility] on March 15"
2. Orbit confirms: "Sending $87.50 from [Bank Account ••••1234] via ACH. Arrives in 1-3 business days."
3. 4-hour cancellation window (for autopilot-initiated payments)
4. Status updates: initiated → processing → delivered
5. Confirmation when settled: "Your payment of $87.50 to [Utility] has settled ✓"

### Yield Sweep (real ACH)
1. Auto: Orbit detects $1,800 available over safe float
2. Notification: "Moving $1,800 to your yield account. Available by Wednesday."
3. Status shown in yield dashboard
4. Recall: "Move $500 from yield to checking → available by tomorrow morning"

---

## Success Metrics

| Metric | Target |
|---|---|
| Payment success rate (no ACH returns) | >97% |
| ACH return rate | <2% |
| Avg settlement time | <2 business days |
| Same-day ACH adoption rate | >20% of bill payments |
| User-reported payment confidence | >4.5/5.0 |
| Zero unauthorized transfers | Required |

---

## Dependencies

- PRD-005 (Real Account Linking) — Plaid access token required for Transfer API
- PRD-045 (Bill Payment Execution) — existing simulation to replace
- PRD-010 (Yield Optimization) — yield sweep money movement
- PRD-015 (2FA) — step-up auth for first payment and high-value transfers
