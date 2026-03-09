# PRD-049 — Tax Optimization & Self-Employment Tools

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Tax is the single largest expense in most people's financial lives, yet personal finance apps largely ignore it. With access to a full year of real transaction data, Orbit can identify deductible expenses, estimate quarterly tax liability, flag tax-advantaged contribution opportunities, and prepare a clean summary for tax filing — saving users money and eliminating anxiety.

---

## Problem Statement

Tax pain points by user segment:

**W-2 employees**:
- Forget to track charitable donations, home office deductions, or medical expenses
- Miss HSA/FSA/401k contribution optimization (leaving tax-advantaged space unfilled)
- Get surprised by a large tax bill because they had side income and didn't adjust withholding

**Self-employed / 1099 workers** (36% of US workforce):
- Quarterly estimated taxes (April 15, June 15, Sept 15, Jan 15) are perpetually confusing
- Mixing personal and business expenses without discipline
- No automatic tracking of deductible business expenses
- SE tax (self-employment tax = 15.3% on top of income tax) surprises many new freelancers

**Everyone**:
- Year-end scramble to gather documents, receipts, and records
- No single place that ties spending data to tax implications

---

## Feature Set

### 1. Deductible Expense Detection (Automated)
Scan transactions for categories that are commonly deductible:

| Category | Deductibility | Conditions |
|---|---|---|
| Home office | Partial | Self-employed, dedicated space |
| Business meals | 50% | Business purpose, not lavish |
| Professional subscriptions | 100% | Used for work (Adobe, GitHub, etc.) |
| Phone/internet | Partial | Business use percentage |
| Vehicle mileage | Per-mile rate | Business trips |
| Health insurance premiums | 100% | Self-employed |
| Retirement contributions | Full | Up to limits |
| Charitable donations | Full | To 501(c)(3) organizations |
| Education (work-related) | Full | Directly related to current job |

For each flagged transaction, the agent marks it as "potentially deductible" and asks for confirmation. Confirmed deductions accumulate in a running total.

**Implementation**: Transaction categorization already exists (from Plaid + `category` field). Add a `tax_deductible` flag and `deductible_percentage` to transactions.

### 2. Quarterly Estimated Tax Calculator (Self-Employed)
If Orbit detects 1099-pattern income (large irregular deposits from businesses, not employers):

```
quarterly_liability ≈ (
  ytd_net_income × effective_tax_rate
  + ytd_net_income × 0.9235 × 0.153 (SE tax)
  - ytd_withholding
  - ytd_estimated_payments_made
) / remaining_quarters
```

Shows:
- "Your next estimated tax payment (June 15) is approximately $2,840"
- "You should set aside $947/month from now until then"
- Auto-sweep to a tax reserve bucket from each deposit (if yield sweep is active)

### 3. Tax Reserve Account
For self-employed users: automatic percentage of each deposit goes to a "Tax Reserve" bucket in the yield position.

- Default: 25-30% of each 1099-type deposit
- User configures their own rate
- Always shown separately from spendable balance
- "Your tax reserve: $4,200 (estimated liability: $3,800 — you're on track)"

### 4. Tax-Advantaged Contribution Optimizer
Review annual limits and current contributions:

| Account | 2026 Limit | Common Gap |
|---|---|---|
| 401(k) / 403(b) | $23,500 | Under-contribution |
| IRA (Traditional or Roth) | $7,000 | Often unfilled |
| HSA (HDHP required) | $4,300 individual / $8,550 family | Rarely maxed |
| FSA | $3,300 | Use-it-or-lose-it, often forgotten |
| SEP-IRA (self-employed) | 25% of net self-employment income | Most don't use |

Agent surfaces: "You've contributed $8,000 to your 401k this year. You could contribute up to $23,500 — that's $15,500 more of pre-tax money available."

### 5. Year-End Tax Summary
Export a clean, organized report in January:

- Total income by source
- All identified deductible expenses by category
- Charitable donation list
- Tax-advantaged contributions
- Formatted for easy hand-off to CPA or import into TurboTax/H&R Block
- Support for exporting to CSV or PDF

### 6. Withholding Adjustment Assistant
For W-2 employees with side income or life changes (new baby, bought a house):
- Estimate current-year tax liability
- Compare to withholding on track
- "You have a $1,200 projected shortfall. Update your W-4 to withhold $100/paycheck more, or make an estimated payment by January 15."

---

## Data Model

```sql
ALTER TABLE transactions ADD COLUMN tax_deductible INTEGER DEFAULT 0;  -- 0/1
ALTER TABLE transactions ADD COLUMN deductible_percentage REAL DEFAULT 0.0;
ALTER TABLE transactions ADD COLUMN deductible_category TEXT;
  -- 'home_office', 'business_meal', 'professional_sub', etc.
ALTER TABLE transactions ADD COLUMN tax_year INTEGER;

CREATE TABLE tax_estimates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tax_year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter IN (1, 2, 3, 4)),
  estimated_liability_cents INTEGER,
  payments_made_cents INTEGER DEFAULT 0,
  due_date INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, tax_year, quarter)
);

CREATE TABLE tax_deduction_categories (
  user_id TEXT NOT NULL REFERENCES users(id),
  merchant_pattern TEXT NOT NULL,
  deductible_category TEXT NOT NULL,
  deductible_percentage REAL NOT NULL,
  confirmed_by_user INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, merchant_pattern)
);
```

---

## Privacy and Accuracy Disclaimer

Orbit is not a tax advisor. All estimates are for planning purposes only:
- "This is an estimate to help you plan. Verify with a CPA for your actual filing."
- No guarantee of deductibility without knowing full tax situation
- IRS rules change annually — keep deduction guidance current

---

## Success Metrics

| Metric | Target |
|---|---|
| Deductible transactions identified per user/year | >$500 average |
| Self-employed users with active tax reserve | >60% of detected freelancers |
| Quarterly payment reminders acted on (timely) | >80% |
| Year-end report export rate | >50% of active users |
| CPA handoff satisfaction (clean data) | >4.0/5.0 |
| Underpayment penalty avoidance rate | >90% for users with active estimates |

---

## Dependencies

- PRD-005 (Real Account Linking) — full transaction history required
- PRD-013 (Paycheck Splitter) — tax reserve sweep on deposits
- PRD-031 (Income Analysis) — income pattern for tax classification
- PRD-010 (Yield Optimization) — tax reserve stored in yield position
