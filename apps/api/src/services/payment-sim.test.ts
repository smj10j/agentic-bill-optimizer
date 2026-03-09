import { describe, it, expect } from "vitest";
import { advancePaymentStatus } from "./payment-sim.js";
import type { PaymentRecord } from "./finance.js";

// Mock DB that tracks updates
function mockDb(captured: Array<{ id: string; status: string }>) {
  return {
    prepare: (sql: string) => ({
      bind: (..._args: unknown[]) => ({
        run: async () => {
          // Extract status from SQL
          const match = sql.match(/UPDATE payments SET status = /);
          if (match) captured.push({ id: "test", status: "updated" });
          return { meta: { changes: 1 } };
        },
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
    }),
  } as unknown as import("@cloudflare/workers-types").D1Database;
}

function makePayment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: "pay_test",
    userId: "user_1",
    billId: "bill_1",
    billerName: "Electric Co",
    amountCents: 10000,
    status: "initiated",
    idempotencyKey: "idem_1",
    fromAccountId: null,
    failureCode: null,
    failureMessage: null,
    initiatedAt: now,
    clearedAt: null,
    settledAt: null,
    failedAt: null,
    cancelledAt: null,
    createdAt: now,
    ...overrides,
  };
}

describe("advancePaymentStatus", () => {
  it("does not advance a payment initiated just now", async () => {
    const captured: Array<{ id: string; status: string }> = [];
    const db = mockDb(captured);
    const payment = makePayment({ status: "initiated" });
    const result = await advancePaymentStatus(db, payment);
    expect(result).toBe("initiated");
    expect(captured).toHaveLength(0);
  });

  it("advances to clearing after 10 seconds", async () => {
    const captured: Array<{ id: string; status: string }> = [];
    const db = mockDb(captured);
    const payment = makePayment({
      status: "initiated",
      initiatedAt: Math.floor(Date.now() / 1000) - 15,
    });
    // Seed Math.random to avoid failure simulation
    const origRandom = Math.random;
    Math.random = () => 0.9; // 0.9 > FAILURE_RATE (0.05), so no failure
    const result = await advancePaymentStatus(db, payment);
    Math.random = origRandom;
    expect(result).toBe("clearing");
  });

  it("advances to settled after 30 seconds", async () => {
    const db = mockDb([]);
    const payment = makePayment({
      status: "clearing",
      initiatedAt: Math.floor(Date.now() / 1000) - 35,
    });
    const result = await advancePaymentStatus(db, payment);
    expect(result).toBe("settled");
  });

  it("does not advance a settled payment", async () => {
    const captured: Array<{ id: string; status: string }> = [];
    const db = mockDb(captured);
    const payment = makePayment({ status: "settled" });
    const result = await advancePaymentStatus(db, payment);
    expect(result).toBe("settled");
    expect(captured).toHaveLength(0);
  });

  it("does not advance a cancelled payment", async () => {
    const captured: Array<{ id: string; status: string }> = [];
    const db = mockDb(captured);
    const payment = makePayment({ status: "cancelled" });
    const result = await advancePaymentStatus(db, payment);
    expect(result).toBe("cancelled");
    expect(captured).toHaveLength(0);
  });

  it("can fail at clearing stage", async () => {
    const db = mockDb([]);
    const payment = makePayment({
      status: "initiated",
      initiatedAt: Math.floor(Date.now() / 1000) - 15,
    });
    const origRandom = Math.random;
    Math.random = () => 0.01; // 0.01 < FAILURE_RATE (0.05), so failure
    const result = await advancePaymentStatus(db, payment);
    Math.random = origRandom;
    expect(result).toBe("failed");
  });
});
