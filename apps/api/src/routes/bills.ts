import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok } from "../lib/response.js";
import * as financeService from "../services/finance.js";
import { MockMoneyAdapter } from "../adapters/money/mock.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();
const moneyAdapter = new MockMoneyAdapter();

router.use("*", authMiddleware);

const querySchema = z.object({
  status: z.enum(["pending", "paid", "overdue"]).optional(),
  days: z.coerce.number().min(1).max(365).optional().default(30),
});

router.get("/", zValidator("query", querySchema), async (c) => {
  const userId = c.get("userId");
  const { status, days } = c.req.valid("query");

  const bills = await financeService.getBills(c.env.DB, userId, {
    lookAheadDays: days,
    ...(status !== undefined ? { status } : {}),
  });

  return c.json(ok(bills));
});

router.post("/:id/pay", async (c) => {
  const userId = c.get("userId");
  const billId = c.req.param("id");

  const [bills] = await Promise.all([
    financeService.getBills(c.env.DB, userId, { lookAheadDays: 365 }),
  ]);

  const bill = bills.find((b) => b.id === billId);
  if (!bill) {
    throw new HTTPException(404, { message: "Bill not found" });
  }
  if (bill.status === "paid") {
    throw new HTTPException(422, { message: "Bill is already paid" });
  }

  const txResult = await moneyAdapter.settleBill(userId, billId, bill.amountCents);
  const paidAt = txResult.timestamp;

  await financeService.markBillPaid(c.env.DB, billId, userId, paidAt);

  const actionId = await financeService.insertAgentAction(c.env.DB, {
    userId,
    actionType: "bill_payment",
    description: `Paid ${bill.name} ($${(bill.amountCents / 100).toFixed(2)})`,
    payload: { billId, amountCents: bill.amountCents, transactionId: txResult.transactionId },
  });

  return c.json(ok({ actionId, description: txResult.description, paidAt }));
});

export { router as billsRouter };
