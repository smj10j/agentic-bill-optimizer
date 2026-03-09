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

export { router as actionsRouter };
