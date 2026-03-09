# PRD-048 — Plaid Webhooks & Real-Time Sync

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

The gap between a transaction happening and Orbit knowing about it determines how useful the product is in real-time. Right now Orbit polls — data can be hours stale. Webhooks deliver transaction updates within minutes of the bank posting them. Fast data enables fast alerts, proactive bill warnings, and real-time cash flow visibility.

---

## Problem Statement

Current state: Orbit syncs transactions only when:
1. A user manually taps "Sync" on their account
2. A new bank connection is added (background sync runs once)

This means:
- A fraudulent charge that happened 4 hours ago hasn't been detected yet
- A bill that just posted isn't reflected in the upcoming bills view
- The agent doesn't know a paycheck landed until the user tells it
- Anomaly detection (PRD-016) has a multi-hour lag, making it much less useful

Plaid's webhook system can push notifications to Orbit within minutes of new transaction data being available, turning Orbit from a polling system into a real-time one.

---

## Webhook Event Types

### Transaction Webhooks

| Event | Meaning | Action |
|---|---|---|
| `SYNC_UPDATES_AVAILABLE` | New transactions available since last cursor | Run `syncTransactions` with stored cursor |
| `INITIAL_UPDATE` | Initial transaction data (2-7 days) ready | Run initial sync |
| `HISTORICAL_UPDATE` | Full historical data (up to 24 months) ready | Run historical import |

### Item Webhooks (Connection Health)

| Event | Meaning | Action |
|---|---|---|
| `PENDING_EXPIRATION` | Access token will expire in 7 days | Notify user to re-auth |
| `USER_PERMISSION_REVOKED` | User revoked access at bank | Mark disconnected, notify |
| `ERROR: ITEM_LOGIN_REQUIRED` | Session expired, re-auth needed | Set `requires_reauth`, notify |
| `ERROR: INSTITUTION_DOWN` | Bank API unavailable | Set `degraded`, no user notification |

---

## Regulatory Tailwind: CFPB Section 1033

The CFPB's open banking rule (finalized October 2024) under Dodd-Frank Section 1033 requires banks to provide consumer financial data in standardized machine-readable formats to authorized third parties. Effective dates: largest banks by 2026, smaller institutions by 2027–2030.

**Impact on Orbit**:
- Legalizes and standardizes the data access that Plaid provides today
- Longer term: may allow Orbit to receive data directly from banks without a middleman, reducing Plaid dependency and cost
- Shorter term: banks must not block or degrade third-party data access, making webhook reliability better

---

## Architecture

### Webhook Receiver Endpoint
New route: `POST /api/v1/webhooks/plaid`

```typescript
router.post("/plaid", async (c) => {
  // 1. Verify Plaid webhook signature
  const signatureValid = await verifyPlaidSignature(c.req, c.env);
  if (!signatureValid) return c.json({ error: "Invalid signature" }, 401);

  const { webhook_type, webhook_code, item_id } = await c.req.json();

  // 2. Look up which user owns this item_id
  const plaidItem = await financeService.getPlaidItemByItemId(c.env.DB, item_id);
  if (!plaidItem) return c.json({ ok: true }); // unknown item, ignore

  // 3. Route to handler based on type
  if (webhook_type === "TRANSACTIONS") {
    await handleTransactionWebhook(c.env, plaidItem, webhook_code);
  } else if (webhook_type === "ITEM") {
    await handleItemWebhook(c.env, plaidItem, webhook_code, payload);
  }

  return c.json({ ok: true });
});
```

### Signature Verification
Plaid signs each webhook with a JWT. Verification:
```typescript
async function verifyPlaidSignature(req: Request, env: Env): Promise<boolean> {
  const plaidSignature = req.headers.get("Plaid-Verification");
  // Fetch Plaid's verification key from /webhook_verification_key/get
  // Verify JWT signature matches
  // Verify issued_at timestamp is within 5 minutes (replay protection)
}
```

### Durable Processing
Webhooks must acknowledge within 5 seconds. Processing (fetching transactions, running anomaly detection) may take longer. Use Cloudflare Queues to decouple:

```
Webhook received → validate signature → enqueue job → return 200

Queue consumer → fetch transactions → run anomaly detection → send notifications
```

If Cloudflare Queues isn't available: process inline but cap at 4 seconds with a background `waitUntil` for remaining work.

---

## Transaction Sync Cursor Management

Plaid's Transaction Sync uses a cursor for incremental updates:
- On each `SYNC_UPDATES_AVAILABLE` event, fetch using stored cursor
- Update cursor in KV: `plaid_cursor:{userId}:{itemId}`
- Process `added`, `modified`, and `removed` transactions

```typescript
async function syncWithCursor(env: Env, plaidItem: PlaidItem): Promise<void> {
  const cursor = await env.SESSIONS.get(`plaid_cursor:${plaidItem.userId}:${plaidItem.itemId}`);
  let hasMore = true;

  while (hasMore) {
    const resp = await plaidLib.syncTransactions(
      env.PLAID_CLIENT_ID, env.PLAID_SECRET,
      env.PLAID_ENV, accessToken, cursor ?? undefined
    );

    await financeService.insertTransactions(env.DB, resp.added.map(mapTransaction));
    await financeService.updateTransactions(env.DB, resp.modified.map(mapTransaction));
    await financeService.removeTransactions(env.DB, resp.removed.map(t => t.transaction_id));

    await env.SESSIONS.put(`plaid_cursor:${plaidItem.userId}:${plaidItem.itemId}`, resp.next_cursor);
    hasMore = resp.has_more;
    cursor = resp.next_cursor;
  }

  // Run anomaly detection on new transactions
  await runAnomalyDetection(env.DB, plaidItem.userId, resp.added);
}
```

---

## Connection Health Automation

When an ITEM webhook indicates a problem:

```typescript
async function handleItemWebhook(
  env: Env,
  plaidItem: PlaidItem,
  webhookCode: string,
  payload: Record<string, unknown>
): Promise<void> {
  switch (webhookCode) {
    case "PENDING_EXPIRATION":
      await financeService.updatePlaidItemStatus(env.DB, plaidItem.itemId, "requires_reauth");
      await notificationsService.notify(env.DB, plaidItem.userId, {
        type: "account_connection",
        title: "Account connection expiring",
        body: `Your ${plaidItem.institutionName} connection will expire in ${payload.consent_expiration_time}. Tap to re-connect.`,
        priority: "high",
      });
      break;

    case "USER_PERMISSION_REVOKED":
      await financeService.updatePlaidItemStatus(env.DB, plaidItem.itemId, "disconnected");
      await financeService.disconnectAccountsByItemId(env.DB, plaidItem.userId, plaidItem.itemId);
      await notificationsService.notify(env.DB, plaidItem.userId, {
        type: "account_connection",
        title: "Account disconnected",
        body: `Your ${plaidItem.institutionName} access was revoked. Re-link to continue syncing.`,
        priority: "high",
      });
      break;
  }
}
```

---

## Webhook Registration

Plaid webhooks are registered per item. When a new item is created (in `POST /accounts/link/exchange`), register the webhook URL:

```typescript
// In exchangePublicToken response handling:
await plaidLib.updateItemWebhook(
  env.PLAID_CLIENT_ID,
  env.PLAID_SECRET,
  plaidEnv,
  exchanged.access_token,
  `https://orbit-api.stevej-67b.workers.dev/api/v1/webhooks/plaid`
);
```

Webhook URL must be HTTPS and publicly accessible (✓ — our Worker is always public).

---

## Polling Fallback

Even with webhooks, maintain a polling fallback:
- Cron trigger every 6 hours: re-sync any item not updated in >6 hours
- Handles cases where webhook delivery fails (Plaid delivery is not guaranteed at-most-once)
- Gracefully handles duplicate events (idempotent upsert on transaction_id)

```toml
# In wrangler.toml:
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours
```

---

## Data Model Updates

```sql
-- Track webhook delivery for debugging
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  plaid_item_id TEXT REFERENCES plaid_items(item_id),
  webhook_type TEXT NOT NULL,
  webhook_code TEXT NOT NULL,
  payload TEXT,        -- JSON
  processed_at INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL
);

-- Update plaid_items for better sync tracking
ALTER TABLE plaid_items ADD COLUMN last_synced_at INTEGER;
ALTER TABLE plaid_items ADD COLUMN webhook_url TEXT;
ALTER TABLE plaid_items ADD COLUMN consent_expiration_time INTEGER;
```

---

## Success Metrics

| Metric | Target |
|---|---|
| Median time from bank transaction to Orbit detection | <10 minutes |
| Webhook delivery success rate | >99% |
| Polling fallback trigger rate | <5% of syncs (rest covered by webhooks) |
| Connection health detection latency | <30 seconds from ITEM event |
| Anomaly alerts triggered within 15 min of transaction | >90% |

---

## Dependencies

- PRD-005 (Real Account Linking) — plaid_items and access tokens
- PRD-016 (Anomaly Detection) — triggered by new transaction webhooks
- Cloudflare Queues — durable webhook processing (or `waitUntil` fallback)
