import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { err } from "./lib/response.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import type { Env } from "./types/env.js";

const app = new Hono<{ Bindings: Env }>();

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        "http://localhost:5173",
        "https://orbit.pages.dev", // Update with real domain
      ];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.route("/health", healthRouter);
app.route("/api/v1/auth", authRouter);

// 404 catch-all
app.notFound((c) => {
  return c.json(err("NOT_FOUND", "The requested resource does not exist"), 404);
});

// Global error handler
app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json(err("REQUEST_ERROR", error.message), error.status);
  }

  console.error("Unhandled error:", error);
  return c.json(err("INTERNAL_ERROR", "An unexpected error occurred"), 500);
});

export default app;
