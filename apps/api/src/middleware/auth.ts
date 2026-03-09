import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyToken } from "../lib/jwt.js";
import type { Env } from "../types/env.js";

export type AuthVariables = {
  userId: string;
  isDemo: boolean;
};

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: AuthVariables }>,
  next: Next
) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }

  c.set("userId", payload.sub);
  c.set("isDemo", payload.demo === true);
  await next();
}
