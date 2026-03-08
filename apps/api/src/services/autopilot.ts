/**
 * Autopilot service — manages autopilot settings, guardrail evaluation,
 * and trust score calculation.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { generateId } from "../lib/id.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutopilotTier = 0 | 1 | 2 | 3;

export type AutopilotSettings = {
  id: string;
  userId: string;
  enabled: boolean;
  tier: AutopilotTier;
  dailyLimitCents: number;
  singleActionLimitCents: number;
  nightFreezeEnabled: boolean;
  nightFreezeStartHour: number;
  nightFreezeEndHour: number;
  billPaymentLimitCents: number;
  yieldSweepInLimitCents: number;
  yieldSweepOutLimitCents: number;
  requireApprovalSubscriptionCancel: boolean;
  alwaysAutopay: string[];
  neverAutopay: string[];
  createdAt: number;
  updatedAt: number;
};

export type ActionRiskLevel = "low" | "medium" | "high" | "critical";

export type EvaluationResult = {
  decision: "auto_approved" | "requires_approval";
  riskLevel: ActionRiskLevel;
  reason: string;
};

export type TrustScore = {
  score: number;        // 0–100
  label: string;        // plain-English description
  undoRate: number;     // 0–1
  totalActions: number;
  undoneActions: number;
};

type DbAutopilotSettings = {
  id: string;
  user_id: string;
  enabled: number;
  tier: number;
  daily_limit_cents: number;
  single_action_limit_cents: number;
  night_freeze_enabled: number;
  night_freeze_start_hour: number;
  night_freeze_end_hour: number;
  bill_payment_limit_cents: number;
  yield_sweep_in_limit_cents: number;
  yield_sweep_out_limit_cents: number;
  require_approval_subscription_cancel: number;
  always_autopay: string;
  never_autopay: string;
  created_at: number;
  updated_at: number;
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(db: D1Database, userId: string): Promise<AutopilotSettings> {
  const row = await db
    .prepare("SELECT * FROM autopilot_settings WHERE user_id = ?")
    .bind(userId)
    .first<DbAutopilotSettings>();

  if (row) return toSettings(row);

  // Create defaults for new user
  const now = Math.floor(Date.now() / 1000);
  const id = generateId("apt");
  await db
    .prepare(
      `INSERT INTO autopilot_settings (
        id, user_id, enabled, tier, daily_limit_cents, single_action_limit_cents,
        night_freeze_enabled, night_freeze_start_hour, night_freeze_end_hour,
        bill_payment_limit_cents, yield_sweep_in_limit_cents, yield_sweep_out_limit_cents,
        require_approval_subscription_cancel, always_autopay, never_autopay,
        created_at, updated_at
      ) VALUES (?, ?, 0, 0, 50000, 20000, 0, 22, 8, 50000, 100000, 50000, 1, '[]', '[]', ?, ?)`
    )
    .bind(id, userId, now, now)
    .run();

  return {
    id,
    userId,
    enabled: false,
    tier: 0,
    dailyLimitCents: 50000,
    singleActionLimitCents: 20000,
    nightFreezeEnabled: false,
    nightFreezeStartHour: 22,
    nightFreezeEndHour: 8,
    billPaymentLimitCents: 50000,
    yieldSweepInLimitCents: 100000,
    yieldSweepOutLimitCents: 50000,
    requireApprovalSubscriptionCancel: true,
    alwaysAutopay: [],
    neverAutopay: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateSettings(
  db: D1Database,
  userId: string,
  patch: Partial<Omit<AutopilotSettings, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<AutopilotSettings> {
  // Ensure settings exist first
  const current = await getSettings(db, userId);
  const now = Math.floor(Date.now() / 1000);

  const merged = { ...current, ...patch };

  await db
    .prepare(
      `UPDATE autopilot_settings SET
        enabled = ?, tier = ?, daily_limit_cents = ?, single_action_limit_cents = ?,
        night_freeze_enabled = ?, night_freeze_start_hour = ?, night_freeze_end_hour = ?,
        bill_payment_limit_cents = ?, yield_sweep_in_limit_cents = ?,
        yield_sweep_out_limit_cents = ?, require_approval_subscription_cancel = ?,
        always_autopay = ?, never_autopay = ?, updated_at = ?
      WHERE user_id = ?`
    )
    .bind(
      merged.enabled ? 1 : 0,
      merged.tier,
      merged.dailyLimitCents,
      merged.singleActionLimitCents,
      merged.nightFreezeEnabled ? 1 : 0,
      merged.nightFreezeStartHour,
      merged.nightFreezeEndHour,
      merged.billPaymentLimitCents,
      merged.yieldSweepInLimitCents,
      merged.yieldSweepOutLimitCents,
      merged.requireApprovalSubscriptionCancel ? 1 : 0,
      JSON.stringify(merged.alwaysAutopay),
      JSON.stringify(merged.neverAutopay),
      now,
      userId
    )
    .run();

  return { ...merged, updatedAt: now };
}

// ─── Guardrail Evaluation ─────────────────────────────────────────────────────

export type ActionType =
  | "bill_payment"
  | "yield_sweep_in"
  | "yield_sweep_out"
  | "subscription_cancel"
  | "subscription_flag"
  | "rate_negotiation";

export async function evaluateAction(
  db: D1Database,
  userId: string,
  actionType: ActionType,
  amountCents: number,
  billerName?: string
): Promise<EvaluationResult> {
  const settings = await getSettings(db, userId);

  // Autopilot disabled — everything requires approval
  if (!settings.enabled) {
    return {
      decision: "requires_approval",
      riskLevel: "low",
      reason: "Autopilot is disabled. Enable it in settings to allow automatic actions.",
    };
  }

  // Tier 0 — suggestions only
  if (settings.tier === 0) {
    return {
      decision: "requires_approval",
      riskLevel: "low",
      reason: "Your autopilot is set to suggestions only. Update your tier to allow automatic actions.",
    };
  }

  // Subscription cancel always requires approval (unless user turned off)
  if (actionType === "subscription_cancel" && settings.requireApprovalSubscriptionCancel) {
    return {
      decision: "requires_approval",
      riskLevel: "high",
      reason: "Subscription cancellations always require your approval.",
    };
  }

  // Never-autopay biller check
  if (billerName && settings.neverAutopay.includes(billerName)) {
    return {
      decision: "requires_approval",
      riskLevel: "medium",
      reason: `You've set "${billerName}" to always require approval.`,
    };
  }

  // Single action limit
  if (amountCents > settings.singleActionLimitCents) {
    return {
      decision: "requires_approval",
      riskLevel: "high",
      reason: `This action ($${(amountCents / 100).toFixed(2)}) exceeds your single-action limit ($${(settings.singleActionLimitCents / 100).toFixed(2)}).`,
    };
  }

  // Critical threshold — actions over $1,000 always high risk
  if (amountCents > 100000) {
    return {
      decision: "requires_approval",
      riskLevel: "critical",
      reason: `Actions over $1,000 always require your explicit approval.`,
    };
  }

  // Per-category limits
  const categoryLimit = getCategoryLimit(settings, actionType);
  if (categoryLimit !== null && amountCents > categoryLimit) {
    return {
      decision: "requires_approval",
      riskLevel: "medium",
      reason: `This ${actionType.replace("_", " ")} ($${(amountCents / 100).toFixed(2)}) exceeds your category limit ($${(categoryLimit / 100).toFixed(2)}).`,
    };
  }

  // Daily spend limit check
  const todaySpent = await getDailySpentCents(db, userId);
  if (todaySpent + amountCents > settings.dailyLimitCents) {
    return {
      decision: "requires_approval",
      riskLevel: "high",
      reason: `This would exceed your daily limit of $${(settings.dailyLimitCents / 100).toFixed(2)}. Spent today: $${(todaySpent / 100).toFixed(2)}.`,
    };
  }

  // Night freeze
  if (settings.nightFreezeEnabled && isNightFreeze(settings.nightFreezeStartHour, settings.nightFreezeEndHour)) {
    return {
      decision: "requires_approval",
      riskLevel: "low",
      reason: "Autopilot is paused during your quiet hours.",
    };
  }

  // Determine risk level for auto-approved actions
  const riskLevel = classifyRisk(actionType, amountCents);

  return {
    decision: "auto_approved",
    riskLevel,
    reason: riskLevel === "low"
      ? "Within your autopilot limits."
      : "Within your limits — you'll be notified immediately.",
  };
}

function getCategoryLimit(settings: AutopilotSettings, actionType: ActionType): number | null {
  switch (actionType) {
    case "bill_payment":
      return settings.billPaymentLimitCents;
    case "yield_sweep_in":
      return settings.yieldSweepInLimitCents;
    case "yield_sweep_out":
      return settings.yieldSweepOutLimitCents;
    default:
      return null;
  }
}

function classifyRisk(actionType: ActionType, amountCents: number): ActionRiskLevel {
  if (amountCents > 50000) return "high"; // > $500
  if (amountCents > 20000) return "medium"; // > $200
  if (actionType === "subscription_cancel") return "high";
  return "low";
}

function isNightFreeze(startHour: number, endHour: number): boolean {
  const currentHour = new Date().getUTCHours(); // UTC; real impl would use user TZ
  if (startHour > endHour) {
    // Crosses midnight: e.g. 22–8
    return currentHour >= startHour || currentHour < endHour;
  }
  return currentHour >= startHour && currentHour < endHour;
}

async function getDailySpentCents(db: D1Database, userId: string): Promise<number> {
  const startOfDay = Math.floor(Date.now() / 1000) - ((Math.floor(Date.now() / 1000) % 86400));
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) as total
       FROM agent_actions
       WHERE user_id = ?
         AND approval_status IN ('auto_approved', 'approved')
         AND status = 'completed'
         AND created_at >= ?`
    )
    .bind(userId, startOfDay)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

// ─── Trust Score ──────────────────────────────────────────────────────────────

export async function calculateTrustScore(db: D1Database, userId: string): Promise<TrustScore> {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;

  const row = await db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'reversed' THEN 1 ELSE 0 END) as undone
       FROM agent_actions
       WHERE user_id = ? AND created_at >= ? AND approval_status IN ('auto_approved', 'approved')`
    )
    .bind(userId, thirtyDaysAgo)
    .first<{ total: number; undone: number }>();

  const total = row?.total ?? 0;
  const undone = row?.undone ?? 0;

  if (total === 0) {
    return {
      score: 70, // neutral baseline for new users
      label: "Getting started",
      undoRate: 0,
      totalActions: 0,
      undoneActions: 0,
    };
  }

  const undoRate = undone / total;
  const score = Math.max(0, Math.min(100, Math.round(100 - undoRate * 40)));

  return {
    score,
    label: getTrustLabel(score),
    undoRate,
    totalActions: total,
    undoneActions: undone,
  };
}

export function getTrustLabel(score: number): string {
  if (score >= 90) return "Highly trusted";
  if (score >= 75) return "Trusted for routine bills";
  if (score >= 60) return "Building trust";
  if (score >= 40) return "Limited trust";
  return "Low trust — review recent actions";
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function toSettings(r: DbAutopilotSettings): AutopilotSettings {
  return {
    id: r.id,
    userId: r.user_id,
    enabled: r.enabled === 1,
    tier: r.tier as AutopilotTier,
    dailyLimitCents: r.daily_limit_cents,
    singleActionLimitCents: r.single_action_limit_cents,
    nightFreezeEnabled: r.night_freeze_enabled === 1,
    nightFreezeStartHour: r.night_freeze_start_hour,
    nightFreezeEndHour: r.night_freeze_end_hour,
    billPaymentLimitCents: r.bill_payment_limit_cents,
    yieldSweepInLimitCents: r.yield_sweep_in_limit_cents,
    yieldSweepOutLimitCents: r.yield_sweep_out_limit_cents,
    requireApprovalSubscriptionCancel: r.require_approval_subscription_cancel === 1,
    alwaysAutopay: JSON.parse(r.always_autopay) as string[],
    neverAutopay: JSON.parse(r.never_autopay) as string[],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
