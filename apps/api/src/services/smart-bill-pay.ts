/**
 * Smart Bill Pay Timing — PRD-003
 *
 * Calculates optimal payment initiation dates to maximize yield float
 * while guaranteeing on-time delivery and never incurring late fees.
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { Bill, BillerCategory } from "@orbit/shared";
import * as financeService from "./finance.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Standard ACH settlement lead time in calendar days */
const ACH_SETTLEMENT_DAYS = 2;
/** Buffer days added on top of settlement for weekends/holidays */
const BUSINESS_DAY_BUFFER = 1;
/** Total lead time: initiate this many days before the target pay date */
const TOTAL_LEAD_DAYS = ACH_SETTLEMENT_DAYS + BUSINESS_DAY_BUFFER;

/**
 * Typical safe grace periods by biller category.
 * Used only when the bill's gracePeriodDays is 0 (unknown).
 * Conservative: only well-known contractual graces are included.
 */
const CATEGORY_DEFAULT_GRACE: Record<BillerCategory, number> = {
  insurance: 28,   // Contractual grace is typically 28–30 days
  mortgage: 15,    // Common, but Orbit won't exploit by default
  rent: 5,         // Common 5-day grace, but we don't use by default
  credit_card: 0,  // Pay by due date to avoid interest
  utility: 0,      // Assume no grace until confirmed
  subscription: 0, // Charged on billing date
  medical: 0,      // Flexible, but not exploited without user input
  other: 0,
};

/**
 * Categories where Orbit will auto-apply the known grace period.
 * For mortgage/rent, user must explicitly opt in.
 */
const AUTO_APPLY_GRACE = new Set<BillerCategory>(["insurance"]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type SmartPayTiming = {
  billId: string;
  /** Unix timestamp: when Orbit should initiate the payment */
  optimalInitiateDate: number;
  /** Unix timestamp: latest safe day to pay (due_date + grace - 1 buffer day) */
  safePayBy: number;
  /** Days of float captured vs. paying on due date */
  floatDays: number;
  /** Estimated yield earned on the held amount during float period (cents) */
  yieldSavedCents: number;
  /** Effective grace period used (may differ from bill.gracePeriodDays if category default applies) */
  effectiveGraceDays: number;
  /** Whether this bill is already past its optimal initiate date */
  isUrgent: boolean;
  /** Whether the bill cannot be safely delayed (optimal date is in the past) */
  isAtRisk: boolean;
};

export type SmartBill = Bill & { smartPay: SmartPayTiming };

// ─── Pure Scheduling Functions ────────────────────────────────────────────────

/**
 * Determine the effective grace period for a bill.
 * Only auto-applies category defaults for well-known contractual graces.
 */
export function effectiveGracePeriod(bill: Bill): number {
  if (bill.gracePeriodDays > 0) return bill.gracePeriodDays;
  if (AUTO_APPLY_GRACE.has(bill.billerCategory)) {
    return CATEGORY_DEFAULT_GRACE[bill.billerCategory];
  }
  return 0;
}

/**
 * Calculate the optimal payment initiation date and yield savings for a bill.
 *
 * @param bill         Bill with smart pay fields populated
 * @param apyBasisPoints  Current yield APY in basis points (e.g. 450 = 4.50%)
 * @returns SmartPayTiming
 */
export function calculateOptimalPayDate(bill: Bill, apyBasisPoints: number): SmartPayTiming {
  const nowSec = Math.floor(Date.now() / 1000);
  const graceDays = effectiveGracePeriod(bill);

  // Latest safe day to pay: due_date + grace - 1 day buffer
  const safePayBy = bill.dueAt + graceDays * 86400 - 86400;

  // Optimal initiation date: safePayBy minus lead time
  const rawInitiateDate = safePayBy - TOTAL_LEAD_DAYS * 86400;

  // Never schedule in the past — clamp to now
  const optimalInitiateDate = Math.max(rawInitiateDate, nowSec);

  // Float days: difference between optimal initiate date and paying on due date immediately
  const immediateInitiateDate = bill.dueAt - TOTAL_LEAD_DAYS * 86400;
  const floatDays = Math.max(0, Math.floor((optimalInitiateDate - immediateInitiateDate) / 86400));

  // Yield saved: principal × APY/365 × floatDays
  const dailyRateBasisPoints = apyBasisPoints / 365;
  const yieldSavedCents = Math.round(
    (bill.amountCents * dailyRateBasisPoints * floatDays) / 10000
  );

  const isAtRisk = optimalInitiateDate <= nowSec && bill.status === "pending";
  const daysUntilInitiate = (optimalInitiateDate - nowSec) / 86400;
  const isUrgent = daysUntilInitiate <= 2 && !isAtRisk;

  return {
    billId: bill.id,
    optimalInitiateDate,
    safePayBy,
    floatDays,
    yieldSavedCents,
    effectiveGraceDays: graceDays,
    isUrgent,
    isAtRisk,
  };
}

// ─── Aggregate Schedule ───────────────────────────────────────────────────────

/**
 * Returns all pending/overdue bills for a user, each annotated with
 * smart pay timing calculated against the current yield APY.
 */
export async function getSmartBillSchedule(
  db: D1Database,
  userId: string
): Promise<SmartBill[]> {
  const [bills, yieldPosition] = await Promise.all([
    financeService.getBills(db, userId, { lookAheadDays: 90 }),
    financeService.getOrCreateYieldPosition(db, userId),
  ]);

  const { apyBasisPoints } = yieldPosition;

  return bills
    .filter((b) => b.status !== "paid")
    .map((b) => ({
      ...b,
      smartPay: b.smartPayEnabled
        ? calculateOptimalPayDate(b, apyBasisPoints)
        : {
            billId: b.id,
            optimalInitiateDate: b.dueAt - TOTAL_LEAD_DAYS * 86400,
            safePayBy: b.dueAt,
            floatDays: 0,
            yieldSavedCents: 0,
            effectiveGraceDays: 0,
            isUrgent: (b.dueAt - Math.floor(Date.now() / 1000)) / 86400 <= 2,
            isAtRisk: b.dueAt < Math.floor(Date.now() / 1000),
          },
    }));
}
