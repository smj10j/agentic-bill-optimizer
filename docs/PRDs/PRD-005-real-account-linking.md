# PRD-005 — Real Account Linking

**Priority**: P0
**Status**: Implemented (Phase 1) — Phase 2 deferred
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## What Was Built (Phase 1 — Deployed)

- `GET /api/v1/accounts/link/token` — returns real Plaid `link_token` (falls back to mock stub if credentials not set)
- `POST /api/v1/accounts/link/exchange` — full exchange flow: public_token → access_token (stored in KV) → fetch accounts → upsert to D1 → background transaction sync
- `DELETE /api/v1/accounts/:id/disconnect` — soft-delete with `connection_status = 'disconnected'`
- `POST /api/v1/accounts/:id/sync` — on-demand balance refresh via Plaid
- Migrations: `0004_plaid_accounts.sql` (Plaid columns, `plaid_items` table), `0008_account_fixes.sql` (partial unique index, dedup)
- `apps/api/src/lib/plaid.ts` — raw HTTP Plaid client (no Node.js SDK; Workers-compatible)
- `react-plaid-link` integration in Settings → Accounts
- Idempotent account upsert: `ON CONFLICT(plaid_account_id) WHERE plaid_account_id IS NOT NULL DO UPDATE SET`
- Idempotent `plaid_items` upsert: `ON CONFLICT(item_id) DO UPDATE SET status = 'healthy'`
- KV key: `plaid_access:{userId}:{itemId}` (never in D1)

---

## Vision

Real account linking is the bridge from demo to real product. Every valuable Orbit feature — smart bill pay, yield optimization, spending insights, anomaly detection — depends on seeing real financial data. This PRD specifies the architecture for securely connecting to users' accounts, keeping that connection healthy, and handling the full lifecycle of a linked account from first connection to voluntary disconnection.

---

## Problem Statement

The MVP runs on mock data. Users can see what Orbit would do with their finances, but can't experience what it actually does. Converting a curious user to an engaged one requires linking a real account and delivering a real insight within minutes. The account linking experience must be fast, trustworthy-feeling, and recover gracefully from the many ways bank connections can fail.

---

## Integration Approach

### Primary: Plaid

Plaid is the industry standard financial data aggregator with:
- 12,000+ US financial institutions
- Established OAuth flows for major banks (Chase, Bank of America, Wells Fargo, etc.)
- Webhook support for real-time transaction updates
- Liability product for credit cards, student loans, mortgages
- Identity product for name/email verification (optional)

**Adapter pattern**: All Plaid calls are wrapped behind a `FinanceAdapter` interface. Swapping to MX, Finicity, or Yodlee requires only a new adapter implementation. The raw HTTP client in `lib/plaid.ts` is deliberately thin — no SDK dependency.

### Fallback: Manual Entry
For institutions not covered by Plaid, users can manually enter:
- Account type and balance
- Recurring bills (name, amount, due date)

Manual accounts get reduced functionality (no transaction history, no anomaly detection) but still receive bill reminders, yield advice, and agent chat access.

---

## Phase 2 — Deferred

### Plaid Webhooks (PRD-048)
Currently polling only. Webhooks deliver real-time updates:
- `TRANSACTIONS_SYNC_UPDATES_AVAILABLE` → trigger transaction sync
- `ITEM_LOGIN_REQUIRED` → set `connection_status = 'requires_reauth'`, notify user
- `ITEM_ERROR` → set status based on error code

Requires a public webhook receiver endpoint, Plaid signature verification, and Cloudflare Queues (or Durable Objects) for durable processing.

### Re-authentication Flow
When `connection_status = 'requires_reauth'`:
1. Push notification: "Your [Bank] connection needs attention"
2. In-app prompt with guided re-auth CTA
3. Plaid Link opens in **update mode** (`update_mode: true`) — preserves existing item, just re-auths
4. On success: status → `healthy`, data resync triggered

Currently the UI shows the status badge but has no re-auth action.

### OAuth Redirect Callback
OAuth-first institutions (Chase, Capital One) redirect through the bank's own auth page. Requires a registered callback URL: `GET /api/v1/plaid/oauth/callback`. Not yet implemented.

### Multi-Account Management
- Primary account designation (for yield sweeps and bill pay)
- Per-account visibility toggle (exclude an account from Orbit's view)

### Connection Health Monitor
Automated health checks and error recovery with exponential backoff. Currently only on-demand sync.

---

## Data Flows

### Initial Connection (Implemented)
```
1. User clicks "Add Account"
2. GET /api/v1/accounts/link/token → Plaid link_token (30 min expiry)
3. Plaid Link modal opens, user authenticates
4. onSuccess(publicToken, metadata) → POST /api/v1/accounts/link/exchange
5. Server: exchangePublicToken → access_token stored in KV
6. Server: createPlaidItem → plaid_items record
7. Server: getPlaidAccounts → accounts upserted in D1
8. Background: syncTransactions (up to 500 txns, cursor stored in KV)
9. Response: { accountsLinked, accounts }
```

### Ongoing Sync (Phase 2)
- **Plaid Webhooks** (target): `TRANSACTIONS_SYNC`, `DEFAULT_UPDATE`, `INITIAL_UPDATE`
- **Polling fallback**: Manual sync via `POST /accounts/:id/sync`
- **Balance refresh**: On-demand when user opens Settings → Accounts

---

## Data Model (Implemented)

```sql
-- accounts table (migration 0004):
plaid_item_id TEXT
plaid_account_id TEXT
connection_status TEXT CHECK (IN ('healthy', 'degraded', 'error', 'requires_reauth', 'disconnected', 'manual'))
linked_at INTEGER

-- Partial unique index (migration 0008):
CREATE UNIQUE INDEX idx_accounts_plaid_account_id
  ON accounts(plaid_account_id) WHERE plaid_account_id IS NOT NULL;

-- plaid_items table (migration 0004):
CREATE TABLE plaid_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT UNIQUE NOT NULL,  -- ON CONFLICT DO UPDATE
  institution_id TEXT,
  institution_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy',
  error_code TEXT,
  last_webhook_at INTEGER,
  created_at INTEGER NOT NULL
);
```

**Security**: Plaid `access_token` values stored exclusively in KV (`plaid_access:{userId}:{itemId}`). Never written to D1, never logged, never sent to client.

---

## Connection Health & Recovery

### Status Model

| Status | Meaning | User Action Required |
|---|---|---|
| `healthy` | Data syncing normally | None |
| `degraded` | Partial sync failures; retrying | None (auto-recovery) |
| `error` | Institution unreachable | None (auto-retry with backoff) |
| `requires_reauth` | User re-authentication needed | Yes — re-auth flow (Phase 2) |
| `disconnected` | User disconnected account | None |
| `manual` | Manually entered account | None |

### Plaid Error Codes → User Actions

| Plaid Error | Status | User Notification |
|---|---|---|
| `ITEM_LOGIN_REQUIRED` | `requires_reauth` | "Your bank needs you to re-verify. Tap to reconnect." |
| `INSTITUTION_DOWN` | `degraded` | "Your bank's connection is slow. We'll retry shortly." |
| `INVALID_CREDENTIALS` | `requires_reauth` | "Something changed with your bank login. Reconnect?" |
| `PRODUCT_NOT_READY` | `degraded` | Silent; retry in 1 hour |
| `NO_ACCOUNTS` | `error` | "We couldn't find any accounts. Check your bank's app." |

---

## Account Types Supported

| Account Type | Data | Orbit Features |
|---|---|---|
| Checking | Transactions, balance | Full (bills, spend, yield, anomaly) |
| Savings | Balance, transactions | Yield advice, balance tracking |
| Credit Card | Transactions, statement balance, due date, minimum | Bill pay, spend analysis, debt optimizer |
| Mortgage | Balance, monthly payment, due date | Bill reminders |
| Auto Loan | Balance, payment, due date | Bill reminders |
| Student Loan | Balance, payment, due date | Debt optimizer |
| Investment | Balance (read-only) | Net worth display only |

---

## Privacy & Data Governance

- **Purpose limitation**: Financial data used only to deliver Orbit's features. Never sold, never used for advertising.
- **Minimum data**: Only request Plaid products needed. No identity verification unless user-initiated.
- **Disconnection**: User can disconnect any account at any time. On disconnect: access_token deleted from KV, account soft-deleted in D1. Raw transaction data deleted after 90 days per retention policy.
- **Data residency**: All data stored in Cloudflare D1/KV (US region for MVP).

---

## Cost Considerations

Plaid pricing (approximate, 2026):
- Transactions product: ~$0.10–0.20 / active item / month
- Auth product (for payment initiation): ~$0.30 / item / month
- Liabilities product: ~$0.10 / item / month

At 1,000 active users with 1.5 accounts each:
- ~1,500 items × $0.40/month = **~$600/month**

At 10K users ($6K/month): evaluate volume discounts or alternatives (MX, Finicity, direct 1033 connections).

---

## Success Metrics

| Metric | Target |
|---|---|
| Account link success rate (first attempt) | >85% |
| Avg time from "Add Account" click to first insight | <3 minutes |
| Connection uptime (% in healthy/degraded status) | >99% |
| Data freshness (time since last successful sync) | <6 hours for 95% of users |
| Re-auth completion rate when prompted | >70% |
| Users who link 2+ accounts | >40% |
| Manual entry fallback usage | <15% of linked accounts |
| Disconnection rate (30 days after link) | <10% |
