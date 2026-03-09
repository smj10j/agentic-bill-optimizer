# PRD-054 — Medical Bill Optimizer

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Medical bills are the most common source of financial surprise in the US and among the most opaque. Most people overpay because they don't know to challenge errors, request charity care, or negotiate before paying. Orbit can detect medical bills from transactions, flag errors, and help users recover money they overpaid — a category that no personal finance app touches meaningfully.

---

## Problem Statement

Medical debt is the #1 cause of personal bankruptcy in the US. But the problem isn't just catastrophic bills — it's the slow drain of systematic overpayment on ordinary medical charges:

- **Billing errors**: Studies consistently find 30–80% of medical bills contain errors (wrong procedure codes, unbundling, duplicate charges)
- **Charity care**: Most non-profit hospitals (which are ~60% of US hospitals) are legally required to offer income-based financial assistance — but almost no one knows to apply
- **Negotiation works**: Medical bills are more negotiable than almost any other consumer expense. A direct ask for a cash-pay discount often yields 20–40% reduction
- **Balance billing surprises**: Patients receive out-of-network bills they didn't anticipate, often for amounts exceeding legal limits (No Surprises Act)
- **EOB mismatch**: Insurance Explanation of Benefits doesn't always match the actual bill; excess charges are common and rarely caught

---

## Features

### 1. Medical Bill Detection
Identify medical charges from transaction data:
- Merchant categories: `HEALTHCARE`, `HOSPITAL`, `PHYSICIAN`, `PHARMACY`
- Known provider name patterns: medical groups, hospital systems, labs, imaging centers
- Amount patterns: irregular large amounts typical of medical bills

When detected: "We see a $480 charge from [Medical Group]. Would you like Orbit to review this bill for you?"

### 2. Itemized Bill Request Assistance
Walk users through requesting an itemized bill (required by law):
- Generate a request letter for the specific provider
- Explain what to look for in the itemized bill
- Checklist of common error types to watch for

### 3. Common Error Detection
If user uploads or photos their bill:
- Check for common error patterns using Claude's document understanding:
  - Upcoding: procedure code billed at higher complexity than documented
  - Unbundling: separate charges for services that should be bundled
  - Duplicate charges: same service billed twice
  - Non-covered services: items that should be covered by insurance
  - Incorrect patient or date information

### 4. Charity Care Navigator
For large bills at non-profit hospitals:
- Identify if the hospital is non-profit (nonprofit lookup database)
- Research the hospital's charity care policy (threshold is typically 200–400% of federal poverty level)
- Generate a charity care application with pre-filled user data
- Follow up on application status

**Impact**: Charity care can reduce or eliminate bills entirely for eligible patients. Income thresholds are often higher than people assume.

### 5. Cash-Pay Negotiation
For self-pay patients (no insurance, or high-deductible):
- Script for requesting a cash-pay discount (typically 20–40%)
- Provider-specific negotiation notes (hospital systems often have posted cash-pay discounts)
- Compare to Medicare rates (a useful benchmark: "Medicare pays $X for this service")

### 6. No Surprises Act Compliance Check
When an unexpected out-of-network bill arrives:
- Check if the No Surprises Act (2022) applies (emergency care, surprise OON billing)
- If applicable, generate a dispute letter citing federal protections
- Connect user to Independent Dispute Resolution (IDR) process if needed

### 7. Payment Plan Optimization
For large bills:
- Request payment plan with 0% interest (most providers offer this if asked)
- Identify if the bill qualifies for medical credit cards (CareCredit, Synchrony Health)
- Calculate whether paying off vs. payment plan makes more financial sense

---

## User Flow

```
1. Transaction detected: $1,240 from "Regional Medical Center"

2. Orbit: "This looks like a medical bill. Medical bills have a 30-80% error rate and
   many hospitals have charity care programs. Want me to help you review this?"

3. User selects concern: Billing error / Too expensive / Don't understand it

4. [Billing error path]:
   → Request itemized bill
   → Review for common errors
   → Draft dispute letter if errors found
   → Track outcome

5. [Too expensive path]:
   → Is this a non-profit hospital? → Charity care application
   → Cash-pay discount request
   → Payment plan negotiation
   → Track savings

6. Outcome tracked: "$480 bill reduced to $240 — saved $240 ✓"
```

---

## Data Model

```sql
CREATE TABLE medical_bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  transaction_id TEXT REFERENCES transactions(id),
  provider_name TEXT NOT NULL,
  original_amount_cents INTEGER NOT NULL,
  final_amount_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected', 'reviewing', 'disputed', 'negotiating', 'resolved', 'ignored')),
  error_found INTEGER DEFAULT 0,
  charity_care_eligible INTEGER DEFAULT 0,
  savings_cents INTEGER DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL
);
```

---

## Regulatory Notes

- Requesting itemized bills is a legal right (HIPAA)
- Charity care applications are governed by IRS 501(r) rules for non-profits
- No Surprises Act (2022) provides federal protection against certain surprise bills
- Orbit is not providing medical advice — only financial/billing guidance

---

## Success Metrics

| Metric | Target |
|---|---|
| Medical bills detected per user per year | Avg 2–4 |
| Itemized bill request rate among flagged bills | >40% |
| Error discovery rate | >25% of reviewed itemized bills |
| Savings per resolved case | >$150 avg |
| Charity care applications generated | >20% of eligible detections |
| User satisfaction with medical bill assistance | >4.5/5.0 |

---

## Dependencies

- PRD-005 (Real Account Linking) — medical transaction detection
- PRD-047 (Computer Use Agent) — charity care application automation, dispute letter submission
