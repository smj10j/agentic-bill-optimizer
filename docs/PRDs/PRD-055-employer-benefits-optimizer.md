# PRD-055 — Employer Benefits Optimizer

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

The average employee leaves $1,300–3,000/year of employer benefits uncaptured — 401(k) match not fully taken, FSA dollars forfeited, ESPP discounts ignored, HSA space unused. These are free money opportunities that require only behavioral change. Orbit identifies the gaps and helps users capture every dollar.

---

## Problem Statement

Employer benefits are a form of compensation that employees systematically fail to maximize:

- **401(k) match**: ~25% of employees don't contribute enough to capture their full employer match — leaving an average of $1,336/year on the table (Vanguard data)
- **FSA "use-it-or-lose-it"**: $400M+ in FSA dollars forfeited annually in the US because employees forget to spend down their balance
- **HSA under-contribution**: Only 13% of eligible employees max out their HSA. The triple tax advantage (pre-tax contribution, tax-free growth, tax-free withdrawal for medical) is the best tax-advantaged vehicle available
- **ESPP**: Many employees in companies with Employee Stock Purchase Plans don't participate despite the guaranteed discount (typically 15% of market price = 17.6% instant return)
- **EAP / Supplemental Benefits**: Gym reimbursements, mental health benefits, professional development stipends, commuter benefits — often known but not claimed

---

## Detection Approach

### From Transaction Data
- Payroll deposit patterns → infer income level and employer
- HSA contributions (deposits to HSA-labeled accounts)
- FSA payroll deductions (inferred from paycheck amount patterns)
- ESPP purchases (periodic stock purchases, often quarterly)

### From User Input
Benefits optimization requires knowing the user's benefits package. Options:
1. **User uploads benefits summary** (PDF) → Claude extracts key fields
2. **Structured intake form**: Match rate, FSA/HSA election, ESPP participation
3. **HR system integration** (Phase 2 — Workday, BambooHR, etc.)

---

## Features

### 1. 401(k) Match Gap Calculator
```
user_annual_income × employer_match_rate × (1 - user_contribution_rate / match_threshold_rate)
= uncaptured_match_dollars
```

Example: $80K salary, 4% match up to 6% employee contribution, user contributing 3% →
Missing 3% contribution × $80K = $2,400 of pre-tax money, matched by $2,400 employer = **$4,800 total missed**

Visual: "You're leaving $2,400 of your employer's money unclaimed each year. Increasing your contribution by 3% would cost you ~$173/month after tax."

### 2. FSA Spend-Down Assistant
Track FSA balance and remaining days in benefit year:
- Automatic alert: "Your FSA has $340 remaining with 28 days left in the plan year. It expires January 1."
- Spend suggestions: eligible expenses the user may have overlooked (prescription glasses, first aid supplies, dental work, massages at eligible providers)
- Eligible expense lookup: "Is [item] FSA-eligible?" → quick answer

### 3. HSA Optimization
For users with HSA accounts:
- Current vs. maximum contribution gap ($4,300 individual / $8,550 family in 2026)
- Investment recommendation: "If you have more than 3 months of medical expenses saved, consider investing your HSA balance" — HSA invested in index funds is the triple-tax-advantaged savings vehicle
- Future medical expenses projection: "At your current medical spend rate, your HSA balance is 4.2× your annual medical costs — consider investing the excess"

### 4. ESPP Participation Nudge
If ESPP is detected (periodic stock purchases from paycheck deductions or brokerage account):
- Confirm participation: "We see what looks like an ESPP purchase. Are you participating in your company's stock purchase plan?"
- If not enrolled: "ESPPs typically offer a 15% discount on your company's stock. That's a 17.6% instant return before you even think about the stock's performance. Most financial advisors recommend maxing this out."
- Immediate sale strategy: for risk-averse users, explain the "sell immediately after purchase period" approach

### 5. Benefits Audit Checklist
Annual prompt (at open enrollment time, typically Oct–Nov):
- 401(k): Are you capturing full match?
- HSA/FSA: Which is right for you? Max out?
- Life insurance: Is employer-provided coverage sufficient?
- Disability: Long-term disability coverage adequate?
- Dental/Vision: Are you using your benefits?
- EAP: What's included in your Employee Assistance Program?
- Other: commuter, gym, professional development, childcare FSA

---

## Open Enrollment Intelligence

The optimal time to surface this is October–November (most companies have open enrollment then):
- "Open enrollment season — let's make sure you're not leaving money on the table"
- Review current elections against recommendations
- Estimate annual impact of each change

---

## Data Model

```sql
CREATE TABLE employer_benefits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  benefit_type TEXT NOT NULL CHECK (benefit_type IN (
    '401k', 'hsa', 'fsa', 'espp', 'commuter', 'gym', 'professional_dev', 'other'
  )),
  employer_contribution_pct REAL,    -- for 401k match
  employee_contribution_pct REAL,
  max_contribution_cents INTEGER,    -- annual limit
  current_contribution_cents INTEGER,
  gap_cents INTEGER,                 -- uncaptured amount
  benefit_year_end INTEGER,          -- for FSA spend-down
  last_reviewed_at INTEGER,
  created_at INTEGER NOT NULL
);
```

---

## Success Metrics

| Metric | Target |
|---|---|
| 401(k) match gap identified per user | >70% of eligible users |
| Users who increase 401(k) after Orbit recommendation | >20% |
| FSA balance forfeited after Orbit activation | <$50 avg (vs. ~$340 avg without) |
| HSA contribution increase per user | >$500 avg |
| ESPP participation rate among Orbit users (vs. national avg 55%) | >80% |
| Annual incremental benefits captured per user | >$1,000 avg |

---

## Dependencies

- PRD-005 (Real Account Linking) — payroll deposit detection, HSA/FSA balance visibility
- PRD-049 (Tax Optimization) — HSA triple-tax-advantage education, FSA pre-tax savings
- PRD-031 (Income Analysis) — employer/income detection
