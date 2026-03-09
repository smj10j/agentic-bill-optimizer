import { describe, it, expect } from "vitest";
import {
  detectUnusedSubscriptions,
  detectPriceIncreases,
  detectDuplicateCharges,
  detectIdleCash,
  detectSpendingSpike,
  scoreInsight,
  type RawInsight,
} from "./insights.js";
import type { Subscription, Transaction, Account } from "@orbit/shared";

// ─── Test data helpers ────────────────────────────────────────────────────────

const NOW = 1_700_000_000; // Fixed reference timestamp (seconds)
const DAY = 86400;
const WEEK = 7 * DAY;

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_test",
    userId: "usr_test",
    merchantName: "Netflix",
    amountCents: 1599, // $15.99/month
    billingCycle: "monthly",
    lastChargedAt: NOW - 30 * DAY,
    nextExpectedAt: NOW + 1 * DAY,
    status: "active",
    lastUsedAt: NOW - 5 * WEEK, // 5 weeks ago — past 4-week threshold
    createdAt: NOW - 180 * DAY,
    ...overrides,
  };
}

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn_test",
    accountId: "acc_test",
    userId: "usr_test",
    amountCents: -1599,
    description: "NETFLIX",
    merchantName: "Netflix",
    category: "Entertainment",
    isRecurring: true,
    recurringId: null,
    transactedAt: NOW - 30 * DAY,
    createdAt: NOW - 30 * DAY,
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc_test",
    userId: "usr_test",
    name: "Chase Checking",
    institution: "Chase",
    accountType: "checking",
    balanceCents: 500000, // $5,000
    currency: "USD",
    lastSyncedAt: NOW - 20 * DAY, // 20 days ago — past 14-day threshold
    createdAt: NOW - 365 * DAY,
    plaidItemId: null,
    plaidAccountId: null,
    connectionStatus: "healthy",
    linkedAt: NOW - 365 * DAY,
    ...overrides,
  };
}

// ─── detectUnusedSubscriptions ────────────────────────────────────────────────

describe("detectUnusedSubscriptions", () => {
  it("returns an insight when subscription unused past threshold", () => {
    const sub = makeSub({ lastUsedAt: NOW - 5 * WEEK }); // 5 weeks, threshold is 4
    const results = detectUnusedSubscriptions([sub], [], NOW);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("unused_subscription");
    expect(results[0].category).toBe("savings");
    expect(results[0].entityId).toBe("sub_test");
  });

  it("skips cancelled subscriptions", () => {
    const sub = makeSub({ status: "cancelled", lastUsedAt: NOW - 10 * WEEK });
    const results = detectUnusedSubscriptions([sub], [], NOW);
    expect(results).toHaveLength(0);
  });

  it("skips subscription used recently (within threshold)", () => {
    const sub = makeSub({ lastUsedAt: NOW - 2 * WEEK }); // 2 weeks, below 4-week threshold
    const results = detectUnusedSubscriptions([sub], [], NOW);
    expect(results).toHaveLength(0);
  });

  it("uses gym threshold of 6 weeks", () => {
    const gymSub = makeSub({ merchantName: "Planet Fitness", lastUsedAt: NOW - 5 * WEEK });
    const results = detectUnusedSubscriptions([gymSub], [], NOW);
    // 5 weeks < 6 week gym threshold — should not fire
    expect(results).toHaveLength(0);
  });

  it("fires for gym subscription unused 7 weeks", () => {
    const gymSub = makeSub({
      id: "sub_gym",
      merchantName: "Planet Fitness",
      lastUsedAt: NOW - 7 * WEEK,
    });
    const results = detectUnusedSubscriptions([gymSub], [], NOW);
    expect(results).toHaveLength(1);
    expect(results[0].metadata.weeksUnused).toBe(7);
  });

  it("uses software threshold of 8 weeks for Adobe", () => {
    const softSub = makeSub({
      merchantName: "Adobe Creative Cloud",
      lastUsedAt: NOW - 7 * WEEK, // 7 weeks < 8 week threshold
    });
    const results = detectUnusedSubscriptions([softSub], [], NOW);
    expect(results).toHaveLength(0);
  });

  it("fires for Adobe unused 9 weeks", () => {
    const softSub = makeSub({
      id: "sub_adobe",
      merchantName: "Adobe Creative Cloud",
      lastUsedAt: NOW - 9 * WEEK,
    });
    const results = detectUnusedSubscriptions([softSub], [], NOW);
    expect(results).toHaveLength(1);
    expect(results[0].entityId).toBe("sub_adobe");
  });

  it("uses transaction lastUsedAt when transactions are newer than sub.lastUsedAt", () => {
    const sub = makeSub({ lastUsedAt: NOW - 10 * WEEK }); // would trigger
    // but there's a recent transaction (1 week ago)
    const recentTxn = makeTxn({ transactedAt: NOW - 1 * WEEK });
    const results = detectUnusedSubscriptions([sub], [recentTxn], NOW);
    expect(results).toHaveLength(0); // recent transaction overrides old lastUsedAt
  });

  it("calculates annual cost correctly for monthly subscription", () => {
    const sub = makeSub({ amountCents: 999, lastUsedAt: NOW - 5 * WEEK }); // $9.99/month
    const results = detectUnusedSubscriptions([sub], [], NOW);
    expect(results).toHaveLength(1);
    expect(results[0].dollarImpactCents).toBe(11988); // $9.99 * 12 = $119.88
  });

  it("calculates annual cost correctly for annual subscription", () => {
    const sub = makeSub({
      amountCents: 9999, // $99.99/year
      billingCycle: "annual",
      lastUsedAt: NOW - 5 * WEEK,
    });
    const results = detectUnusedSubscriptions([sub], [], NOW);
    expect(results).toHaveLength(1);
    // monthlyAmount = round(9999/12) = 833, annualCost = 833*12 = 9996
    expect(results[0].dollarImpactCents).toBe(9996);
  });

  it("skips subscription with no lastUsedAt (treated as used now)", () => {
    const sub = makeSub({ lastUsedAt: null });
    const results = detectUnusedSubscriptions([sub], [], NOW);
    expect(results).toHaveLength(0);
  });
});

// ─── detectPriceIncreases ─────────────────────────────────────────────────────

describe("detectPriceIncreases", () => {
  it("detects a price increase > 5%", () => {
    const sub = makeSub({ merchantName: "Spotify" });
    const window = NOW - 90 * DAY;
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Spotify", amountCents: -1099, transactedAt: NOW - 5 * DAY }),
      makeTxn({ id: "t2", merchantName: "Spotify", amountCents: -999, transactedAt: window + 30 * DAY }),
      makeTxn({ id: "t3", merchantName: "Spotify", amountCents: -999, transactedAt: window + 60 * DAY }),
    ];
    const results = detectPriceIncreases([sub], txns, NOW);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("price_increase");
    expect(results[0].category).toBe("savings");
    expect(results[0].metadata.increasePercent).toBe(10); // 1099 vs 999 = ~10%
  });

  it("skips increase < 5%", () => {
    const sub = makeSub({ merchantName: "Spotify" });
    const window = NOW - 90 * DAY;
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Spotify", amountCents: -1010, transactedAt: NOW - 5 * DAY }),
      makeTxn({ id: "t2", merchantName: "Spotify", amountCents: -999, transactedAt: window + 30 * DAY }),
      makeTxn({ id: "t3", merchantName: "Spotify", amountCents: -999, transactedAt: window + 60 * DAY }),
    ];
    const results = detectPriceIncreases([sub], txns, NOW);
    expect(results).toHaveLength(0); // ~1.1% increase, not significant
  });

  it("skips when fewer than 3 transactions in window", () => {
    const sub = makeSub({ merchantName: "Spotify" });
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Spotify", amountCents: -1099, transactedAt: NOW - 5 * DAY }),
      makeTxn({ id: "t2", merchantName: "Spotify", amountCents: -999, transactedAt: NOW - 35 * DAY }),
    ];
    const results = detectPriceIncreases([sub], txns, NOW);
    expect(results).toHaveLength(0);
  });

  it("skips cancelled subscriptions", () => {
    const sub = makeSub({ merchantName: "Spotify", status: "cancelled" });
    const window = NOW - 90 * DAY;
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Spotify", amountCents: -1099, transactedAt: NOW - 5 * DAY }),
      makeTxn({ id: "t2", merchantName: "Spotify", amountCents: -999, transactedAt: window + 30 * DAY }),
      makeTxn({ id: "t3", merchantName: "Spotify", amountCents: -999, transactedAt: window + 60 * DAY }),
    ];
    const results = detectPriceIncreases([sub], txns, NOW);
    expect(results).toHaveLength(0);
  });

  it("computes annual impact correctly", () => {
    const sub = makeSub({ merchantName: "Hulu" });
    const window = NOW - 90 * DAY;
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Hulu", amountCents: -1799, transactedAt: NOW - 5 * DAY }),
      makeTxn({ id: "t2", merchantName: "Hulu", amountCents: -1299, transactedAt: window + 30 * DAY }),
      makeTxn({ id: "t3", merchantName: "Hulu", amountCents: -1299, transactedAt: window + 60 * DAY }),
    ];
    const results = detectPriceIncreases([sub], txns, NOW);
    expect(results).toHaveLength(1);
    // monthly increase = 1799 - 1299 = 500; annual = 6000
    expect(results[0].dollarImpactCents).toBe(6000);
  });
});

// ─── detectDuplicateCharges ───────────────────────────────────────────────────

describe("detectDuplicateCharges", () => {
  it("detects same merchant, same amount, within 72 hours", () => {
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Amazon", amountCents: -4999, transactedAt: NOW - 2 * DAY }),
      makeTxn({ id: "t2", merchantName: "Amazon", amountCents: -4999, transactedAt: NOW - 2 * DAY - 3600 }),
    ];
    const results = detectDuplicateCharges(txns, NOW);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("duplicate_charge");
    expect(results[0].category).toBe("savings");
    expect(results[0].urgency).toBe(70);
  });

  it("skips if amounts differ by more than 5%", () => {
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Amazon", amountCents: -5000, transactedAt: NOW - 2 * DAY }),
      makeTxn({ id: "t2", merchantName: "Amazon", amountCents: -4000, transactedAt: NOW - 2 * DAY - 3600 }),
    ];
    const results = detectDuplicateCharges(txns, NOW);
    expect(results).toHaveLength(0); // 20% difference
  });

  it("skips if transactions are more than 72 hours apart", () => {
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Amazon", amountCents: -4999, transactedAt: NOW - 1 * DAY }),
      makeTxn({ id: "t2", merchantName: "Amazon", amountCents: -4999, transactedAt: NOW - 5 * DAY }),
    ];
    const results = detectDuplicateCharges(txns, NOW);
    expect(results).toHaveLength(0); // 4 days apart > 72 hours
  });

  it("skips positive/credit transactions", () => {
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Amazon", amountCents: 4999, transactedAt: NOW - 1 * DAY }),
      makeTxn({ id: "t2", merchantName: "Amazon", amountCents: 4999, transactedAt: NOW - 1 * DAY - 3600 }),
    ];
    const results = detectDuplicateCharges(txns, NOW);
    expect(results).toHaveLength(0);
  });

  it("detects within 5% amount tolerance", () => {
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: "Gym", amountCents: -5000, transactedAt: NOW - 1 * DAY }),
      makeTxn({ id: "t2", merchantName: "Gym", amountCents: -4800, transactedAt: NOW - 1 * DAY - 3600 }),
    ];
    const results = detectDuplicateCharges(txns, NOW);
    // diff = 200/5000 = 4% — within 5% tolerance
    expect(results).toHaveLength(1);
  });

  it("uses description as fallback when merchantName is null", () => {
    const txns: Transaction[] = [
      makeTxn({ id: "t1", merchantName: null, description: "ACME CORP", amountCents: -2500, transactedAt: NOW - 1 * DAY }),
      makeTxn({ id: "t2", merchantName: null, description: "ACME CORP", amountCents: -2500, transactedAt: NOW - 1 * DAY - 1800 }),
    ];
    const results = detectDuplicateCharges(txns, NOW);
    expect(results).toHaveLength(1);
    expect(results[0].metadata.merchantName).toBe("ACME CORP");
  });
});

// ─── detectIdleCash ───────────────────────────────────────────────────────────

describe("detectIdleCash", () => {
  it("detects idle cash above float floor with no yield position", () => {
    const account = makeAccount({
      balanceCents: 500000, // $5,000
      lastSyncedAt: NOW - 20 * DAY, // 20 days — past 14-day threshold
    });
    // idleCash = 500000 - 200000 (floor) - 0 (no yield) = 300000 > 100000 threshold
    const results = detectIdleCash([account], null, NOW);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("idle_cash");
    expect(results[0].category).toBe("yield");
  });

  it("skips when idle cash is below minimum threshold", () => {
    const account = makeAccount({
      balanceCents: 250000, // $2,500
      lastSyncedAt: NOW - 20 * DAY,
    });
    // idleCash = 250000 - 200000 - 0 = 50000 < 100000 MIN_IDLE_CENTS
    const results = detectIdleCash([account], null, NOW);
    expect(results).toHaveLength(0);
  });

  it("skips when funds have not been idle long enough", () => {
    const account = makeAccount({
      balanceCents: 500000,
      lastSyncedAt: NOW - 5 * DAY, // only 5 days — below 14-day threshold
    });
    const results = detectIdleCash([account], null, NOW);
    expect(results).toHaveLength(0);
  });

  it("subtracts existing yield balance from idle calculation", () => {
    const account = makeAccount({
      balanceCents: 350000, // $3,500
      lastSyncedAt: NOW - 20 * DAY,
    });
    // idleCash = 350000 - 200000 - 200000 (in yield) = -50000 < 100000
    const yieldPos = { balanceCents: 200000, apyBasisPoints: 450 };
    const results = detectIdleCash([account], yieldPos, NOW);
    expect(results).toHaveLength(0);
  });

  it("skips disconnected accounts", () => {
    const account = makeAccount({
      balanceCents: 500000,
      connectionStatus: "disconnected",
      lastSyncedAt: NOW - 20 * DAY,
    });
    const results = detectIdleCash([account], null, NOW);
    expect(results).toHaveLength(0);
  });

  it("uses apyBasisPoints from yield position when available", () => {
    const account = makeAccount({
      balanceCents: 500000,
      lastSyncedAt: NOW - 20 * DAY,
    });
    const yieldPos = { balanceCents: 0, apyBasisPoints: 525 }; // 5.25%
    const results = detectIdleCash([account], yieldPos, NOW);
    expect(results).toHaveLength(1);
    // idleCash = 300000; annualYield = round(300000 * 525 / 10000) = 15750
    expect(results[0].dollarImpactCents).toBe(15750);
  });

  it("sums all checking accounts when calculating total balance", () => {
    const acc1 = makeAccount({ id: "acc_1", balanceCents: 300000, lastSyncedAt: NOW - 20 * DAY });
    const acc2 = makeAccount({ id: "acc_2", balanceCents: 200000, lastSyncedAt: NOW - 15 * DAY });
    // total = 500000, idle = 500000 - 200000 = 300000 > 100000
    const results = detectIdleCash([acc1, acc2], null, NOW);
    expect(results).toHaveLength(1);
  });
});

// ─── detectSpendingSpike ──────────────────────────────────────────────────────

describe("detectSpendingSpike", () => {
  it("detects a spending spike > 40% over historical average", () => {
    const currentMonthStart = NOW - 30 * DAY;
    const threeMonthsAgo = NOW - 90 * DAY;

    // Historical: ~$100/month in Dining for 3 months
    const historical: Transaction[] = [
      makeTxn({ id: "h1", category: "Dining", amountCents: -10000, transactedAt: threeMonthsAgo + 10 * DAY }),
      makeTxn({ id: "h2", category: "Dining", amountCents: -10000, transactedAt: threeMonthsAgo + 40 * DAY }),
      makeTxn({ id: "h3", category: "Dining", amountCents: -10000, transactedAt: threeMonthsAgo + 70 * DAY }),
    ];
    // Current: $200 spent this month — 200% of $100 avg = spike
    const current: Transaction[] = [
      makeTxn({ id: "c1", category: "Dining", amountCents: -20000, transactedAt: currentMonthStart + 5 * DAY }),
    ];

    const results = detectSpendingSpike([...historical, ...current], NOW);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("spending_spike");
    expect(results[0].category).toBe("pattern");
    expect(results[0].entityId).toBe("Dining");
  });

  it("skips when delta is less than $20 even if ratio is high", () => {
    const currentMonthStart = NOW - 30 * DAY;
    const threeMonthsAgo = NOW - 90 * DAY;

    const historical: Transaction[] = [
      makeTxn({ id: "h1", category: "Coffee", amountCents: -500, transactedAt: threeMonthsAgo + 10 * DAY }),
      makeTxn({ id: "h2", category: "Coffee", amountCents: -500, transactedAt: threeMonthsAgo + 40 * DAY }),
      makeTxn({ id: "h3", category: "Coffee", amountCents: -500, transactedAt: threeMonthsAgo + 70 * DAY }),
    ];
    const current: Transaction[] = [
      makeTxn({ id: "c1", category: "Coffee", amountCents: -1500, transactedAt: currentMonthStart + 5 * DAY }),
    ];
    // ratio = 1500 / (1500/3) = 3x spike, but delta = 1500 - 500 = 1000 cents ($10) < $20
    const results = detectSpendingSpike([...historical, ...current], NOW);
    expect(results).toHaveLength(0);
  });

  it("skips when no historical data for the category", () => {
    const currentMonthStart = NOW - 30 * DAY;
    const current: Transaction[] = [
      makeTxn({ id: "c1", category: "Travel", amountCents: -50000, transactedAt: currentMonthStart + 5 * DAY }),
    ];
    const results = detectSpendingSpike(current, NOW);
    expect(results).toHaveLength(0);
  });

  it("skips if ratio is below 1.4x threshold", () => {
    // Historical window is [NOW-90d, NOW-30d). Use timestamps well inside that window.
    const currentMonthStart = NOW - 30 * DAY;
    const threeMonthsAgo = NOW - 90 * DAY;

    const historical: Transaction[] = [
      // Spread across the 60-day historical window (31d, 50d, 80d before NOW)
      makeTxn({ id: "h1", category: "Groceries", amountCents: -30000, transactedAt: NOW - 31 * DAY }),
      makeTxn({ id: "h2", category: "Groceries", amountCents: -30000, transactedAt: NOW - 50 * DAY }),
      makeTxn({ id: "h3", category: "Groceries", amountCents: -30000, transactedAt: threeMonthsAgo + 5 * DAY }),
    ];
    const current: Transaction[] = [
      makeTxn({ id: "c1", category: "Groceries", amountCents: -35000, transactedAt: currentMonthStart + 5 * DAY }),
    ];
    // historicalMonthly = (30000+30000+30000)/3 = 30000
    // ratio = 35000 / 30000 ≈ 1.17 — below 1.4 threshold
    const results = detectSpendingSpike([...historical, ...current], NOW);
    expect(results).toHaveLength(0);
  });

  it("uses null category as 'Other'", () => {
    const currentMonthStart = NOW - 30 * DAY;
    const threeMonthsAgo = NOW - 90 * DAY;

    const historical: Transaction[] = [
      makeTxn({ id: "h1", category: null, amountCents: -5000, transactedAt: threeMonthsAgo + 10 * DAY }),
      makeTxn({ id: "h2", category: null, amountCents: -5000, transactedAt: threeMonthsAgo + 40 * DAY }),
      makeTxn({ id: "h3", category: null, amountCents: -5000, transactedAt: threeMonthsAgo + 70 * DAY }),
    ];
    const current: Transaction[] = [
      makeTxn({ id: "c1", category: null, amountCents: -15000, transactedAt: currentMonthStart + 5 * DAY }),
    ];
    const results = detectSpendingSpike([...historical, ...current], NOW);
    expect(results).toHaveLength(1);
    expect(results[0].entityId).toBe("Other");
  });
});

// ─── scoreInsight ─────────────────────────────────────────────────────────────

describe("scoreInsight", () => {
  function makeRawInsight(overrides: Partial<RawInsight> = {}): RawInsight {
    return {
      type: "unused_subscription",
      category: "savings",
      title: "Test",
      body: "Test body",
      dollarImpactCents: 10000, // $100
      urgency: 50,
      entityType: "subscription",
      entityId: "sub_123",
      metadata: {},
      ...overrides,
    };
  }

  it("returns a higher score for higher dollar impact", () => {
    const low = makeRawInsight({ dollarImpactCents: 1000 }); // $10
    const high = makeRawInsight({ dollarImpactCents: 50000 }); // $500
    expect(scoreInsight(high)).toBeGreaterThan(scoreInsight(low));
  });

  it("returns a higher score for higher urgency", () => {
    const lowUrgency = makeRawInsight({ urgency: 10 });
    const highUrgency = makeRawInsight({ urgency: 90 });
    expect(scoreInsight(highUrgency)).toBeGreaterThan(scoreInsight(lowUrgency));
  });

  it("adds personalization bonus when entityId is present", () => {
    const withEntity = makeRawInsight({ entityId: "sub_123" });
    // Omit entityId entirely so it's absent (not set to undefined)
    const { entityId: _omitted, ...baseWithout } = makeRawInsight();
    const withoutEntity: RawInsight = baseWithout;
    expect(scoreInsight(withEntity)).toBeGreaterThan(scoreInsight(withoutEntity));
  });

  it("caps dollar impact contribution at $100", () => {
    const at100 = makeRawInsight({ dollarImpactCents: 10000 }); // $100 — max
    const at500 = makeRawInsight({ dollarImpactCents: 50000 }); // $500 — over max, same score
    expect(scoreInsight(at100)).toBe(scoreInsight(at500));
  });

  it("returns a score between 0 and 100 for normal inputs", () => {
    const insight = makeRawInsight();
    const score = scoreInsight(insight);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("produces a maximum score for a high-impact, high-urgency, entity-specific insight", () => {
    const topInsight = makeRawInsight({
      dollarImpactCents: 100000, // maxed out
      urgency: 100,
      entityId: "sub_abc",
    });
    // 40 (dollar) + 30 (urgency) + 20 (entity) + 5 (interest) = 95
    expect(scoreInsight(topInsight)).toBe(95);
  });
});
