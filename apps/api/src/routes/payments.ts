/**
 * PRD-045: Bill Payment Execution
 * Payment status tracking and cancellation.
 */

import { Hono } from "hono";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, err } from "../lib/response.js";
import * as financeService from "../services/finance.js";
import { advancePaymentStatus } from "../services/payment-sim.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

// ── GET / ──────────────────────────────────────────────────────────────────────

router.get("/", async (c) => {
  const userId = c.get("userId");
  let payments = await financeService.getPayments(c.env.DB, userId);

  // Advance simulation state for in-flight payments
  const advancing = payments
    .filter((p) => p.status === "initiated" || p.status === "clearing")
    .map((p) => advancePaymentStatus(c.env.DB, p));
  if (advancing.length > 0) {
    await Promise.all(advancing);
    // Re-fetch to get updated statuses
    payments = await financeService.getPayments(c.env.DB, userId);
  }

  return c.json(ok(payments));
});

// ── POST /:id/cancel ──────────────────────────────────────────────────────────

router.post("/:id/cancel", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const cancelled = await financeService.cancelPayment(c.env.DB, id, userId);
  if (!cancelled) {
    return c.json(err("UNPROCESSABLE", "Payment cannot be cancelled — it may have already cleared or been settled"), 422);
  }
  return c.json(ok({ cancelled: true }));
});

export { router as paymentsRouter };
