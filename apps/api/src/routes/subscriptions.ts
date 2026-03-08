import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok } from "../lib/response.js";
import * as financeService from "../services/finance.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

router.get("/", async (c) => {
  const userId = c.get("userId");
  const subs = await financeService.getSubscriptions(c.env.DB, userId);
  return c.json(ok(subs));
});

router.patch(
  "/:id",
  zValidator("json", z.object({ status: z.enum(["active", "flagged", "cancelled"]) })),
  async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const { status } = c.req.valid("json");

    const updated = await financeService.updateSubscriptionStatus(c.env.DB, id, userId, status);
    if (!updated) {
      throw new HTTPException(404, { message: "Subscription not found" });
    }

    return c.json(ok({ id, status }));
  }
);

router.post("/:id/cancel", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const updated = await financeService.updateSubscriptionStatus(c.env.DB, id, userId, "cancelled");
  if (!updated) {
    throw new HTTPException(404, { message: "Subscription not found" });
  }

  const actionId = await financeService.insertAgentAction(c.env.DB, {
    userId,
    actionType: "subscription_cancel",
    description: `Cancelled subscription ${id}`,
    payload: { subscriptionId: id },
  });

  return c.json(ok({
    actionId,
    description: "Cancellation initiated. Active until end of billing period.",
    status: "cancelled",
  }));
});

export { router as subscriptionsRouter };
