/**
 * PRD-007: Proactive Agent Insights
 * Three-layer architecture: Detection → Scoring → (Claude narrative optional)
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { Transaction, Subscription, Account, YieldPosition } from "@orbit/shared";
import { generateId } from "../lib/id.js";

export type InsightCategory = "savings" | "risk" | "pattern" | "yield";
export type InsightStatus = "new" | "delivered" | "viewed" | "acted" | "dismissed" | "expired";
export type InsightFeedback = "helpful" | "not_helpful" | "acted" | "dismissed";

export type RawInsight = {
  type: string;
  category: InsightCategory;
  title: string;
  body: string;
  dollarImpactCents: number;
  urgency: number; // 0-100
  entityType?: string;
  entityId?: string;
  metadata: Record<string, unknown>;
};

export type InsightRecord = {
  id: string;
  userId: string;
  type: string;
  category: InsightCategory;
  status: InsightStatus;
  title: string;
  body: string;
  dollarImpactCents: number | null;
  relevanceScore: number;
  urgency: number;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  feedback: string | null;
  deliveredAt: number | null;
  viewedAt: number | null;
  actedAt: number | null;
  dismissedAt: number | null;
  expiresAt: number;
  createdAt: number;
};

// ─── Layer 1: Detection Functions (pure — no DB) ─────────────────────────────

/**
 * Detects subscriptions that are active but unused for too long.
 * Thresholds: streaming=4wks, gym=6wks, software=8wks
 */
export function detectUnusedSubscriptions(
  subscriptions: Subscription[],
  transactions: Transaction[],
  nowSeconds: number
): RawInsight[] {
  const WEEK = 7 * 86400;
  // Category-based thresholds (weeks of inactivity before flagging)
  const thresholds: Record<string, number> = {
    streaming: 4 * WEEK,
    gym: 6 * WEEK,
    software: 8 * WEEK,
    default: 4 * WEEK,
  };

  const results: RawInsight[] = [];

  for (const sub of subscriptions) {
    if (sub.status === "cancelled") continue;

    const merchant = sub.merchantName.toLowerCase();
    let threshold = thresholds.default;
    if (merchant.includes("gym") || merchant.includes("fitness") || merchant.includes("peloton")) {
      threshold = thresholds.gym;
    } else if (merchant.includes("adobe") || merchant.includes("dropbox") || merchant.includes("microsoft") || merchant.includes("linkedin")) {
      threshold = thresholds.software;
    }

    // Find last transaction at this merchant
    const merchantTxns = transactions.filter((t) =>
      t.amountCents < 0 &&
      (t.merchantName?.toLowerCase().includes(merchant) || t.description.toLowerCase().includes(merchant))
    );

    let lastUsedAt = sub.lastUsedAt;
    if (merchantTxns.length > 0) {
      lastUsedAt = Math.max(...merchantTxns.map((t) => t.transactedAt));
    }

    const inactiveDuration = nowSeconds - (lastUsedAt ?? nowSeconds);
    if (inactiveDuration < threshold) continue;

    const weeksUnused = Math.floor(inactiveDuration / WEEK);
    const monthlyAmount = sub.billingCycle === "annual"
      ? Math.round(sub.amountCents / 12)
      : sub.billingCycle === "weekly"
        ? Math.round(sub.amountCents * 52 / 12)
        : sub.amountCents;
    const annualCost = Math.round(monthlyAmount * 12);

    results.push({
      type: "unused_subscription",
      category: "savings",
      title: `${sub.merchantName} — unused for ${weeksUnused} weeks`,
      body: `You're paying $${(monthlyAmount / 100).toFixed(2)}/month for ${sub.merchantName} but haven't used it in ${weeksUnused} weeks. That's $${(annualCost / 100).toFixed(2)}/year.`,
      dollarImpactCents: annualCost,
      urgency: Math.min(30 + weeksUnused * 3, 60),
      entityType: "subscription",
      entityId: sub.id,
      metadata: { merchantName: sub.merchantName, weeksUnused, monthlyAmountCents: monthlyAmount },
    });
  }

  return results;
}

/**
 * Detects price increases: same biller, same cycle, amount > trailing 3-month avg by more than 5%.
 */
export function detectPriceIncreases(
  subscriptions: Subscription[],
  transactions: Transaction[],
  nowSeconds: number
): RawInsight[] {
  const THREE_MONTHS = 90 * 86400;
  const results: RawInsight[] = [];

  for (const sub of subscriptions) {
    if (sub.status === "cancelled") continue;

    const merchant = sub.merchantName.toLowerCase();
    const window = nowSeconds - THREE_MONTHS;

    const subTxns = transactions
      .filter((t) =>
        t.amountCents < 0 &&
        t.transactedAt >= window &&
        (t.merchantName?.toLowerCase() === merchant || t.description.toLowerCase().includes(merchant))
      )
      .sort((a, b) => b.transactedAt - a.transactedAt);

    if (subTxns.length < 3) continue; // Need enough history

    // Most recent charge vs average of older charges
    const recentAmount = Math.abs(subTxns[0].amountCents);
    const olderAmounts = subTxns.slice(1).map((t) => Math.abs(t.amountCents));
    const avgOlder = olderAmounts.reduce((s, v) => s + v, 0) / olderAmounts.length;

    if (avgOlder === 0) continue;
    const increaseRatio = (recentAmount - avgOlder) / avgOlder;
    if (increaseRatio < 0.05) continue; // Less than 5% increase — not significant

    const monthlyIncreaseCents = Math.round(recentAmount - avgOlder);
    const annualIncreaseCents = monthlyIncreaseCents * 12;

    results.push({
      type: "price_increase",
      category: "savings",
      title: `${sub.merchantName} price went up`,
      body: `Your ${sub.merchantName} bill increased by $${(monthlyIncreaseCents / 100).toFixed(2)}/month — that's $${(annualIncreaseCents / 100).toFixed(2)}/year more.`,
      dollarImpactCents: annualIncreaseCents,
      urgency: 50,
      entityType: "subscription",
      entityId: sub.id,
      metadata: {
        merchantName: sub.merchantName,
        previousAmountCents: Math.round(avgOlder),
        newAmountCents: recentAmount,
        increasePercent: Math.round(increaseRatio * 100),
      },
    });
  }

  return results;
}

/**
 * Detects potential duplicate charges: same merchant, similar amount (within 5%), within 72 hours.
 */
export function detectDuplicateCharges(
  transactions: Transaction[],
  nowSeconds: number
): RawInsight[] {
  const WINDOW = 72 * 3600;
  const LOOKBACK = 30 * 86400;
  const results: RawInsight[] = [];
  const seen = new Set<string>(); // merchant key

  const recent = transactions.filter(
    (t) => t.amountCents < 0 && t.transactedAt >= nowSeconds - LOOKBACK
  );

  for (let i = 0; i < recent.length; i++) {
    const a = recent[i];
    const merchantKey = (a.merchantName ?? a.description).toLowerCase();
    if (seen.has(merchantKey)) continue;

    for (let j = i + 1; j < recent.length; j++) {
      const b = recent[j];
      if (Math.abs(a.transactedAt - b.transactedAt) > WINDOW) continue;

      const bMerchant = (b.merchantName ?? b.description).toLowerCase();
      if (bMerchant !== merchantKey) continue;

      const amountA = Math.abs(a.amountCents);
      const amountB = Math.abs(b.amountCents);
      const diff = Math.abs(amountA - amountB) / Math.max(amountA, amountB);
      if (diff > 0.05) continue; // More than 5% different — likely not a duplicate

      seen.add(merchantKey);
      const displayName = a.merchantName ?? a.description;
      const dateA = new Date(a.transactedAt * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dateB = new Date(b.transactedAt * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

      results.push({
        type: "duplicate_charge",
        category: "savings",
        title: `Possible double-charge from ${displayName}`,
        body: `You may have been charged twice by ${displayName} — $${(amountA / 100).toFixed(2)} on ${dateA} and $${(amountB / 100).toFixed(2)} on ${dateB}. Is this expected?`,
        dollarImpactCents: Math.min(amountA, amountB),
        urgency: 70,
        entityType: "transaction",
        entityId: a.id,
        metadata: { merchantName: displayName, transaction1Id: a.id, transaction2Id: b.id, amount1Cents: amountA, amount2Cents: amountB },
      });
      break;
    }
  }

  return results;
}

/**
 * Detects idle cash: average checking balance > (2500 * 1.5) for 14+ days.
 * In practice we use lastSyncedAt as a proxy; real detection would use balance history.
 */
export function detectIdleCash(
  accounts: Account[],
  yieldPosition: Pick<YieldPosition, "balanceCents" | "apyBasisPoints"> | null,
  nowSeconds: number
): RawInsight[] {
  const FLOAT_FLOOR = 200000; // $2,000 minimum float in cents
  const MIN_IDLE_CENTS = 100000; // $1,000 to be worth surfacing
  const DAYS_THRESHOLD = 14;

  const results: RawInsight[] = [];
  const checkingAccounts = accounts.filter(
    (a) => a.accountType === "checking" && a.connectionStatus !== "disconnected"
  );

  const totalChecking = checkingAccounts.reduce((s, a) => s + a.balanceCents, 0);
  const inYield = yieldPosition?.balanceCents ?? 0;
  const idleCash = totalChecking - FLOAT_FLOOR - inYield;

  if (idleCash < MIN_IDLE_CENTS) return results;

  // Check if funds have been sitting: use lastSyncedAt as a proxy
  const oldestSync = checkingAccounts
    .map((a) => a.lastSyncedAt ?? 0)
    .reduce((min, v) => Math.min(min, v), nowSeconds);

  const daysIdle = Math.floor((nowSeconds - oldestSync) / 86400);
  if (daysIdle < DAYS_THRESHOLD) return results;

  // Estimate missed yield at current rate (assume 5% APY baseline)
  const apyBasisPoints = yieldPosition?.apyBasisPoints ?? 500;
  const annualYield = Math.round(idleCash * apyBasisPoints / 10000);
  const missedYield = Math.round(annualYield * daysIdle / 365);

  results.push({
    type: "idle_cash",
    category: "yield",
    title: "Cash sitting idle in checking",
    body: `You have ~$${(idleCash / 100).toFixed(0)} above your float minimum in checking, earning near 0%. At current rates, that's ~$${(annualYield / 100).toFixed(0)}/year in potential yield.`,
    dollarImpactCents: annualYield,
    urgency: 40,
    entityType: "account",
    entityId: checkingAccounts[0]?.id,
    metadata: { idleCashCents: idleCash, daysIdle, missedYieldCents: missedYield, apyBasisPoints },
  });

  return results;
}

/**
 * Detects spending spikes: category spending > 1.4× trailing 3-month average.
 * Minimum $20 delta.
 */
export function detectSpendingSpike(
  transactions: Transaction[],
  nowSeconds: number
): RawInsight[] {
  const DAY = 86400;
  const SPIKE_RATIO = 1.4;
  const MIN_DELTA_CENTS = 2000; // $20

  const currentMonthStart = nowSeconds - 30 * DAY;
  const threeMonthsAgo = nowSeconds - 90 * DAY;

  // Current month spending by category
  const currentSpend: Record<string, number> = {};
  for (const t of transactions) {
    if (t.amountCents >= 0 || t.transactedAt < currentMonthStart) continue;
    const cat = t.category ?? "Other";
    currentSpend[cat] = (currentSpend[cat] ?? 0) + Math.abs(t.amountCents);
  }

  // Historical spending (3-month window, excluding current month) by category
  const historicalSpend: Record<string, number[]> = {};
  for (const t of transactions) {
    if (t.amountCents >= 0 || t.transactedAt >= currentMonthStart || t.transactedAt < threeMonthsAgo) continue;
    const cat = t.category ?? "Other";
    if (!historicalSpend[cat]) historicalSpend[cat] = [];
    historicalSpend[cat].push(Math.abs(t.amountCents));
  }

  const results: RawInsight[] = [];

  for (const [category, currentCents] of Object.entries(currentSpend)) {
    const historical = historicalSpend[category];
    if (!historical || historical.length === 0) continue;

    const historicalMonthly = historical.reduce((s, v) => s + v, 0) / 3; // avg per month
    if (historicalMonthly === 0) continue;

    const ratio = currentCents / historicalMonthly;
    const deltaCents = currentCents - historicalMonthly;

    if (ratio < SPIKE_RATIO || deltaCents < MIN_DELTA_CENTS) continue;

    const overPercent = Math.round((ratio - 1) * 100);

    results.push({
      type: "spending_spike",
      category: "pattern",
      title: `${category} spending is up ${overPercent}% this month`,
      body: `You've spent $${(currentCents / 100).toFixed(0)} on ${category} this month — ${overPercent}% more than your $${(historicalMonthly / 100).toFixed(0)} monthly average.`,
      dollarImpactCents: Math.round(deltaCents),
      urgency: Math.min(20 + overPercent, 60),
      entityType: "category",
      entityId: category,
      metadata: { category, currentCents, historicalMonthlyCents: Math.round(historicalMonthly), overPercent },
    });
  }

  return results;
}

// ─── Layer 2: Scoring ─────────────────────────────────────────────────────────

export function scoreInsight(insight: RawInsight): number {
  // dollar_impact (40%) normalized at $100 = 100 percentile
  const dollarScore = Math.min(insight.dollarImpactCents / 10000, 1) * 40;
  // urgency (30%)
  const urgencyScore = (insight.urgency / 100) * 30;
  // personalization (20%) — use entity specificity as proxy
  const personalizationScore = insight.entityId ? 20 : 10;
  // user interest (10%) — defaulted to 5 (neutral) since we don't have history yet
  const interestScore = 5;

  return Math.round(dollarScore + urgencyScore + personalizationScore + interestScore);
}

// ─── DB Operations ────────────────────────────────────────────────────────────

type DbInsight = {
  id: string;
  user_id: string;
  type: string;
  category: string;
  status: string;
  title: string;
  body: string;
  dollar_impact_cents: number | null;
  relevance_score: number;
  urgency: number;
  entity_type: string | null;
  entity_id: string | null;
  metadata: string;
  feedback: string | null;
  delivered_at: number | null;
  viewed_at: number | null;
  acted_at: number | null;
  dismissed_at: number | null;
  expires_at: number;
  created_at: number;
};

function toInsight(r: DbInsight): InsightRecord {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    category: r.category as InsightCategory,
    status: r.status as InsightStatus,
    title: r.title,
    body: r.body,
    dollarImpactCents: r.dollar_impact_cents,
    relevanceScore: r.relevance_score,
    urgency: r.urgency,
    entityType: r.entity_type,
    entityId: r.entity_id,
    metadata: JSON.parse(r.metadata) as Record<string, unknown>,
    feedback: r.feedback,
    deliveredAt: r.delivered_at,
    viewedAt: r.viewed_at,
    actedAt: r.acted_at,
    dismissedAt: r.dismissed_at,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  };
}

export async function createInsight(
  db: D1Database,
  userId: string,
  raw: RawInsight,
  relevanceScore: number
): Promise<string> {
  const id = generateId("ins");
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 30 * 86400; // 30 days

  await db
    .prepare(
      `INSERT INTO insights
         (id, user_id, type, category, status, title, body, dollar_impact_cents,
          relevance_score, urgency, entity_type, entity_id, metadata, expires_at, created_at)
       VALUES (?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, userId, raw.type, raw.category,
      raw.title, raw.body,
      raw.dollarImpactCents > 0 ? raw.dollarImpactCents : null,
      relevanceScore, raw.urgency,
      raw.entityType ?? null, raw.entityId ?? null,
      JSON.stringify(raw.metadata),
      expiresAt, now
    )
    .run();

  return id;
}

export async function getInsights(
  db: D1Database,
  userId: string,
  options: { activeOnly?: boolean; limit?: number } = {}
): Promise<InsightRecord[]> {
  const { activeOnly = true, limit = 20 } = options;
  const now = Math.floor(Date.now() / 1000);

  let query = "SELECT * FROM insights WHERE user_id = ? AND expires_at > ?";
  const binds: (string | number)[] = [userId, now];

  if (activeOnly) {
    query += " AND status NOT IN ('dismissed', 'expired')";
  }
  query += " ORDER BY relevance_score DESC, created_at DESC LIMIT ?";
  binds.push(limit);

  const rows = await db.prepare(query).bind(...binds).all<DbInsight>();
  return rows.results.map(toInsight);
}

export async function markViewed(db: D1Database, id: string, userId: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare("UPDATE insights SET status = 'viewed', viewed_at = ? WHERE id = ? AND user_id = ? AND status = 'new'")
    .bind(now, id, userId)
    .run();
  return result.meta.changes > 0;
}

export async function recordFeedback(
  db: D1Database,
  id: string,
  userId: string,
  feedback: InsightFeedback
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const statusMap: Record<InsightFeedback, string> = {
    helpful: "viewed",
    not_helpful: "dismissed",
    acted: "acted",
    dismissed: "dismissed",
  };
  const status = statusMap[feedback];
  const actedAt = feedback === "acted" ? now : null;
  const dismissedAt = feedback === "dismissed" || feedback === "not_helpful" ? now : null;

  const result = await db
    .prepare(
      `UPDATE insights SET feedback = ?, status = ?,
       acted_at = COALESCE(acted_at, ?),
       dismissed_at = COALESCE(dismissed_at, ?)
       WHERE id = ? AND user_id = ?`
    )
    .bind(feedback, status, actedAt, dismissedAt, id, userId)
    .run();
  return result.meta.changes > 0;
}

/**
 * Returns dedup keys (type:entityId) for insights created within the last N days.
 * Used to avoid surfacing the same insight twice in the window.
 */
export async function getRecentInsightKeys(
  db: D1Database,
  userId: string,
  days = 30
): Promise<Set<string>> {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const rows = await db
    .prepare("SELECT type, entity_id FROM insights WHERE user_id = ? AND created_at > ?")
    .bind(userId, since)
    .all<{ type: string; entity_id: string | null }>();

  return new Set(rows.results.map((r) => `${r.type}:${r.entity_id ?? "_"}`));
}

// ─── Layer 3: Detection Runner ───────────────────────────────────────────────

import * as finance from "./finance.js";

/**
 * Runs the full detection pipeline for a user and stores new insights.
 * Returns the IDs of newly created insights.
 */
export async function runInsightDetection(
  db: D1Database,
  userId: string
): Promise<string[]> {
  const MIN_SCORE = 30; // Minimum relevance score to store

  // Load all data in parallel
  const [accounts, subscriptions, , yieldPosition] = await Promise.all([
    finance.getAccounts(db, userId),
    finance.getSubscriptions(db, userId),
    finance.getBills(db, userId, { lookAheadDays: 60 }),
    finance.getOrCreateYieldPosition(db, userId),
  ]);

  const { transactions } = await finance.getTransactions(db, userId, {
    from: Math.floor(Date.now() / 1000) - 90 * 86400,
    limit: 500,
  });

  const nowSeconds = Math.floor(Date.now() / 1000);

  // Run all detection functions
  const candidates: RawInsight[] = [
    ...detectUnusedSubscriptions(subscriptions, transactions, nowSeconds),
    ...detectPriceIncreases(subscriptions, transactions, nowSeconds),
    ...detectDuplicateCharges(transactions, nowSeconds),
    ...detectIdleCash(accounts, yieldPosition, nowSeconds),
    ...detectSpendingSpike(transactions, nowSeconds),
  ];

  // Score candidates
  const scored = candidates
    .map((c) => ({ raw: c, score: scoreInsight(c) }))
    .filter(({ score }) => score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  // Load dedup keys
  const existingKeys = await getRecentInsightKeys(db, userId);

  // Store new insights
  const createdIds: string[] = [];
  for (const { raw, score } of scored) {
    const dedupKey = `${raw.type}:${raw.entityId ?? "_"}`;
    if (existingKeys.has(dedupKey)) continue;

    const id = await createInsight(db, userId, raw, score);
    createdIds.push(id);
    existingKeys.add(dedupKey); // prevent duplicates within same run
  }

  return createdIds;
}
