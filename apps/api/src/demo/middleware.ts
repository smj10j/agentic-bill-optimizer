/**
 * PRD-043: Demo mode middleware.
 * When the request carries a demo JWT, intercepts all non-agent routes
 * and returns fixture data. No D1 reads or writes occur.
 */

import type { Context, Next } from "hono";
import { verifyToken } from "../lib/jwt.js";
import { ok } from "../lib/response.js";
import type { Env } from "../types/env.js";
import {
  DEMO_ACCOUNTS,
  DEMO_SUBSCRIPTIONS,
  DEMO_BILLS,
  DEMO_TRANSACTIONS,
  DEMO_INSIGHTS,
  DEMO_YIELD,
  DEMO_AUTOPILOT,
  DEMO_DASHBOARD,
} from "./fixture.js";

function matchPath(pattern: string, path: string): boolean {
  const re = new RegExp("^" + pattern.replace(/:[^/]+/g, "[^/]+") + "$");
  return re.test(path);
}

function getDemoResponse(method: string, path: string): unknown | null {
  // Strip query strings
  const p = path.split("?")[0];

  // Dashboard
  if (method === "GET" && matchPath("/api/v1/dashboard/summary", p)) {
    return ok(DEMO_DASHBOARD);
  }

  // Accounts
  if (method === "GET" && matchPath("/api/v1/accounts", p)) {
    return ok(DEMO_ACCOUNTS);
  }
  if (method === "GET" && matchPath("/api/v1/accounts/link/token", p)) {
    return ok({ linkToken: "link-demo-sandbox-token", expiration: Math.floor(Date.now() / 1000) + 1800 });
  }

  // Subscriptions
  if (method === "GET" && matchPath("/api/v1/subscriptions", p)) {
    return ok(DEMO_SUBSCRIPTIONS);
  }

  // Bills
  if (method === "GET" && matchPath("/api/v1/bills", p)) {
    return ok(DEMO_BILLS);
  }
  if (method === "GET" && matchPath("/api/v1/bills/schedule", p)) {
    const now = Math.floor(Date.now() / 1000);
    const schedule = DEMO_BILLS.map((bill) => ({
      ...bill,
      smartPay: {
        billId: bill.id,
        optimalInitiateDate: bill.dueAt - 3 * 86400,
        safePayBy: bill.dueAt + bill.gracePeriodDays,
        floatDays: Math.max(0, bill.gracePeriodDays - 1),
        yieldSavedCents: Math.round(bill.amountCents * 512 / 10000 / 365 * Math.max(0, bill.gracePeriodDays - 1)),
        effectiveGraceDays: bill.gracePeriodDays,
        isUrgent: bill.dueAt - now < 3 * 86400,
        isAtRisk: bill.dueAt - now < 86400,
      },
    }));
    return ok(schedule);
  }

  // Transactions
  if (method === "GET" && matchPath("/api/v1/transactions", p)) {
    return ok({ transactions: DEMO_TRANSACTIONS, total: DEMO_TRANSACTIONS.length });
  }

  // Yield
  if (method === "GET" && matchPath("/api/v1/yield", p)) {
    return ok(DEMO_YIELD);
  }

  // Autopilot
  if (method === "GET" && matchPath("/api/v1/autopilot/settings", p)) {
    return ok(DEMO_AUTOPILOT);
  }

  // Actions
  if (method === "GET" && matchPath("/api/v1/actions", p)) {
    return ok([]);
  }

  // Insights
  if (method === "GET" && matchPath("/api/v1/insights", p)) {
    return ok(DEMO_INSIGHTS);
  }
  if (method === "POST" && matchPath("/api/v1/insights/run", p)) {
    return ok({ detected: 0, ids: [] });
  }
  if (method === "POST" && matchPath("/api/v1/insights/:id/view", p)) {
    return ok({ viewed: true });
  }
  if (method === "POST" && matchPath("/api/v1/insights/:id/feedback", p)) {
    return ok({ recorded: true });
  }

  // Notifications
  if (method === "GET" && matchPath("/api/v1/notifications", p)) {
    return ok({ notifications: [], unreadCount: 0 });
  }
  if (method === "POST" && matchPath("/api/v1/notifications/read-all", p)) {
    return ok({ markedRead: 0 });
  }
  if (method === "POST" && matchPath("/api/v1/notifications/:id/read", p)) {
    return ok({ read: true });
  }

  // Settings
  if (method === "GET" && matchPath("/api/v1/settings/notifications", p)) {
    return ok({
      agentActions: true, billReminders: true, unusualCharges: true,
      insights: true, yieldUpdates: false, quietHoursEnabled: true,
      quietHoursStart: 22, quietHoursEnd: 8, timezone: "America/Los_Angeles",
    });
  }
  if ((method === "GET" || method === "PATCH") && matchPath("/api/v1/settings/profile", p)) {
    return ok({ id: "demo_alex", email: "alex@example.com", name: "Alex Johnson", timezone: "America/Los_Angeles", createdAt: Math.floor(Date.now() / 1000) - 90 * 86400 });
  }

  // Write operations in demo mode — simulate success
  if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
    // Let agent/chat through for real Claude responses
    if (p.startsWith("/api/v1/agent/")) return null;
    // Simulate all other writes
    return ok({ success: true, demo: true });
  }

  return null; // Not intercepted — let request through
}

export async function demoMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload?.demo) {
    return next();
  }

  // Demo user — intercept if we have a fixture handler
  const response = getDemoResponse(c.req.method, c.req.path);
  if (response === null) {
    return next(); // Let through (e.g. agent chat)
  }

  return c.json(response);
}
