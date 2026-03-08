# PRD-013 — Paycheck Auto-Splitter

**Priority**: P1
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

When a paycheck lands, users must manually distribute money to bills, savings, investments, and spending. This is tedious and easy to forget, leading to missed bills or under-funded savings. The agent should detect incoming deposits and auto-allocate funds according to user-defined rules and upcoming obligations.

---

## Key Ideas

- **Deposit detection**: automatically recognize paycheck and other income deposits
- **Allocation rules**: user sets % or fixed-amount splits per bucket
- **Priority ordering**: bills first, then savings, then discretionary
- **Bills-first mode**: automatically reserve enough for upcoming bills before splitting
- **Dynamic allocation**: adjust splits based on upcoming expenses and cash flow forecast
- **Overflow to yield**: route leftover funds to yield-bearing accounts
- **Split visualization**: clear breakdown showing where every dollar went

---

## Success Metrics

| Metric | Target |
|---|---|
| Users with active split rules | >35% of users with linked accounts |
| Bills funded on time via auto-split | >95% |
| Avg time from deposit to allocation | <1 hour |
| User override rate (manual adjustment after split) | <20% |
| Savings rate improvement vs. pre-split | >10% increase |
