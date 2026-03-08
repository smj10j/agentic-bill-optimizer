import { Hono } from "hono";
import type { Env } from "../types/env.js";
import { ok } from "../lib/response.js";

export const healthRouter = new Hono<{ Bindings: Env }>();

healthRouter.get("/", (c) => {
  return c.json(ok({ status: "ok", timestamp: Math.floor(Date.now() / 1000) }));
});
