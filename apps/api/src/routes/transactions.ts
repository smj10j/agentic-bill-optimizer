import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok } from "../lib/response.js";
import * as financeService from "../services/finance.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(200).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  accountId: z.string().optional(),
  category: z.string().optional(),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
});

router.get("/", zValidator("query", querySchema), async (c) => {
  const userId = c.get("userId");
  const { limit, offset, accountId, from, to } = c.req.valid("query");

  const result = await financeService.getTransactions(c.env.DB, userId, {
    limit,
    offset,
    ...(accountId !== undefined ? { accountId } : {}),
    ...(from !== undefined ? { from } : {}),
    ...(to !== undefined ? { to } : {}),
  });

  return c.json(ok({ ...result, hasMore: offset + limit < result.total }));
});

router.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const transaction = await financeService.getTransaction(c.env.DB, id, userId);
  if (!transaction) {
    throw new HTTPException(404, { message: "Transaction not found" });
  }

  return c.json(ok(transaction));
});

export { router as transactionsRouter };
