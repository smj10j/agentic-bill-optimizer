import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, err } from "../lib/response.js";
import * as financeService from "../services/finance.js";
import * as smartBillPay from "../services/smart-bill-pay.js";
import { MockMoneyAdapter } from "../adapters/money/mock.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();
const moneyAdapter = new MockMoneyAdapter();

router.use("*", authMiddleware);

const querySchema = z.object({
  status: z.enum(["pending", "paid", "overdue"]).optional(),
  days: z.coerce.number().min(1).max(365).optional().default(30),
});

// ── GET / ──────────────────────────────────────────────────────────────────────

router.get("/", zValidator("query", querySchema), async (c) => {
  const userId = c.get("userId");
  const { status, days } = c.req.valid("query");

  const bills = await financeService.getBills(c.env.DB, userId, {
    lookAheadDays: days,
    ...(status !== undefined ? { status } : {}),
  });

  return c.json(ok(bills));
});

// ── GET /schedule ──────────────────────────────────────────────────────────────
// Returns pending bills annotated with smart pay timing and yield savings.

router.get("/schedule", async (c) => {
  const userId = c.get("userId");
  const schedule = await smartBillPay.getSmartBillSchedule(c.env.DB, userId);
  return c.json(ok(schedule));
});

// ── PUT /:id ───────────────────────────────────────────────────────────────────
// Update smart pay settings for a specific bill.

const smartPayPatchSchema = z.object({
  gracePeriodDays: z.number().int().min(0).max(60).optional(),
  lateFeeCents: z.number().int().min(0).optional(),
  paymentRail: z.enum(["ach", "same_day_ach", "card", "check", "auto"]).optional(),
  smartPayEnabled: z.boolean().optional(),
  billerCategory: z.enum(["utility", "insurance", "rent", "mortgage", "credit_card", "subscription", "medical", "other"]).optional(),
});

router.put("/:id", zValidator("json", smartPayPatchSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const raw = c.req.valid("json");

  // Strip undefined values for exactOptionalPropertyTypes
  const patch = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined)
  ) as Parameters<typeof financeService.updateBillSmartPay>[3];

  const updated = await financeService.updateBillSmartPay(c.env.DB, id, userId, patch);
  if (!updated) {
    return c.json(err("NOT_FOUND", "Bill not found"), 404);
  }

  // Return the bill with fresh smart pay timing
  const bills = await financeService.getBills(c.env.DB, userId, { lookAheadDays: 365 });
  const bill = bills.find((b) => b.id === id);
  if (!bill) return c.json(err("NOT_FOUND", "Bill not found"), 404);

  const [yieldPos] = await Promise.all([financeService.getOrCreateYieldPosition(c.env.DB, userId)]);
  const smartPay = smartBillPay.calculateOptimalPayDate(bill, yieldPos.apyBasisPoints);

  return c.json(ok({ ...bill, smartPay }));
});

// ── POST /:id/pay ──────────────────────────────────────────────────────────────

router.post("/:id/pay", async (c) => {
  const userId = c.get("userId");
  const billId = c.req.param("id");

  const bills = await financeService.getBills(c.env.DB, userId, { lookAheadDays: 365 });

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
