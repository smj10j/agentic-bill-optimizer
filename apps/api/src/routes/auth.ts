import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types/env.js";
import { ok } from "../lib/response.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import { generateId, generateToken, sha256 } from "../lib/id.js";
import { authMiddleware } from "../middleware/auth.js";

const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

export const authRouter = new Hono<{ Bindings: Env }>();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/signup", zValidator("json", signupSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  // Check existing user
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first();
  if (existing) {
    throw new HTTPException(422, { message: "An account with this email already exists" });
  }

  const id = generateId("usr");
  const passwordHash = await hashPassword(password);
  const now = Math.floor(Date.now() / 1000);

  await c.env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, email.toLowerCase(), passwordHash, now, now)
    .run();

  const tokens = await issueTokens(c.env, id);

  return c.json(ok({ user: { id, email: email.toLowerCase() }, ...tokens }), 201);
});

authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const user = await c.env.DB.prepare(
    "SELECT id, email, password_hash FROM users WHERE email = ?"
  )
    .bind(email.toLowerCase())
    .first<{ id: string; email: string; password_hash: string }>();

  // Always run password verification to prevent timing attacks
  const hash = user?.password_hash ?? "invalid:hash";
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  const tokens = await issueTokens(c.env, user.id);

  return c.json(ok({ user: { id: user.id, email: user.email }, ...tokens }));
});

authRouter.post(
  "/refresh",
  zValidator("json", z.object({ refreshToken: z.string() })),
  async (c) => {
    const { refreshToken } = c.req.valid("json");
    const tokenHash = await sha256(refreshToken);
    const key = `refresh:${tokenHash}`;

    const stored = await c.env.SESSIONS.get(key, "json") as { userId: string } | null;
    if (!stored) {
      throw new HTTPException(401, { message: "Invalid or expired refresh token" });
    }

    const accessToken = await signToken({ sub: stored.userId }, c.env.JWT_SECRET, ACCESS_TOKEN_TTL_SECONDS);
    return c.json(ok({ accessToken }));
  }
);

authRouter.post("/logout", authMiddleware, async (c) => {
  // In a full implementation, we'd store the token hash at login to invalidate it
  // For MVP, we rely on access token expiry + client-side clearing
  return c.json(ok({ success: true }));
});

async function issueTokens(env: Env, userId: string) {
  const accessToken = await signToken({ sub: userId }, env.JWT_SECRET, ACCESS_TOKEN_TTL_SECONDS);
  const refreshToken = generateToken();
  const tokenHash = await sha256(refreshToken);
  const key = `refresh:${tokenHash}`;

  await env.SESSIONS.put(key, JSON.stringify({ userId }), {
    expirationTtl: REFRESH_TOKEN_TTL_SECONDS,
  });

  return { accessToken, refreshToken };
}
