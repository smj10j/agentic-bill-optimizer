/**
 * PRD-007: Proactive Agent Insights
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, err } from "../lib/response.js";
import * as insightsService from "../services/insights.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

// GET / — list active insights
router.get("/", async (c) => {
  const userId = c.get("userId");
  const insights = await insightsService.getInsights(c.env.DB, userId);
  return c.json(ok(insights));
});

// POST /run — trigger detection run (for cron + testing)
router.post("/run", async (c) => {
  const userId = c.get("userId");
  const createdIds = await insightsService.runInsightDetection(c.env.DB, userId);
  return c.json(ok({ detected: createdIds.length, ids: createdIds }));
});

// POST /:id/view — mark as viewed
router.post("/:id/view", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  await insightsService.markViewed(c.env.DB, id, userId);
  return c.json(ok({ viewed: true }));
});

// POST /:id/feedback — record user feedback
const feedbackSchema = z.object({
  feedback: z.enum(["helpful", "not_helpful", "acted", "dismissed"]),
});

router.post("/:id/feedback", zValidator("json", feedbackSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { feedback } = c.req.valid("json");
  const recorded = await insightsService.recordFeedback(c.env.DB, id, userId, feedback);
  if (!recorded) return c.json(err("NOT_FOUND", "Insight not found"), 404);
  return c.json(ok({ recorded: true }));
});

export { router as insightsRouter };
