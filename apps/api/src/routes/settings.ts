/**
 * PRD-044: Settings & Configuration Hub
 * Notification preferences, profile settings.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok } from "../lib/response.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

// ── Notification Preferences ────────────────────────────────────────────────

type NotificationPrefs = {
  agentActions: boolean;
  billReminders: boolean;
  unusualCharges: boolean;
  insights: boolean;
  yieldUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  timezone: string;
};

type DbNotifPrefs = {
  agent_actions: number;
  bill_reminders: number;
  unusual_charges: number;
  insights: number;
  yield_updates: number;
  quiet_hours_enabled: number;
  quiet_hours_start: number;
  quiet_hours_end: number;
  timezone: string;
};

function toPrefs(r: DbNotifPrefs): NotificationPrefs {
  return {
    agentActions: r.agent_actions === 1,
    billReminders: r.bill_reminders === 1,
    unusualCharges: r.unusual_charges === 1,
    insights: r.insights === 1,
    yieldUpdates: r.yield_updates === 1,
    quietHoursEnabled: r.quiet_hours_enabled === 1,
    quietHoursStart: r.quiet_hours_start,
    quietHoursEnd: r.quiet_hours_end,
    timezone: r.timezone,
  };
}

const DEFAULT_PREFS: NotificationPrefs = {
  agentActions: true,
  billReminders: true,
  unusualCharges: true,
  insights: true,
  yieldUpdates: false,
  quietHoursEnabled: true,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  timezone: "America/New_York",
};

router.get("/notifications", async (c) => {
  const userId = c.get("userId");
  const row = await c.env.DB
    .prepare("SELECT * FROM notification_preferences WHERE user_id = ?")
    .bind(userId)
    .first<DbNotifPrefs>();

  if (!row) return c.json(ok(DEFAULT_PREFS));
  return c.json(ok(toPrefs(row)));
});

const notifPatchSchema = z.object({
  agentActions: z.boolean().optional(),
  billReminders: z.boolean().optional(),
  unusualCharges: z.boolean().optional(),
  insights: z.boolean().optional(),
  yieldUpdates: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.number().int().min(0).max(23).optional(),
  quietHoursEnd: z.number().int().min(0).max(23).optional(),
  timezone: z.string().optional(),
});

router.patch("/notifications", zValidator("json", notifPatchSchema), async (c) => {
  const userId = c.get("userId");
  const patch = c.req.valid("json");
  const now = Math.floor(Date.now() / 1000);

  // Upsert: get existing or use defaults
  const existing = await c.env.DB
    .prepare("SELECT * FROM notification_preferences WHERE user_id = ?")
    .bind(userId)
    .first<DbNotifPrefs>();

  const current: NotificationPrefs = existing ? toPrefs(existing) : DEFAULT_PREFS;
  const updated: NotificationPrefs = {
    agentActions: patch.agentActions ?? current.agentActions,
    billReminders: patch.billReminders ?? current.billReminders,
    unusualCharges: patch.unusualCharges ?? current.unusualCharges,
    insights: patch.insights ?? current.insights,
    yieldUpdates: patch.yieldUpdates ?? current.yieldUpdates,
    quietHoursEnabled: patch.quietHoursEnabled ?? current.quietHoursEnabled,
    quietHoursStart: patch.quietHoursStart ?? current.quietHoursStart,
    quietHoursEnd: patch.quietHoursEnd ?? current.quietHoursEnd,
    timezone: patch.timezone ?? current.timezone,
  };

  await c.env.DB
    .prepare(
      `INSERT INTO notification_preferences
         (user_id, agent_actions, bill_reminders, unusual_charges, insights,
          yield_updates, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         agent_actions = excluded.agent_actions,
         bill_reminders = excluded.bill_reminders,
         unusual_charges = excluded.unusual_charges,
         insights = excluded.insights,
         yield_updates = excluded.yield_updates,
         quiet_hours_enabled = excluded.quiet_hours_enabled,
         quiet_hours_start = excluded.quiet_hours_start,
         quiet_hours_end = excluded.quiet_hours_end,
         timezone = excluded.timezone,
         updated_at = excluded.updated_at`
    )
    .bind(
      userId,
      updated.agentActions ? 1 : 0,
      updated.billReminders ? 1 : 0,
      updated.unusualCharges ? 1 : 0,
      updated.insights ? 1 : 0,
      updated.yieldUpdates ? 1 : 0,
      updated.quietHoursEnabled ? 1 : 0,
      updated.quietHoursStart,
      updated.quietHoursEnd,
      updated.timezone,
      now
    )
    .run();

  return c.json(ok(updated));
});

// ── Profile ─────────────────────────────────────────────────────────────────

router.get("/profile", async (c) => {
  const userId = c.get("userId");
  const user = await c.env.DB
    .prepare("SELECT id, email, created_at FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; email: string; created_at: number }>();

  if (!user) return c.json(ok(null));
  return c.json(ok({ id: user.id, email: user.email, createdAt: user.created_at }));
});

const profilePatchSchema = z.object({
  email: z.string().email().optional(),
});

router.patch("/profile", zValidator("json", profilePatchSchema), async (c) => {
  const userId = c.get("userId");
  const { email } = c.req.valid("json");

  if (email !== undefined) {
    await c.env.DB
      .prepare("UPDATE users SET email = ? WHERE id = ?")
      .bind(email.toLowerCase(), userId)
      .run();
  }

  const user = await c.env.DB
    .prepare("SELECT id, email, created_at FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; email: string; created_at: number }>();

  return c.json(ok({ id: user?.id, email: user?.email, createdAt: user?.created_at }));
});

export { router as settingsRouter };
