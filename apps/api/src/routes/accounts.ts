/**
 * Accounts routes — PRD-005: Real Account Linking
 * Plaid Link flow: get link token → user authenticates in Link UI →
 * exchange public token → fetch accounts → upsert into D1.
 * Falls back to mock adapter if PLAID_CLIENT_ID/SECRET are not set.
 */
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, err } from "../lib/response.js";
import * as financeService from "../services/finance.js";
import * as plaidLib from "../lib/plaid.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

function hasPlaidConfig(env: Env): boolean {
  return !!(env.PLAID_CLIENT_ID && env.PLAID_SECRET);
}

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get("/", async (c) => {
  const userId = c.get("userId");
  const accounts = await financeService.getAccounts(c.env.DB, userId);
  return c.json(ok(accounts));
});

// ── GET /link/token ───────────────────────────────────────────────────────────
// Returns a real Plaid link_token, or a mock stub if Plaid is not configured.

router.get("/link/token", async (c) => {
  const userId = c.get("userId");

  if (hasPlaidConfig(c.env)) {
    const plaidEnv = c.env.PLAID_ENV ?? "sandbox";
    const result = await plaidLib.createLinkToken(
      c.env.PLAID_CLIENT_ID,
      c.env.PLAID_SECRET,
      plaidEnv,
      userId
    );
    return c.json(ok({
      linkToken: result.link_token,
      expiration: Math.floor(new Date(result.expiration).getTime() / 1000),
    }));
  }

  return c.json(ok({
    linkToken: `link-sandbox-mock-${userId}-${Date.now()}`,
    expiration: Math.floor(Date.now() / 1000) + 1800,
  }));
});

// ── POST /link/exchange ───────────────────────────────────────────────────────
// Exchange public_token → access_token → fetch real accounts → upsert.

const exchangeSchema = z.object({
  publicToken: z.string(),
  institutionId: z.string(),
  institutionName: z.string(),
});

router.post("/link/exchange", zValidator("json", exchangeSchema), async (c) => {
  const userId = c.get("userId");
  const { publicToken, institutionId, institutionName } = c.req.valid("json");

  if (hasPlaidConfig(c.env)) {
    const plaidEnv = c.env.PLAID_ENV ?? "sandbox";

    try {
      // 1. Exchange public token
      const exchanged = await plaidLib.exchangePublicToken(
        c.env.PLAID_CLIENT_ID,
        c.env.PLAID_SECRET,
        plaidEnv,
        publicToken
      );

      // 2. Store access token in KV (encrypted at rest by Cloudflare)
      await c.env.SESSIONS.put(`plaid_access:${userId}:${exchanged.item_id}`, exchanged.access_token);

      // 3. Record plaid_item in DB (idempotent — upserts on item_id)
      await financeService.createPlaidItem(c.env.DB, userId, {
        itemId: exchanged.item_id,
        institutionId,
        institutionName,
      });

      // 4. Fetch accounts
      const accountsResp = await plaidLib.getPlaidAccounts(
        c.env.PLAID_CLIENT_ID,
        c.env.PLAID_SECRET,
        plaidEnv,
        exchanged.access_token
      );

      // 5. Upsert accounts (idempotent via ON CONFLICT on plaid_account_id)
      const now = Math.floor(Date.now() / 1000);
      const upserted = await Promise.all(
        accountsResp.accounts.map((a) =>
          financeService.insertAccount(c.env.DB, {
            userId,
            name: a.official_name ?? a.name,
            institution: institutionName,
            accountType: plaidLib.mapAccountType(a.type, a.subtype),
            balanceCents: plaidLib.balanceCents(a),
            currency: a.balances.iso_currency_code ?? "USD",
            lastSyncedAt: now,
            plaidItemId: exchanged.item_id,
            plaidAccountId: a.account_id,
            connectionStatus: "healthy",
            linkedAt: now,
            createdAt: now,
          })
        )
      );

      // 6. Import transactions in background (don't block response)
      void syncTransactionsBackground(c.env, userId, exchanged.item_id, exchanged.access_token);

      return c.json(ok({ accountsLinked: upserted.length, accounts: upserted }), 201);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Account linking failed";
      throw new HTTPException(422, { message });
    }
  }

  // ── Mock fallback ──────────────────────────────────────────────────────────
  const { MockFinanceAdapter } = await import("../adapters/finance/mock.js");
  const adapter = new MockFinanceAdapter();
  const linked = await adapter.linkAccounts(userId, {});
  const now = Math.floor(Date.now() / 1000);

  for (const account of linked) {
    await financeService.insertAccount(c.env.DB, {
      ...account, userId, connectionStatus: "healthy", linkedAt: now, createdAt: now,
    });
  }
  await financeService.createPlaidItem(c.env.DB, userId, {
    itemId: `mock-item-${Date.now()}`, institutionId, institutionName,
  });
  const { transactions } = await adapter.getTransactions(userId);
  await financeService.insertTransactions(c.env.DB, transactions.map((t) => ({ ...t, userId })));
  const subs = await adapter.detectSubscriptions(userId);
  for (const sub of subs) {
    await financeService.upsertSubscription(c.env.DB, { ...sub, userId });
  }
  const bills = await adapter.getUpcomingBills(userId);
  await financeService.upsertBills(c.env.DB, bills.map((b) => ({ ...b, userId })));

  return c.json(ok({ accountsLinked: linked.length, accounts: linked }), 201);
});

// ── POST /:id/sync ────────────────────────────────────────────────────────────

router.post("/:id/sync", async (c) => {
  const userId = c.get("userId");
  const accountId = c.req.param("id");
  const now = Math.floor(Date.now() / 1000);

  const accounts = await financeService.getAccounts(c.env.DB, userId);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return c.json(err("NOT_FOUND", "Account not found"), 404);

  if (hasPlaidConfig(c.env) && account.plaidItemId) {
    const plaidEnv = c.env.PLAID_ENV ?? "sandbox";
    const accessToken = await c.env.SESSIONS.get(`plaid_access:${userId}:${account.plaidItemId}`);
    if (accessToken) {
      const resp = await plaidLib.getPlaidAccounts(
        c.env.PLAID_CLIENT_ID, c.env.PLAID_SECRET, plaidEnv, accessToken
      );
      const plaidAccount = resp.accounts.find((a) => a.account_id === account.plaidAccountId);
      if (plaidAccount) {
        await financeService.insertAccount(c.env.DB, {
          ...account,
          balanceCents: plaidLib.balanceCents(plaidAccount),
          lastSyncedAt: now,
        });
      }
    }
  }

  await financeService.updateAccountSync(c.env.DB, accountId, userId, now);
  return c.json(ok({ synced: true, lastSyncedAt: now }));
});

// ── DELETE /:id/disconnect ────────────────────────────────────────────────────

router.delete("/:id/disconnect", async (c) => {
  const userId = c.get("userId");
  const accountId = c.req.param("id");
  const disconnected = await financeService.disconnectAccount(c.env.DB, accountId, userId);
  if (!disconnected) return c.json(err("NOT_FOUND", "Account not found"), 404);
  return c.json(ok({ disconnected: true }));
});

// ─── Background transaction import after link ─────────────────────────────────

async function syncTransactionsBackground(
  env: Env,
  userId: string,
  itemId: string,
  accessToken: string
): Promise<void> {
  try {
    const plaidEnv = env.PLAID_ENV ?? "sandbox";
    let cursor: string | undefined;
    let hasMore = true;
    const allTransactions: plaid.PlaidTransaction[] = [];

    while (hasMore && allTransactions.length < 500) {
      const resp = await plaidLib.syncTransactions(
        env.PLAID_CLIENT_ID, env.PLAID_SECRET, plaidEnv, accessToken, cursor
      );
      allTransactions.push(...resp.added);
      cursor = resp.next_cursor;
      hasMore = resp.has_more;
    }

    if (cursor) {
      await env.SESSIONS.put(`plaid_cursor:${userId}:${itemId}`, cursor);
    }

    if (allTransactions.length === 0) return;

    const accounts = await financeService.getAccounts(env.DB, userId);
    const accountMap = new Map(accounts.map((a) => [a.plaidAccountId, a.id]));
    const now = Math.floor(Date.now() / 1000);

    const transactions = allTransactions
      .filter((t) => !t.pending)
      .flatMap((t) => {
        const accountId = accountMap.get(t.account_id);
        if (!accountId) return [];
        return [{
          id: `txn_${t.transaction_id}`,
          accountId,
          userId,
          amountCents: -Math.round(t.amount * 100),
          description: t.name,
          merchantName: t.merchant_name,
          category: t.category?.[0] ?? null,
          isRecurring: false,
          recurringId: null,
          transactedAt: Math.floor(new Date(t.date).getTime() / 1000),
          createdAt: now,
        }];
      });

    if (transactions.length > 0) {
      await financeService.insertTransactions(env.DB, transactions);
    }
  } catch (e) {
    console.error("Transaction sync failed:", e);
  }
}

// Re-export plaid type for use in background fn
import type { PlaidTransaction as PlaidTxType } from "../lib/plaid.js";
declare namespace plaid { type PlaidTransaction = PlaidTxType; }

export { router as accountsRouter };
