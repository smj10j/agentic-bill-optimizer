import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok } from "../lib/response.js";
import { MockFinanceAdapter } from "../adapters/finance/mock.js";
import * as financeService from "../services/finance.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();
const financeAdapter = new MockFinanceAdapter();

router.use("*", authMiddleware);

router.get("/", async (c) => {
  const userId = c.get("userId");
  const accounts = await financeService.getAccounts(c.env.DB, userId);
  return c.json(ok(accounts));
});

router.post(
  "/link",
  zValidator(
    "json",
    z.object({
      institutionId: z.string(),
      credentials: z.record(z.string()),
    })
  ),
  async (c) => {
    const userId = c.get("userId");
    const { credentials } = c.req.valid("json");

    const linked = await financeAdapter.linkAccounts(userId, credentials);

    // Persist linked accounts to DB
    for (const account of linked) {
      await financeService.insertAccount(c.env.DB, { ...account, userId });
    }

    // Seed transactions and bills from mock adapter
    const { transactions } = await financeAdapter.getTransactions(userId);
    await financeService.insertTransactions(c.env.DB, transactions.map((t) => ({ ...t, userId })));

    const subs = await financeAdapter.detectSubscriptions(userId);
    for (const sub of subs) {
      await financeService.upsertSubscription(c.env.DB, { ...sub, userId });
    }

    const bills = await financeAdapter.getUpcomingBills(userId);
    await financeService.upsertBills(c.env.DB, bills.map((b) => ({ ...b, userId })));

    return c.json(ok({ accountsLinked: linked.length, accounts: linked }), 201);
  }
);

router.post("/:id/sync", async (c) => {
  const userId = c.get("userId");
  const accountId = c.req.param("id");

  const accounts = await financeService.getAccounts(c.env.DB, userId);
  if (!accounts.find((a) => a.id === accountId)) {
    throw new HTTPException(404, { message: "Account not found" });
  }

  const { syncedAt } = await financeAdapter.syncAccount(userId, accountId);
  await financeService.updateAccountSync(c.env.DB, accountId, userId, syncedAt);

  return c.json(ok({ synced: true, lastSyncedAt: syncedAt }));
});

export { router as accountsRouter };
