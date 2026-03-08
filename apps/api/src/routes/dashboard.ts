import { Hono } from "hono";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok } from "../lib/response.js";
import * as financeService from "../services/finance.js";
import * as autopilotService from "../services/autopilot.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

// ── GET /summary ───────────────────────────────────────────────────────────────
// Aggregates all data needed by the home dashboard in a single request.

router.get("/summary", async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;
  const now = Math.floor(Date.now() / 1000);
  const sevenDaysLater = now + 7 * 24 * 60 * 60;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60;

  // Parallel fetch everything
  const [
    accounts,
    yieldPosition,
    pendingActions,
    autopilotSettings,
    bills,
    agentActions,
    subscriptions,
  ] = await Promise.all([
    financeService.getAccounts(db, userId),
    financeService.getOrCreateYieldPosition(db, userId),
    financeService.getPendingActions(db, userId),
    autopilotService.getSettings(db, userId),
    financeService.getBills(db, userId),
    financeService.getAgentActions(db, userId),
    financeService.getSubscriptions(db, userId),
  ]);

  // Balance summary — sum checking + savings (not credit cards)
  const liquidAccounts = accounts.filter(
    (a) => a.accountType === "checking" || a.accountType === "savings"
  );
  const checkingSavingsCents = liquidAccounts.reduce((sum, a) => sum + a.balanceCents, 0);
  const totalCents = checkingSavingsCents + yieldPosition.balanceCents;
  const lastSyncedAt = liquidAccounts.reduce<number | null>((latest, a) => {
    if (a.lastSyncedAt === null) return latest;
    if (latest === null) return a.lastSyncedAt;
    return Math.max(latest, a.lastSyncedAt);
  }, null);

  // Upcoming bills — due within next 7 days, not yet paid
  const upcomingBills = bills.filter(
    (b) => b.status === "pending" && b.dueAt >= now && b.dueAt <= sevenDaysLater
  );

  // Overdue bills — past due, still pending
  const overdueBills = bills.filter(
    (b) => b.status === "pending" && b.dueAt < now
  );

  // Recent activity — last 5 agent actions
  const recentActivity = agentActions.slice(0, 5);

  // Autopilot actions this week
  const actionsThisWeek = agentActions.filter(
    (a) => a.createdAt >= sevenDaysAgo && a.status !== "reversed"
  ).length;

  // Flagged subscriptions
  const flaggedSubscriptions = subscriptions.filter((s) => s.status === "flagged");

  // Estimated monthly yield earnings (APY * balance / 12)
  const monthlyEarningCents =
    yieldPosition.balanceCents > 0
      ? Math.round(
          (yieldPosition.balanceCents * yieldPosition.apyBasisPoints) / 10000 / 12
        )
      : 0;

  // Estimated weekly yield earnings
  const weeklyEarningCents =
    yieldPosition.balanceCents > 0
      ? Math.round(
          (yieldPosition.balanceCents * yieldPosition.apyBasisPoints) / 10000 / 52
        )
      : 0;

  return c.json(
    ok({
      balanceSummary: {
        checkingSavingsCents,
        yieldCents: yieldPosition.balanceCents,
        totalCents,
        lastSyncedAt,
        accounts: liquidAccounts,
      },
      pendingActions,
      autopilot: {
        enabled: autopilotSettings.enabled,
        tier: autopilotSettings.tier,
        actionsThisWeek,
      },
      upcomingBills,
      overdueBills,
      yieldSnapshot: {
        balanceCents: yieldPosition.balanceCents,
        apyBasisPoints: yieldPosition.apyBasisPoints,
        totalEarnedCents: yieldPosition.totalEarnedCents,
        monthlyEarningCents,
        weeklyEarningCents,
      },
      recentActivity,
      flaggedSubscriptions,
    })
  );
});

export { router as dashboardRouter };
