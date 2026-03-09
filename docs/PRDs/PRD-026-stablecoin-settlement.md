# PRD-026 — Stablecoin Settlement Layer

**Priority**: P2
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

In 2026, stablecoins are mainstream infrastructure. The GENIUS Act established a federal stablecoin framework. Circle's USDC is SEC-regulated. The rails are ready. Orbit can route bill payments and yield sweeps over stablecoin infrastructure to deliver instant, near-zero-cost settlement — all without users knowing or caring that USDC is involved.

---

## Problem Statement

Traditional payment rails have fundamental limitations:
- **ACH standard**: 1-3 business days to settle
- **ACH same-day**: ~$0.25–0.50 extra, still 10 hours
- **RTP (Real-Time Payments)**: Instant, but limited network coverage and higher fees
- **Wire**: $15–25 fee, business-hours only

For Orbit's use cases — bill payment, yield sweeps, emergency fund moves — these delays create user friction and reduce the value proposition. A payment "sent" today that doesn't appear for 2 days is a worse experience than a payment that settles in seconds.

Stablecoin infrastructure (specifically USDC on Ethereum, Base, or Solana) offers:
- Instant settlement (seconds, not days)
- Near-zero transaction cost ($0.001–0.10)
- 24/7/365 availability (no banking hours)
- Programmable (auto-sweep triggers, yield protocol integration)

---

## Regulatory Context (2026)

The landscape has clarified significantly:

### GENIUS Act (Guiding and Establishing National Innovation for US Stablecoins)
- Establishes federal licensing for stablecoin issuers
- USDC issued by Circle operates under this framework
- Requires 1:1 backing by cash or short-term Treasuries
- Gives consumers a clear legal framework for holding USDC

### CFPB Rule 1033 (Open Banking)
- Establishes consumer data rights — financial data portability
- Long-term: reduces dependence on data aggregators like Plaid
- Near-term: no direct impact on stablecoin settlement

### Money Transmitter Licensing
- Moving value in stablecoin form still requires MTL in most states
- Partnership with licensed processor (Circle, Coinbase) handles this
- OR: Orbit uses Circle's USDC API as a technology layer; licensed partner holds customer funds

### FDIC Coverage
- Stablecoin holdings are NOT FDIC insured
- For any product marketed as savings/yield, must clearly disclose this
- Mitigation: partner with FDIC-insured custodian for user-facing balance; stablecoin is internal routing only

---

## Architecture

### Internal Rails (user never sees stablecoins)

```
User's checking account
  → ACH debit (Plaid Transfer, ~1-3 days)
  → Orbit custodial account (FDIC-insured, banking partner)
  → Internal: convert to USDC
  → Route payment via USDC to biller's custodial account
  → Biller receives USD (converted back from USDC)

User sees: "Payment sent ✓"
Biller sees: Standard USD bank transfer
```

Or more simply for yield sweeps:
```
User's float determination → sweep to USDC → deposit into yield protocol → earn APY
```

The stablecoin layer is entirely invisible. Users see APY and settled payments; they never interact with crypto at all.

### Yield via DeFi Protocols
- USDC deposited into Coinbase Institutional (cbUSDC), earning ~4-5% APY
- Or Aave/Compound lending market
- Or Circle's own yield product
- APY shown to user as simple "4.8% APY" — no mention of DeFi

### Bill Payment via Stablecoin
Requires billers to accept USDC payments OR a conversion step at their end:
- Option A: Partner with bill payment platform that accepts USDC (Spruce, Request Finance)
- Option B: Internal conversion — Orbit holds USDC, converts to ACH at settlement
- Option B is simpler for MVP (no biller cooperation needed)

---

## Implementation Phases

### Phase 1 (Yield only)
- Convert swept funds to USDC
- Deposit in Circle Mint for yield
- Show user their APY balance
- No user-facing crypto — purely internal

**Requires**: Circle API access, USDC custody arrangement, MTL or partner license

### Phase 2 (Bill payment speed improvement)
- Use USDC for internal routing of payments
- Instant internal settlement vs. 3-day ACH wait
- Convert back to fiat at biller end

**Requires**: Biller-side integration or conversion partner

### Phase 3 (P2P stablecoin for household mode)
- Instant transfers between Orbit users (e.g., shared expense settlement)
- No bank involved for user-to-user transfers
- PRD-028 Household Mode integration

---

## Risks

| Risk | Mitigation |
|---|---|
| Stablecoin de-peg event | Use only regulated, reserve-backed stablecoins (USDC). Automatic fallback to ACH. |
| Smart contract vulnerability | Only use audited, established protocols (Aave, Compound). Size limits on any single protocol. |
| Regulatory change | Modular architecture — swap stablecoin layer without changing user-facing product |
| User confusion about crypto | Never expose crypto to users. APY and USD only. |
| FDIC gap | Clear disclosure; keep FDIC-insured ACH path as default; stablecoin opt-in only |

---

## Success Metrics

| Metric | Target |
|---|---|
| Settlement time vs. ACH (for eligible payments) | <1 minute vs. 1-3 days |
| Yield APY improvement vs. HYSA baseline | >0.5% |
| Transaction cost vs. ACH | <$0.05 vs. $0.25+ |
| User-facing complexity (crypto mentions) | 0 |
| Regulatory incident rate | 0 |

---

## Dependencies

- PRD-046 (Real ACH Money Movement) — baseline money movement must be live first
- PRD-010 (Yield Optimization) — stablecoin is a yield vehicle
- Circle USDC API partnership
- Banking partner for custodial account with FDIC coverage
