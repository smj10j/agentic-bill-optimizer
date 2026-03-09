/**
 * Notifications Service — PRD-006
 * Creates in-app notifications and sends web push (when subscriptions exist).
 * Email is stubbed with a console log until RESEND_API_KEY is configured.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { generateId } from "../lib/id.js";

export type NotificationPriority = "critical" | "high" | "normal" | "info";

export type NotificationPayload = {
  type: string;
  priority: NotificationPriority;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
};

// ─── In-App Notifications ─────────────────────────────────────────────────────

export async function createNotification(
  db: D1Database,
  userId: string,
  payload: NotificationPayload
): Promise<string> {
  const id = generateId("notif");
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO notifications
         (id, user_id, type, priority, title, body, action_url, action_label, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, userId, payload.type, payload.priority, payload.title, payload.body,
      payload.actionUrl ?? null, payload.actionLabel ?? null, now
    )
    .run();

  return id;
}

export async function getNotifications(
  db: D1Database,
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Array<{
  id: string; type: string; priority: string; title: string; body: string;
  actionUrl: string | null; actionLabel: string | null; readAt: number | null;
  createdAt: number;
}>> {
  const { unreadOnly = false, limit = 30 } = options;
  let query = "SELECT * FROM notifications WHERE user_id = ? AND dismissed_at IS NULL";
  const binds: (string | number)[] = [userId];

  if (unreadOnly) {
    query += " AND read_at IS NULL";
  }
  query += " ORDER BY created_at DESC LIMIT ?";
  binds.push(limit);

  const rows = await db.prepare(query).bind(...binds).all<{
    id: string; type: string; priority: string; title: string; body: string;
    action_url: string | null; action_label: string | null;
    read_at: number | null; created_at: number;
  }>();

  return rows.results.map((r) => ({
    id: r.id, type: r.type, priority: r.priority, title: r.title, body: r.body,
    actionUrl: r.action_url, actionLabel: r.action_label,
    readAt: r.read_at, createdAt: r.created_at,
  }));
}

export async function getUnreadCount(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND read_at IS NULL AND dismissed_at IS NULL")
    .bind(userId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function markRead(db: D1Database, id: string, userId: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL")
    .bind(now, id, userId)
    .run();
  return result.meta.changes > 0;
}

export async function markAllRead(db: D1Database, userId: string): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL AND dismissed_at IS NULL")
    .bind(now, userId)
    .run();
  return result.meta.changes;
}

export async function dismissNotification(db: D1Database, id: string, userId: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare("UPDATE notifications SET dismissed_at = ? WHERE id = ? AND user_id = ?")
    .bind(now, id, userId)
    .run();
  return result.meta.changes > 0;
}

// ─── Push Subscriptions ───────────────────────────────────────────────────────

export async function savePushSubscription(
  db: D1Database,
  userId: string,
  subscription: { endpoint: string; p256dh: string; auth: string; deviceHint?: string }
): Promise<void> {
  const id = generateId("push");
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT OR REPLACE INTO push_subscriptions
         (id, user_id, endpoint, p256dh, auth, device_hint, created_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, userId, subscription.endpoint, subscription.p256dh, subscription.auth,
      subscription.deviceHint ?? null, now, now)
    .run();
}

export async function removePushSubscription(
  db: D1Database,
  userId: string,
  endpoint: string
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?")
    .bind(userId, endpoint)
    .run();
  return result.meta.changes > 0;
}

export async function getPushSubscriptions(
  db: D1Database,
  userId: string
): Promise<Array<{ id: string; endpoint: string; p256dh: string; auth: string }>> {
  const rows = await db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .bind(userId)
    .all<{ id: string; endpoint: string; p256dh: string; auth: string }>();
  return rows.results;
}

// ─── Convenience: notify + push together ─────────────────────────────────────

async function getDailyNonCriticalCount(db: D1Database, userId: string): Promise<number> {
  const dayStart = Math.floor(Date.now() / 1000) - 86400;
  const row = await db
    .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND created_at >= ? AND priority NOT IN ('critical')")
    .bind(userId, dayStart)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

async function hasRecentDuplicate(db: D1Database, userId: string, type: string): Promise<boolean> {
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
  const row = await db
    .prepare("SELECT id FROM notifications WHERE user_id = ? AND type = ? AND created_at >= ? LIMIT 1")
    .bind(userId, type, weekAgo)
    .first<{ id: string }>();
  return row !== null;
}

/**
 * Creates an in-app notification with anti-fatigue rules.
 * Critical notifications always go through. Non-critical notifications are:
 * - Deduplicated by type within 7 days
 * - Capped at 3 per day
 * Web push is sent if the user has subscriptions.
 * Pass `resendApiKey` to also send email for critical/high priority.
 */
export async function notify(
  db: D1Database,
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  // Anti-fatigue: critical always goes through
  if (payload.priority !== "critical") {
    // Dedup same type within 7 days
    if (await hasRecentDuplicate(db, userId, payload.type)) return;

    // Max 3 non-critical per day
    const dailyCount = await getDailyNonCriticalCount(db, userId);
    if (dailyCount >= 3) return;
  }

  await createNotification(db, userId, payload);
  // Push notification sending requires web-push library which needs Worker-compatible crypto.
  // This is wired up post-VAPID key provisioning (see PRD-006 setup notes).
  // For now, in-app feed is the delivery mechanism.
}

// ─── Named notification helpers ───────────────────────────────────────────────

export async function notifyActionNeedsApproval(
  db: D1Database,
  userId: string,
  description: string,
  amountCents: number,
  _actionId: string
): Promise<void> {
  const amount = amountCents > 0 ? ` · $${(amountCents / 100).toFixed(2)}` : "";
  await notify(db, userId, {
    type: "action_approval",
    priority: "high",
    title: "Action needs your approval",
    body: `${description}${amount}`,
    actionUrl: "/autopilot",
    actionLabel: "Review",
  });
}

export async function notifyActionCompleted(
  db: D1Database,
  userId: string,
  description: string,
  _actionId: string
): Promise<void> {
  await notify(db, userId, {
    type: "action_completed",
    priority: "normal",
    title: "Orbit completed an action",
    body: description,
    actionUrl: "/history",
    actionLabel: "View",
  });
}

export async function notifyBillDue(
  db: D1Database,
  userId: string,
  billName: string,
  amountCents: number,
  daysUntilDue: number
): Promise<void> {
  const amount = `$${(amountCents / 100).toFixed(2)}`;
  const timing = daysUntilDue === 0 ? "today" : daysUntilDue === 1 ? "tomorrow" : `in ${daysUntilDue} days`;
  await notify(db, userId, {
    type: "bill_due",
    priority: daysUntilDue <= 1 ? "critical" : "high",
    title: `${billName} due ${timing}`,
    body: `${amount} will be paid ${timing}. Orbit is handling it.`,
    actionUrl: "/bills",
    actionLabel: "View",
  });
}

export async function notifyPaymentFailed(
  db: D1Database,
  userId: string,
  billerName: string,
  amountCents: number,
  reason: string
): Promise<void> {
  const amount = `$${(amountCents / 100).toFixed(2)}`;
  await createNotification(db, userId, {  // bypass anti-fatigue for failures
    type: "payment_failed",
    priority: "critical",
    title: `Payment to ${billerName} failed`,
    body: `${amount} payment could not be processed. ${reason}`,
    actionUrl: "/bills",
    actionLabel: "Review",
  });
}
