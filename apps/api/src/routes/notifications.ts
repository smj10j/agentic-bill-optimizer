/**
 * PRD-006: Push Notifications & Alerts
 * In-app notification feed + push subscription management.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, err } from "../lib/response.js";
import * as notificationService from "../services/notifications.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

// ── GET / — in-app notification feed ──────────────────────────────────────────

router.get("/", async (c) => {
  const userId = c.get("userId");
  const unreadOnly = c.req.query("unread") === "true";
  const notifications = await notificationService.getNotifications(c.env.DB, userId, { unreadOnly });
  const unreadCount = await notificationService.getUnreadCount(c.env.DB, userId);
  return c.json(ok({ notifications, unreadCount }));
});

// ── POST /:id/read ─────────────────────────────────────────────────────────────

router.post("/:id/read", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const marked = await notificationService.markRead(c.env.DB, id, userId);
  if (!marked) return c.json(err("NOT_FOUND", "Notification not found"), 404);
  return c.json(ok({ read: true }));
});

// ── POST /read-all ─────────────────────────────────────────────────────────────

router.post("/read-all", async (c) => {
  const userId = c.get("userId");
  const count = await notificationService.markAllRead(c.env.DB, userId);
  return c.json(ok({ markedRead: count }));
});

// ── DELETE /:id ────────────────────────────────────────────────────────────────

router.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const dismissed = await notificationService.dismissNotification(c.env.DB, id, userId);
  if (!dismissed) return c.json(err("NOT_FOUND", "Notification not found"), 404);
  return c.json(ok({ dismissed: true }));
});

// ── POST /subscribe — register web push subscription ─────────────────────────

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
  deviceHint: z.string().optional(),
});

router.post("/subscribe", zValidator("json", subscribeSchema), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");
  await notificationService.savePushSubscription(c.env.DB, userId, {
    endpoint: body.endpoint,
    p256dh: body.p256dh,
    auth: body.auth,
    ...(body.deviceHint !== undefined ? { deviceHint: body.deviceHint } : {}),
  });
  return c.json(ok({ subscribed: true }));
});

// ── DELETE /subscribe — unregister push subscription ─────────────────────────

const unsubscribeSchema = z.object({ endpoint: z.string() });

router.delete("/subscribe", zValidator("json", unsubscribeSchema), async (c) => {
  const userId = c.get("userId");
  const { endpoint } = c.req.valid("json");
  await notificationService.removePushSubscription(c.env.DB, userId, endpoint);
  return c.json(ok({ unsubscribed: true }));
});

export { router as notificationsRouter };
