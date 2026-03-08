# PRD-005 — Real Account Linking

**Priority**: P0
**Status**: In Review
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

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

**Adapter pattern**: All Plaid calls are wrapped in a `FinanceAdapter` interface (already defined in the codebase). Swapping to MX, Finicity, or Yodlee requires only a new adapter implementation.

### Fallback: Manual Entry
For institutions not covered by Plaid, users can manually enter:
- Account type and balance
- Recurring bills (name, amount, due date)

Manual accounts get reduced functionality (no transaction history, no anomaly detection) but still receive bill reminders, yield advice, and agent chat access.

---

## Data Flows

### Initial Connection
```
1. User clicks "Add Account"
2. Frontend requests link_token from our API
   POST /api/v1/accounts/link/token
   → Plaid creates link_token (expires 30 min)

3. Plaid Link modal opens in-browser (Plaid's hosted UI)
   - User searches for institution
   - User authenticates (password, OAuth, MFA)
   - Plaid returns public_token to our callback

4. Frontend sends public_token to our API
   POST /api/v1/accounts/link/exchange
   → Server exchanges public_token for access_token (server-to-server, never touches client)
   → access_token stored encrypted in KV
   → item_id stored in D1 accounts table

5. Orbit fetches initial data:
   - Accounts (balances, types, names)
   - Transactions (90 days)
   - Liabilities (credit cards, loans)
   → Stored in D1

6. First insight generated and delivered within 2 minutes
```

### Ongoing Sync
- **Plaid Webhooks** (primary): `TRANSACTIONS_SYNC`, `DEFAULT_UPDATE`, `INITIAL_UPDATE`
  - Webhook received → validate Plaid signature → queue sync job → fetch delta transactions
- **Polling fallback**: If webhooks fail, poll every 6 hours
- **Balance refresh**: On-demand when user opens app (stale if > 30 min old)

---

## Data Model Extensions

```sql
-- accounts table additions for real linking:
ALTER TABLE accounts ADD COLUMN plaid_item_id TEXT;
ALTER TABLE accounts ADD COLUMN plaid_account_id TEXT;
ALTER TABLE accounts ADD COLUMN institution_name TEXT;
ALTER TABLE accounts ADD COLUMN institution_id TEXT;
ALTER TABLE accounts ADD COLUMN connection_status TEXT DEFAULT 'healthy';
  -- healthy | degraded | error | requires_reauth | disconnected
ALTER TABLE accounts ADD COLUMN last_synced_at INTEGER;
ALTER TABLE accounts ADD COLUMN linked_at INTEGER;

-- New table: plaid_items (one per bank connection, may have multiple accounts)
CREATE TABLE plaid_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT UNIQUE NOT NULL,
  -- access_token stored in KV, NOT here (never in D1)
  institution_id TEXT,
  institution_name TEXT,
  status TEXT DEFAULT 'healthy',
  error_code TEXT,
  last_webhook_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Security**: Plaid `access_token` values are stored exclusively in KV with AES-256-GCM encryption. They are never written to D1, never logged, and never sent to the client. KV key format: `plaid:token:{item_id}`.

---

## Connection Health & Recovery

### Status Model

| Status | Meaning | User Action Required |
|---|---|---|
| `healthy` | Data syncing normally | None |
| `degraded` | Partial sync failures; retrying | None (auto-recovery) |
| `error` | Institution unreachable | None (auto-retry with backoff) |
| `requires_reauth` | User re-authentication needed | Yes — guided flow |
| `disconnected` | User disconnected account | None |

### Plaid Error Codes → User Actions

| Plaid Error | Status | User Notification |
|---|---|---|
| `ITEM_LOGIN_REQUIRED` | `requires_reauth` | "Chase needs you to re-verify. Tap to reconnect." |
| `INSTITUTION_DOWN` | `degraded` | "Your bank's connection is slow. We'll retry shortly." (no action needed) |
| `INVALID_CREDENTIALS` | `requires_reauth` | "Something changed with your bank login. Re-connect?" |
| `PRODUCT_NOT_READY` | `degraded` | Silent; retry in 1 hour |
| `NO_ACCOUNTS` | `error` | "We couldn't find any accounts. Check your bank's app." |

### Re-authentication Flow
1. Notification: "Your Chase connection needs attention"
2. User taps → in-app prompt: "Your Chase connection expired. Banks require periodic re-verification."
3. Plaid Link opens in update mode (preserves existing item, just re-auths)
4. On success: status → `healthy`, data resync triggered

**Re-auth reminders**: Sent 7 days before expiry (if Plaid provides expiry metadata), then 1 day before, then on expiry.

---

## Account Types Supported

| Account Type | Data | Orbit Features |
|---|---|---|
| Checking | Transactions, balance | Full (bills, spend, yield, anomaly) |
| Savings | Balance, transactions | Yield advice, balance tracking |
| Credit Card | Transactions, statement balance, due date, minimum | Bill pay, spend analysis, debt optimizer |
| Mortgage | Balance, monthly payment, due date | Bill reminders (never exploit grace — too high risk) |
| Auto Loan | Balance, payment, due date | Bill reminders |
| Student Loan | Balance, payment, due date | Debt optimizer integration |
| Investment | Balance (read-only) | Net worth display only; no transactions |

---

## Privacy & Data Governance

- **Purpose limitation**: Financial data is used only to deliver Orbit's features. Never sold, never used for advertising.
- **Minimum data**: Only request Plaid products needed. No identity verification unless user-initiated.
- **Disconnection**: User can disconnect any account at any time. On disconnect: access_token deleted from KV, account marked disconnected in D1. Raw transaction data deleted after 90 days.
- **Data residency**: All data stored in Cloudflare D1/KV (US region for MVP).
- **Breach response**: Full incident response plan in `docs/SECURITY.md`.

---

## Multi-Account Support

Users can link multiple accounts across multiple institutions:
- Up to 10 accounts per user (MVP limit; can be raised)
- Primary account designation (for yield sweeps and bill pay)
- Per-account visibility toggle (exclude an account from Orbit's view)
- Cross-account balance aggregation for net worth and float calculation

---

## Institution Coverage

Plaid covers the top 12,000+ US institutions. For MVP:
- All major national banks: covered
- Top 100 credit unions: covered
- Smaller regional banks: best-effort
- Credit cards (issued by major banks): covered via same institution link

For uncovered institutions: manual entry fallback (see above) + "Notify me when [Institution] is supported" waitlist.

---

## Cost Considerations

Plaid pricing (approximate):
- Transactions product: ~$0.10–0.20 / active item / month
- Auth product (for payment initiation): ~$0.30 / item / month
- Liabilities product: ~$0.10 / item / month

At 1,000 active users with 1.5 accounts each:
- ~1,500 items × $0.40/month = **~$600/month**

This is acceptable at MVP scale. At 10K users ($6K/month), begin evaluating volume discounts or alternatives (MX, Finicity).

---

## Open Questions — Resolved

**Q: Should we build our own screen scraping as a fallback for unsupported institutions?**
A: No. Screen scraping violates most bank ToS, creates maintenance burden, and creates serious security liability. Manual entry is the right fallback for unsupported institutions.

**Q: How do we handle OAuth-based institutions (Chase, Capital One, etc.)?**
A: Plaid Link handles OAuth transparently. When the user selects an OAuth institution, Plaid redirects them to the bank's own login page and back. We implement one OAuth redirect callback URL (`/api/v1/plaid/oauth/callback`) and Plaid handles the rest.

**Q: What happens to a user's data if they delete their Orbit account?**
A: Full deletion: Plaid access tokens revoked (via Plaid API), all D1 data deleted, KV cleared, email sent confirming deletion. Process completes within 30 days (gives time for any in-flight transactions to settle).

**Q: Do we need PCI DSS compliance?**
A: No. We never handle raw card numbers or CVVs. Plaid handles all credential management. We are PCI-DSS out of scope.

**Q: How do we handle users with no bank account (unbanked)?**
A: Significant US population segment (~5%). For MVP, manual entry is the path. Longer term: prepaid card support, cash app account linking if Plaid supports it. This is worth a dedicated PRD.

---

## Success Metrics

| Metric | Target |
|---|---|
| Account link success rate (first attempt) | >85% |
| Avg time from "Add Account" click to first insight | <3 minutes |
| Connection uptime (% of items in healthy/degraded status) | >99% |
| Data freshness (time since last successful sync) | <6 hours for 95% of users |
| Re-auth completion rate when prompted | >70% |
| Users who link 2+ accounts | >40% |
| Manual entry fallback usage | <15% of linked accounts |
| Disconnection rate (30 days after link) | <10% |
