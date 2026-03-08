import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok } from "../lib/response.js";
import * as financeService from "../services/finance.js";
import { MockMoneyAdapter } from "../adapters/money/mock.js";
import { formatApyBasisPoints } from "@orbit/shared";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();
const moneyAdapter = new MockMoneyAdapter();

router.use("*", authMiddleware);

router.get("/", async (c) => {
  const userId = c.get("userId");
  const position = await financeService.getOrCreateYieldPosition(c.env.DB, userId);

  return c.json(ok({
    balanceCents: position.balanceCents,
    apyBasisPoints: position.apyBasisPoints,
    totalEarnedCents: position.totalEarnedCents,
    displayApy: formatApyBasisPoints(position.apyBasisPoints),
  }));
});

router.post(
  "/sweep-in",
  zValidator("json", z.object({ amountCents: z.number().int().positive() })),
  async (c) => {
    const userId = c.get("userId");
    const { amountCents } = c.req.valid("json");

    const txResult = await moneyAdapter.sweepToYield(userId, amountCents);
    if (!txResult.success) {
      throw new HTTPException(422, { message: "Sweep failed" });
    }

    await financeService.updateYieldBalance(c.env.DB, userId, amountCents);
    await financeService.insertAgentAction(c.env.DB, {
      userId,
      actionType: "yield_sweep_in",
      description: `Moved $${(amountCents / 100).toFixed(2)} to yield position`,
      payload: { amountCents, transactionId: txResult.transactionId },
    });

    const position = await financeService.getOrCreateYieldPosition(c.env.DB, userId);
    return c.json(ok({ ...txResult, newBalanceCents: position.balanceCents }));
  }
);

router.post(
  "/sweep-out",
  zValidator("json", z.object({ amountCents: z.number().int().positive() })),
  async (c) => {
    const userId = c.get("userId");
    const { amountCents } = c.req.valid("json");

    const position = await financeService.getOrCreateYieldPosition(c.env.DB, userId);
    if (amountCents > position.balanceCents) {
      throw new HTTPException(422, { message: "Amount exceeds yield balance" });
    }

    const txResult = await moneyAdapter.sweepFromYield(userId, amountCents);
    if (!txResult.success) {
      throw new HTTPException(422, { message: "Sweep failed" });
    }

    await financeService.updateYieldBalance(c.env.DB, userId, -amountCents);
    await financeService.insertAgentAction(c.env.DB, {
      userId,
      actionType: "yield_sweep_out",
      description: `Withdrew $${(amountCents / 100).toFixed(2)} from yield position`,
      payload: { amountCents, transactionId: txResult.transactionId },
    });

    const updatedPosition = await financeService.getOrCreateYieldPosition(c.env.DB, userId);
    return c.json(ok({ ...txResult, newBalanceCents: updatedPosition.balanceCents }));
  }
);

export { router as yieldRouter };
