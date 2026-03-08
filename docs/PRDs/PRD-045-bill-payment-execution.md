# PRD-045 — Bill Payment Execution & Money Movement

**Priority**: P0
**Status**: In Review
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Smart Bill Pay (PRD-003) without actual payment execution is a scheduling UI. The vision of Orbit paying your bills at the optimal time requires the ability to actually move money — initiate ACH transfers, track payment status, handle failures, and confirm settlement. This PRD defines the payment execution layer: the mechanics of how money moves from a user's checking account to a biller, and how that movement is tracked, reported, and recovered from when things go wrong.

---

## Problem Statement

PRD-003 defines *when* to pay bills. PRD-004 defines the approval and undo framework. But neither defines *how* payments are actually initiated or tracked. Without a payment execution layer, Orbit can only schedule payments — it can never act on them. This gap is fatal to the autopilot value proposition. A user who enables Full Autopilot expects their electric bill to actually get paid, not just added to a calendar.

---

## Scope: Two Phases

### Phase 1 (POC/Demo): Simulated Execution
- All payment actions execute against a simulation engine
- Payments show realistic status progressions (initiated → clearing → settled)
- Users see the full approval, notification, and audit trail experience
- No real money moves; no payment processor integration required
- Sufficient to demo the full product experience to investors and early users

### Phase 2 (MVP): Real ACH Execution
- Integration with a payment initiation provider (Plaid or Dwolla)
- Real ACH transfers from user's linked checking account to billers
- Full failure handling, retry logic, and reconciliation

This PRD covers both phases. Phase 1 is implemented first; Phase 2 gated on regulatory and compliance readiness.

---

## Payment Methods Supported

| Method | Phase | Description |
|---|---|---|
| ACH (standard, D+2) | Phase 2 | Standard bank transfer; 2 business days to settle |
| ACH (same-day) | Phase 2 | Faster settlement; $0.25–$1.50/transaction fee |
| Simulated ACH | Phase 1 | Fake transfer with realistic timing simulation |
| Stablecoin settlement | Future (PRD-026) | Instant, near-zero cost; invisible to user |

---

## Payment Lifecycle

### States

```
scheduled
  → initiated        (ACH file submitted to payment processor)
    → clearing       (funds in transit; T+1)
      → settled      (biller received funds; T+2)
      → failed       (bank rejected; see failure types below)
  → cancelled        (user cancelled before initiation)
  → simulation_complete  (Phase 1 only)
```

### Timing (Phase 2, Standard ACH)

```
Day 0 (initiation day):
  T+0: Orbit submits ACH debit request to payment processor
  T+0: Status → "initiated"; user notified "Payment in progress"

Day 1:
  T+1: ACH clears bank; funds reserved (not yet at biller)
  T+1: Status → "clearing"

Day 2:
  T+2: Settlement confirmed at biller
  T+2: Status → "settled"; user notified "Paid ✓"

Failure at any step:
  T+x: Status → "failed"; user notified immediately
       Orbit initiates retry or escalates (see Failure Handling)
```

PRD-003's scheduling algorithm must account for this D+2 lead time when computing initiation dates.

---

## Phase 1: Simulation Engine

The simulation engine enables the full UX experience — approvals, notifications, action history, undo — without real money movement.

### Simulation Behavior

When a payment is scheduled in simulation mode:
1. `status: scheduled` immediately
2. After 5 seconds: `status: initiated` (instant in demo; realistic pause in background)
3. After 30 seconds: `status: clearing`
4. After 60 seconds: `status: settled`
5. Push notification + action history update at each state transition

### Failure Simulation
For demo purposes, Orbit can simulate failures to show the error recovery UX:
- `simulate_failure: true` flag on a payment triggers a realistic failure at T+1
- Shows the notification, retry offer, and escalation flow

### Simulated ACH "Receipt"
When a payment settles in simulation, a mock "payment confirmation" is generated:
```json
{
  "confirmation_id": "ORB-SIM-20260308-4821",
  "amount_cents": 12745,
  "biller": "Pacific Gas & Electric",
  "status": "settled",
  "initiated_at": "2026-03-08T14:00:00Z",
  "settled_at": "2026-03-10T09:00:00Z",
  "from_account": "Chase Checking ····4821",
  "note": "Demo simulation — no real funds moved"
}
```

---

## Phase 2: Real ACH Execution

### Provider Options

**Option A: Plaid Payment Initiation**
- Plaid's native payment product (Plaid Transfer)
- Same connection used for data read → adds payment write capabilities
- No separate account or relationship required
- Pricing: ~$0.25–$0.75 per transfer (volume dependent)
- Compliance: Plaid is the registered payments processor; reduces Orbit's regulatory burden

**Option B: Dwolla**
- Dedicated ACH provider with excellent developer API
- Requires separate integration but more flexible
- Pricing: ~$0.25/transfer flat
- Compliance: Dwolla is the registered processor

**Recommendation**: Start with Plaid Transfer (same vendor, one integration) and evaluate Dwolla at scale if pricing becomes a factor. Either way, the adapter pattern means swapping providers requires only a new `PaymentAdapter` implementation.

### Payment Adapter Interface

```typescript
interface PaymentAdapter {
  initiatePayment(params: {
    fromAccountId: string;     // Plaid account_id
    toBiller: Biller;
    amountCents: number;
    scheduledDate: Date;
    idempotencyKey: string;
  }): Promise<PaymentResult>;

  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;

  cancelPayment(paymentId: string): Promise<CancelResult>;

  // Returns whether cancellation is still possible
  canCancel(paymentId: string): Promise<boolean>;
}
```

The `SimulatedPaymentAdapter` (Phase 1) and `PlaidPaymentAdapter` (Phase 2) both implement this interface. The rest of the system doesn't know which is active.

### Idempotency

Every payment initiation includes an `idempotency_key` (UUID generated at schedule time and stored in D1). If the same key is submitted twice (network retry, double-click), the processor returns the existing payment rather than creating a duplicate. This is critical for correctness and is **non-optional**.

### Biller Payment Details

To pay a biller via ACH, Orbit needs the biller's routing + account number (or their payment gateway endpoint). Two approaches:

1. **Biller database**: Pre-built database of major biller payment details (utility companies, insurance providers, etc.) — sufficient for top 200 billers that cover ~80% of American households' recurring bills
2. **User-provided**: User enters biller account number + biller's payment instructions manually for billers not in the database
3. **Biller payment APIs**: Some billers (AT&T, Verizon, etc.) have direct payment APIs; integrate opportunistically

For MVP, the biller database approach covers enough ground to be compelling. Users with unusual billers use manual entry.

---

## Failure Handling

### Failure Types

| Error | Cause | Resolution |
|---|---|---|
| `insufficient_funds` | Balance too low at initiation | Alert user immediately; retry offer; pull from yield if enabled |
| `account_closed` | Linked account no longer active | Alert user; prompt to link replacement |
| `invalid_routing` | Biller routing number changed | Update biller database; retry with new details |
| `biller_rejected` | Biller rejected the payment | Alert user; provide biller contact info; mark bill for manual payment |
| `processing_error` | Internal error at processor | Auto-retry after 2 hours; escalate to support after 2 failures |
| `cancelled_by_user` | User cancelled before settlement | Close; no retry |

### Retry Logic
- Automatic retry after `processing_error`: once, 2 hours after failure
- No automatic retry for `insufficient_funds` (user must act first)
- No automatic retry for `account_closed` (user must link new account)
- All retries use the same idempotency key (safe to re-submit)

### Notification on Failure
Always push + email for payment failures, regardless of notification preferences. Includes:
- What failed and why (plain English)
- What happens next (due date, grace period remaining)
- Primary CTA: [Pay manually] or [Add funds and retry]

### Failure SLA
- User notified within 5 minutes of failure confirmation from processor
- If bill is still within grace period: no panic; inform the user calmly
- If bill is at or past due date and failed: critical alert level

---

## Undo / Cancellation

Cancellation is possible if payment has not yet reached `clearing` state:
- `scheduled` → cancellable (delete from schedule)
- `initiated` → cancellable if processor supports same-day cancel (Plaid: yes for first 2 hours)
- `clearing` → not cancellable; must wait for settlement then request refund from biller
- `settled` → not reversible by Orbit; user contacts biller for refund; Orbit assists

The PRD-004 undo UI reflects this availability: the "Undo" button is disabled once payment enters `clearing` with a tooltip "Payment is in transit and can no longer be recalled."

---

## Reconciliation

After every settled payment, Orbit reconciles against the user's transaction feed (from Plaid):
- Find the corresponding debit transaction in Plaid data
- Link payment record to transaction record in D1
- Mark the bill as paid in the bills table
- Generate a "Bill paid ✓" action record

If no matching transaction appears within T+3 (one day after expected settlement), flag for review. This catches cases where the payment settled but Plaid didn't sync it yet.

---

## Data Model

```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bill_id TEXT,                      -- optional: linked bill
  biller_name TEXT NOT NULL,
  biller_id TEXT,                    -- from biller database, if known
  from_account_id TEXT NOT NULL,     -- our internal account id
  plaid_account_id TEXT,             -- Plaid's account_id
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  payment_adapter TEXT NOT NULL,     -- 'simulated' | 'plaid' | 'dwolla'
  external_payment_id TEXT,          -- processor's ID
  idempotency_key TEXT UNIQUE NOT NULL,
  scheduled_date INTEGER NOT NULL,   -- when Orbit plans to initiate
  initiated_at INTEGER,
  cleared_at INTEGER,
  settled_at INTEGER,
  failed_at INTEGER,
  failure_code TEXT,
  failure_message TEXT,
  cancelled_at INTEGER,
  cancellation_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  transaction_id TEXT,               -- linked Plaid transaction after reconciliation
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Compliance Considerations (Phase 2)

Real money movement triggers regulatory requirements:
- **NACHA rules**: ACH payment operators must comply with NACHA Operating Rules. Working through Plaid or Dwolla means they handle NACHA compliance as the registered payment processor.
- **Reg E** (Electronic Fund Transfer Act): Users must receive disclosures before Orbit initiates debits. The approval flow (PRD-004) + Terms of Service constitute Reg E disclosure.
- **Unauthorized debit protection**: Users can dispute any unauthorized ACH debit within 60 days. Orbit must have a process to respond to these disputes (support escalation).
- **State money transmitter licenses**: If Orbit holds funds in transit (not pass-through), money transmitter licenses may be required in some states. Using Plaid/Dwolla as the processor keeps Orbit out of the money transmission business.

These are handled by the integration with a licensed processor. Orbit's legal team should review before Phase 2 launch.

---

## Open Questions — Resolved

**Q: Should Phase 1 tell users it's simulated?**
A: Yes, transparently. A banner in the bill payment flow says "Demo Mode: no real money moves." Users in Demo Mode (PRD-043) see this always. Real users who haven't yet completed Phase 2 integration see: "Payment scheduling is ready — real bill pay coming soon. We'll notify you when it's live." This is honest and sets correct expectations.

**Q: How do we handle billers that don't accept ACH?**
A: Some billers only accept credit card or check. For these:
  - Card payment: route user to the biller's payment portal with a pre-filled amount (deep link); Orbit tracks completion manually
  - Check: out of scope for MVP
  - Most major utility, insurance, and service providers accept ACH; this covers the majority of users' bill volume

**Q: What if a user has insufficient funds and autopilot is on?**
A: Never silently fail. If balance drops below the payment amount between scheduling and initiation, Orbit:
  1. Checks if yield position has sufficient balance to cover the shortfall
  2. If yes and user has "pull from yield for bills" enabled: sweep the delta and proceed
  3. If no, or user hasn't enabled yield-to-bill: pause the payment, immediately notify user, escalate to manual action

**Q: Do we need a separate bank account (custodial) to hold user funds?**
A: No. Orbit initiates ACH debits directly from the user's own bank account to the biller. Orbit never holds user funds. This is the simplest compliance posture and should be maintained.

---

## Success Metrics

| Metric | Target |
|---|---|
| Phase 1: Simulated payments completing full lifecycle | 100% |
| Phase 2: ACH payment success rate | >99% |
| Late payments caused by Orbit payment execution failures | 0 |
| Payment failure notification time | <5 minutes of processor confirmation |
| Cancellation success rate (within cancellable window) | >99% |
| Reconciliation match rate (payment → transaction) | >97% within T+3 |
| User-reported payment confidence | >4.2/5.0 in survey |
