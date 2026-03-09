/**
 * PRD-004: Action Approval & Undo Framework
 * Action history feed + undo endpoint.
 */

import { Hono } from "hono";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, err } from "../lib/response.js";
import * as financeService from "../services/finance.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

// ── GET / ──────────────────────────────────────────────────────────────────────
// Full action history with undo availability metadata.

router.get("/", async (c) => {
  const userId = c.get("userId");
  const actions = await financeService.getAgentActions(c.env.DB, userId);

  const now = Math.floor(Date.now() / 1000);
  const enriched = actions.map((a) => ({
    ...a,
    canUndo:
      a.status === "completed" &&
      a.undoExpiresAt !== null &&
      a.undoExpiresAt > now,
    undoSecondsRemaining:
      a.undoExpiresAt !== null && a.undoExpiresAt > now
        ? a.undoExpiresAt - now
        : 0,
  }));

  return c.json(ok(enriched));
});

// ── POST /:id/undo ─────────────────────────────────────────────────────────────

router.post("/:id/undo", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const reversed = await financeService.reverseAgentAction(c.env.DB, id, userId);
  if (!reversed) {
    return c.json(err("UNPROCESSABLE", "Action cannot be undone — window may have expired or action is not in a reversible state"), 422);
  }

  return c.json(ok({ reversed: true }));
});

// ── GET /pending ───────────────────────────────────────────────────────────────

router.get("/pending", async (c) => {
  const userId = c.get("userId");
  const actions = await financeService.getPendingActions(c.env.DB, userId);
  return c.json(ok(actions));
});

// ── POST /:id/approve ──────────────────────────────────────────────────────────

router.post("/:id/approve", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const approved = await financeService.approveAction(c.env.DB, id, userId);
  if (!approved) {
    return c.json(err("UNPROCESSABLE", "Action not found or cannot be approved"), 422);
  }
  return c.json(ok({ approved: true }));
});

// ── POST /:id/reject ───────────────────────────────────────────────────────────

router.post("/:id/reject", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const rejected = await financeService.rejectAction(c.env.DB, id, userId);
  if (!rejected) {
    return c.json(err("UNPROCESSABLE", "Action not found or cannot be rejected"), 422);
  }
  return c.json(ok({ rejected: true }));
});

export { router as actionsRouter };
