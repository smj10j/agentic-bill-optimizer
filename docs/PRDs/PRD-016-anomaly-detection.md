# PRD-016 — Anomaly Detection & Fraud Alerts

**Priority**: P0 (elevated from P1 — now achievable with real Plaid transaction data)
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

With real Plaid transaction data flowing in, Orbit can silently watch every transaction on behalf of the user — catching duplicate charges, unexpected price increases, unauthorized charges, and billing errors before the user even notices. This is one of the highest-value immediate capabilities now that real data is available.

---

## Problem Statement

Fraudulent charges and billing errors cost US consumers an estimated $5.8B annually. Problems include:
- **Duplicate charges**: Same merchant charges twice (within hours or days)
- **Price creep**: Subscription goes from $9.99 to $12.99 without notice
- **Unauthorized charges**: Credential theft, accidental card-on-file charges, ghost subscriptions
- **"Free" trial conversions**: User forgot to cancel; first charge appears
- **Billing errors**: Wrong amount, charge after cancellation, refund never processed

Most people find these manually, often weeks later, or never. The detection problem is data-rich but tedious — exactly what an AI agent is built for.

---

## Detection Algorithms

### 1. Duplicate Charge Detection
**Rule**: Same normalized merchant name + amount within 7 days
```
if (
  normalize(merchant_a) == normalize(merchant_b) AND
  abs(amount_a - amount_b) < 1.00 AND
  abs(transacted_at_a - transacted_at_b) < 7 * 86400
) → DUPLICATE_CHARGE alert
```
**Edge cases**: Exclude known recurring subscriptions on the same date; allow duplicates for merchants like Amazon or Starbucks where multiple same-day charges are expected.

### 2. Subscription Price Increase Detection
Builds on PRD-025 (Price Memory). For each recurring merchant:
- Track all historical charge amounts
- Alert if new charge > (avg of last 3 charges × 1.05) — i.e., >5% increase
- Calculate dollar and percent change

### 3. Charge After Cancellation
- Maintain a list of cancelled subscriptions (from PRD-009)
- Alert if any charge appears from a cancelled provider's merchant name

### 4. Unusual Amount Alert
**Rule**: Charge from known merchant is >2.5σ above that merchant's mean for this user
```
z_score = (new_amount - historical_mean) / historical_std
if z_score > 2.5 → UNUSUAL_AMOUNT alert
```
Requires ≥6 historical charges to establish baseline.

### 5. New Recurring Charge
- Merchant charges in a pattern consistent with a new subscription (monthly, same amount, 2+ occurrences)
- Not in user's known subscription list
→ Alert: "New recurring charge detected: $X from [Merchant]. Want to track this?"

### 6. Geographic Anomaly
- Charge from a country or state the user has never transacted in (based on merchant location from Plaid metadata)
- High-risk merchant categories (gambling, adult content, crypto exchanges) flagged higher

### 7. Overnight Activity
- Multiple charges during sleeping hours (configurable — default 11pm–6am)
- More than 3 charges in 1 hour from different merchants

---

## Alert Severity Model

| Severity | Examples | Notification Type | Auto-Action |
|---|---|---|---|
| Critical | Duplicate charge, charge after cancellation | Immediate push + in-app | Prepare dispute package |
| High | Unusual amount, geographic anomaly | Push + email | None |
| Medium | Price increase detected | In-app only | Suggest negotiation |
| Low | New recurring charge detected | In-app only | None |

**Anti-fatigue**: Medium and Low alerts are batched to daily digest. Critical and High send immediately regardless of quiet hours (bypasses PRD-006 anti-fatigue rules).

---

## Dispute Assistance

For Critical-severity alerts where the charge appears fraudulent:
1. Alert: "Duplicate charge from [Merchant] — $47.99 on Mar 5 and Mar 6"
2. One-tap: "Dispute this charge"
3. Orbit generates a dispute package:
   - Merchant name, charge dates, amounts
   - Reason: "Duplicate charge — charged twice within 24 hours"
   - Recommended dispute language formatted for card issuer
   - Instructions for each major card network (Visa, Mastercard, Amex)
4. User contacts card issuer with the package

**Note**: Orbit does not initiate disputes directly (requires card issuer API integration, which is a Phase 2 feature). Orbit provides the evidence; user submits it.

---

## False Positive Reduction

- **User feedback loop**: "Was this charge unexpected?" Yes/No. Learn from responses.
- **Merchant whitelist**: User can mark a merchant as "always expected" — suppresses future alerts
- **Amount tolerance**: User-configurable. Default ±$2.00 is expected variation (tips, taxes)
- **Pattern learning**: After 30+ transactions from a merchant, system understands its charge patterns

---

## Implementation Plan

### Phase 1 (immediately implementable with Plaid data)
- Duplicate charge detection
- Price increase detection (requires 60+ days of history)
- Charge after cancellation
- New recurring charge detection

### Phase 2
- Unusual amount detection (requires statistical baseline — 90+ days of data)
- Geographic anomaly (requires merchant location enrichment)
- ML-based behavioral anomaly scoring

---

## Data Model

```sql
CREATE TABLE anomaly_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  transaction_id TEXT REFERENCES transactions(id),
  type TEXT NOT NULL CHECK (type IN (
    'duplicate_charge', 'price_increase', 'charge_after_cancellation',
    'unusual_amount', 'new_recurring', 'geographic_anomaly', 'overnight_activity'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  merchant_name TEXT,
  amount_cents INTEGER,
  expected_amount_cents INTEGER,    -- for price increase alerts
  comparison_transaction_id TEXT,   -- for duplicate charge alerts
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'disputed', 'dismissed', 'false_positive')),
  dismissed_at INTEGER,
  created_at INTEGER NOT NULL
);
```

---

## Agent Integration

The agent can proactively surface anomaly alerts in conversation:
- "I noticed [Merchant] charged you $14.99 on both March 3rd and March 4th. That looks like a duplicate. Want me to prepare a dispute?"
- "Your internet bill went up $12/month. This happened 3 days ago. Want me to try to negotiate it back down?"

---

## Success Metrics

| Metric | Target |
|---|---|
| Duplicate charge detection rate | >95% of true duplicates |
| Price increase detection rate | >99% (rule-based, deterministic) |
| False positive rate | <10% of all alerts |
| Avg time from charge to alert | <6 hours (polling) / <1 min (webhook) |
| Dispute initiation rate from critical alerts | >40% |
| Dollars recovered per active user per year | >$50 |
| User-reported "detected before I noticed" | >80% of acted-upon alerts |

---

## Dependencies

- PRD-005 (Real Account Linking) — Plaid transaction data required
- PRD-006 (Notifications) — alert delivery
- PRD-025 (Price Memory) — price increase baseline tracking
- PRD-009 (Subscription Cancellation) — charge-after-cancellation detection
- PRD-048 (Webhooks) — real-time detection (vs. polling lag)
