import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { err } from "./lib/response.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { accountsRouter } from "./routes/accounts.js";
import { transactionsRouter } from "./routes/transactions.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { billsRouter } from "./routes/bills.js";
import { yieldRouter } from "./routes/yield.js";
import { agentRouter } from "./routes/agent.js";
import { autopilotRouter } from "./routes/autopilot.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { actionsRouter } from "./routes/actions.js";
import { notificationsRouter } from "./routes/notifications.js";
import { insightsRouter } from "./routes/insights.js";
import { settingsRouter } from "./routes/settings.js";
import { demoMiddleware } from "./demo/middleware.js";
import type { Env } from "./types/env.js";

const app = new Hono<{ Bindings: Env }>();

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        "http://localhost:5173",
        "https://orbit-app-c97.pages.dev",
      ];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

// ── Demo mode interceptor (before all routes) ─────────────────────────────────

app.use("*", demoMiddleware);

// ── Routes ────────────────────────────────────────────────────────────────────

app.route("/health", healthRouter);
app.route("/api/v1/auth", authRouter);
app.route("/api/v1/accounts", accountsRouter);
app.route("/api/v1/transactions", transactionsRouter);
app.route("/api/v1/subscriptions", subscriptionsRouter);
app.route("/api/v1/bills", billsRouter);
app.route("/api/v1/yield", yieldRouter);
app.route("/api/v1/agent", agentRouter);
app.route("/api/v1/autopilot", autopilotRouter);
app.route("/api/v1/dashboard", dashboardRouter);
app.route("/api/v1/actions", actionsRouter);
app.route("/api/v1/notifications", notificationsRouter);
app.route("/api/v1/insights", insightsRouter);
app.route("/api/v1/settings", settingsRouter);

// ── Fallbacks ─────────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json(err("NOT_FOUND", "The requested resource does not exist"), 404);
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json(err("REQUEST_ERROR", error.message), error.status);
  }
  console.error("Unhandled error:", error);
  return c.json(err("INTERNAL_ERROR", "An unexpected error occurred"), 500);
});

export default app;
