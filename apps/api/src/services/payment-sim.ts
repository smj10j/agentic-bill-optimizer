/**
 * PRD-045: MockPaymentAdapter — simulates payment state transitions.
 * initiated → clearing (after ~10s) → settled (after ~30s)
 * 5% random failure rate at clearing stage.
 *
 * In Cloudflare Workers there are no setTimeout/setInterval in the traditional sense.
 * We simulate state by computing elapsed time since initiated_at on each status check.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { updatePaymentStatus, type PaymentRecord } from "./finance.js";

const CLEARING_DELAY_SECONDS = 10;
const SETTLED_DELAY_SECONDS = 30;
const FAILURE_RATE = 0.05; // 5%

/**
 * Given a payment record, advance its status based on elapsed time.
 * Called on every GET /payments request to simulate real-time progression.
 * Returns the updated status.
 */
export async function advancePaymentStatus(
  db: D1Database,
  payment: PaymentRecord
): Promise<PaymentRecord["status"]> {
  if (payment.status === "settled" || payment.status === "failed" || payment.status === "cancelled") {
    return payment.status;
  }

  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - payment.initiatedAt;

  if (payment.status === "initiated" && elapsed >= CLEARING_DELAY_SECONDS) {
    // Simulate rare failure at clearing
    const shouldFail = Math.random() < FAILURE_RATE;
    if (shouldFail) {
      await updatePaymentStatus(db, payment.id, payment.userId, "failed", {
        failureCode: "processing_error",
        failureMessage: "Payment processor declined the transaction. Please retry.",
      });
      return "failed";
    }
    await updatePaymentStatus(db, payment.id, payment.userId, "clearing");
    return "clearing";
  }

  if (payment.status === "clearing" && elapsed >= SETTLED_DELAY_SECONDS) {
    await updatePaymentStatus(db, payment.id, payment.userId, "settled");
    return "settled";
  }

  return payment.status;
}
