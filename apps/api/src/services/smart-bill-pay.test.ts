import { describe, it, expect } from "vitest";
import { calculateOptimalPayDate, effectiveGracePeriod } from "./smart-bill-pay.js";
import type { Bill } from "@orbit/shared";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NOW_SEC = Math.floor(Date.now() / 1000);
const DAY = 86400;
const APY_450 = 450; // 4.50%

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "bill_test",
    userId: "usr_test",
    name: "Electric",
    amountCents: 10000, // $100
    dueAt: NOW_SEC + 14 * DAY, // 14 days from now
    status: "pending",
    paidAt: null,
    createdAt: NOW_SEC,
    gracePeriodDays: 0,
    lateFeeCents: 0,
    paymentRail: "ach",
    smartPayEnabled: true,
    billerCategory: "utility",
    ...overrides,
  };
}

// ─── effectiveGracePeriod ─────────────────────────────────────────────────────

describe("effectiveGracePeriod", () => {
  it("returns bill's explicit grace period when set", () => {
    expect(effectiveGracePeriod(makeBill({ gracePeriodDays: 7 }))).toBe(7);
  });

  it("returns 0 for utility with no explicit grace", () => {
    expect(effectiveGracePeriod(makeBill({ billerCategory: "utility" }))).toBe(0);
  });

  it("auto-applies 28-day grace for insurance (contractual)", () => {
    expect(effectiveGracePeriod(makeBill({ billerCategory: "insurance" }))).toBe(28);
  });

  it("does NOT auto-apply grace for mortgage (must be opt-in)", () => {
    expect(effectiveGracePeriod(makeBill({ billerCategory: "mortgage" }))).toBe(0);
  });

  it("explicit grace overrides category default for insurance", () => {
    expect(effectiveGracePeriod(makeBill({ billerCategory: "insurance", gracePeriodDays: 14 }))).toBe(14);
  });
});

// ─── calculateOptimalPayDate ──────────────────────────────────────────────────

describe("calculateOptimalPayDate", () => {
  it("for a bill with no grace, initiates 3 days before due date (ACH 2 + 1 buffer)", () => {
    const bill = makeBill({ dueAt: NOW_SEC + 14 * DAY, gracePeriodDays: 0 });
    const result = calculateOptimalPayDate(bill, APY_450);
    // safePayBy = dueAt + 0 - 1 day = dueAt - 1 day
    // optimalInitiateDate = safePayBy - 3 days = dueAt - 4 days
    expect(result.safePayBy).toBe(bill.dueAt - DAY);
    expect(result.optimalInitiateDate).toBe(bill.dueAt - 4 * DAY);
  });

  it("captures float days for insurance bill (28-day auto grace)", () => {
    const bill = makeBill({ billerCategory: "insurance", dueAt: NOW_SEC + 35 * DAY });
    const result = calculateOptimalPayDate(bill, APY_450);
    // effectiveGrace = 28, safePayBy = dueAt + 28 - 1 = dueAt + 27 days
    expect(result.effectiveGraceDays).toBe(28);
    expect(result.floatDays).toBeGreaterThan(0);
    expect(result.yieldSavedCents).toBeGreaterThan(0);
  });

  it("yield saved is positive when float days > 0", () => {
    const bill = makeBill({ billerCategory: "insurance", dueAt: NOW_SEC + 60 * DAY, amountCents: 35000 });
    const result = calculateOptimalPayDate(bill, APY_450);
    // $350 × 4.5% / 365 × floatDays
    expect(result.yieldSavedCents).toBeGreaterThan(0);
  });

  it("yield saved is 0 when float days is 0 (no grace, pay immediately)", () => {
    // Due in 3 days: optimal initiate = dueAt - 4 days = -1 day ago → clamped to now
    const bill = makeBill({ dueAt: NOW_SEC + 3 * DAY, gracePeriodDays: 0 });
    const result = calculateOptimalPayDate(bill, APY_450);
    expect(result.floatDays).toBe(0);
    expect(result.yieldSavedCents).toBe(0);
  });

  it("isAtRisk is true for overdue pending bill", () => {
    const bill = makeBill({ dueAt: NOW_SEC - 2 * DAY, status: "pending" });
    const result = calculateOptimalPayDate(bill, APY_450);
    expect(result.isAtRisk).toBe(true);
  });

  it("isAtRisk is false for paid bill", () => {
    const bill = makeBill({ dueAt: NOW_SEC - 2 * DAY, status: "paid" });
    const result = calculateOptimalPayDate(bill, APY_450);
    expect(result.isAtRisk).toBe(false);
  });

  it("isUrgent is true when optimal initiate date is within 2 days", () => {
    const bill = makeBill({ dueAt: NOW_SEC + 5 * DAY, gracePeriodDays: 0 });
    const result = calculateOptimalPayDate(bill, APY_450);
    // optimalInitiateDate = dueAt - 4 days = NOW + 1 day → within 2 days
    expect(result.isUrgent).toBe(true);
  });

  it("isUrgent is false for bills with plenty of lead time", () => {
    const bill = makeBill({ dueAt: NOW_SEC + 30 * DAY, gracePeriodDays: 0 });
    const result = calculateOptimalPayDate(bill, APY_450);
    expect(result.isUrgent).toBe(false);
  });

  it("optimalInitiateDate is never in the past (clamped to now)", () => {
    const bill = makeBill({ dueAt: NOW_SEC + 2 * DAY });
    const result = calculateOptimalPayDate(bill, APY_450);
    expect(result.optimalInitiateDate).toBeGreaterThanOrEqual(NOW_SEC);
  });

  it("explicit 7-day grace captures meaningful float", () => {
    const bill = makeBill({ gracePeriodDays: 7, dueAt: NOW_SEC + 20 * DAY, amountCents: 20000 });
    const result = calculateOptimalPayDate(bill, APY_450);
    expect(result.effectiveGraceDays).toBe(7);
    // 7 grace days - 1 safety buffer = 6 extra float days vs no grace
    expect(result.floatDays).toBe(6);
    expect(result.yieldSavedCents).toBeGreaterThan(0);
  });
});
