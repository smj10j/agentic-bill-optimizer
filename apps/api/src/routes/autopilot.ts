import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, err } from "../lib/response.js";
import * as autopilotService from "../services/autopilot.js";
import * as financeService from "../services/finance.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

// ── GET /settings ──────────────────────────────────────────────────────────────

router.get("/settings", async (c) => {
  const userId = c.get("userId");
  const settings = await autopilotService.getSettings(c.env.DB, userId);
  return c.json(ok(settings));
});

// ── PUT /settings ──────────────────────────────────────────────────────────────

const settingsPatchSchema = z.object({
  enabled: z.boolean().optional(),
  tier: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  dailyLimitCents: z.number().int().min(0).max(500000).optional(),
  singleActionLimitCents: z.number().int().min(0).max(200000).optional(),
  nightFreezeEnabled: z.boolean().optional(),
  nightFreezeStartHour: z.number().int().min(0).max(23).optional(),
  nightFreezeEndHour: z.number().int().min(0).max(23).optional(),
  billPaymentLimitCents: z.number().int().min(0).max(500000).optional(),
  yieldSweepInLimitCents: z.number().int().min(0).max(1000000).optional(),
  yieldSweepOutLimitCents: z.number().int().min(0).max(500000).optional(),
  requireApprovalSubscriptionCancel: z.boolean().optional(),
  alwaysAutopay: z.array(z.string()).optional(),
  neverAutopay: z.array(z.string()).optional(),
});

router.put("/settings", zValidator("json", settingsPatchSchema), async (c) => {
  const userId = c.get("userId");
  const raw = c.req.valid("json");
  // Strip undefined values so exactOptionalPropertyTypes is satisfied
  const patch = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined)
  ) as Parameters<typeof autopilotService.updateSettings>[2];
  const updated = await autopilotService.updateSettings(c.env.DB, userId, patch);
  return c.json(ok(updated));
});

// ── GET /trust-score ───────────────────────────────────────────────────────────

router.get("/trust-score", async (c) => {
  const userId = c.get("userId");
  const score = await autopilotService.calculateTrustScore(c.env.DB, userId);
  return c.json(ok(score));
});

// ── GET /actions/pending ───────────────────────────────────────────────────────

router.get("/actions/pending", async (c) => {
  const userId = c.get("userId");
  const actions = await financeService.getPendingActions(c.env.DB, userId);
  return c.json(ok(actions));
});

// ── POST /actions/:id/approve ─────────────────────────────────────────────────

router.post("/actions/:id/approve", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const approved = await financeService.approveAction(c.env.DB, id, userId);
  if (!approved) {
    return c.json(err("NOT_FOUND", "Action not found or already resolved"), 404);
  }
  return c.json(ok({ approved: true }));
});

// ── POST /actions/:id/reject ──────────────────────────────────────────────────

router.post("/actions/:id/reject", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const rejected = await financeService.rejectAction(c.env.DB, id, userId);
  if (!rejected) {
    return c.json(err("NOT_FOUND", "Action not found or already resolved"), 404);
  }
  return c.json(ok({ rejected: true }));
});

export { router as autopilotRouter };
