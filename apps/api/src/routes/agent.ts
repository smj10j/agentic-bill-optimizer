import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../types/env.js";
import type { AuthVariables } from "../middleware/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, err } from "../lib/response.js";
import * as financeService from "../services/finance.js";
import { streamAgentResponse } from "../services/agent.js";

type Variables = AuthVariables;
const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", authMiddleware);

router.post(
  "/chat",
  zValidator(
    "json",
    z.object({
      message: z.string().min(1).max(2000),
      conversationId: z.string().optional(),
    })
  ),
  async (c) => {
    const userId = c.get("userId");
    const { message, conversationId } = c.req.valid("json");

    // Load existing conversation history
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (conversationId) {
      const convo = await financeService.getConversation(c.env.DB, conversationId, userId);
      if (convo) {
        history = convo.messages as typeof history;
      }
    }

    // Return SSE stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const stream = streamAgentResponse(
      c.env.ANTHROPIC_API_KEY,
      c.env.DB,
      userId,
      message,
      history
    );

    // Collect the full assistant response to persist
    let fullResponse = "";

    // Run streaming in background, write to transform stream
    (async () => {
      try {
        for await (const chunk of stream) {
          await writer.write(encoder.encode(chunk));
          // Extract text tokens to build full response
          try {
            const parsed = JSON.parse(chunk.replace(/^data: /, "")) as { type: string; content?: string };
            if (parsed.type === "token" && parsed.content) {
              fullResponse += parsed.content;
            }
          } catch {
            // Ignore parse errors on SSE formatting
          }
        }

        // Persist updated conversation
        const updatedMessages = [
          ...history,
          { role: "user" as const, content: message },
          { role: "assistant" as const, content: fullResponse },
        ];
        const savedConvId = await financeService.upsertConversation(
          c.env.DB,
          userId,
          conversationId ?? null,
          updatedMessages
        );

        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: "done", conversationId: savedConvId })}\n\n`)
        );
      } catch (error) {
        console.error("Agent stream error:", error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Agent encountered an error" })}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": c.req.header("Origin") ?? "*",
      },
    });
  }
);

router.get("/conversations", async (c) => {
  const userId = c.get("userId");
  // Return recent conversations (id + preview)
  const rows = await c.env.DB
    .prepare(
      "SELECT id, messages, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20"
    )
    .bind(userId)
    .all<{ id: string; messages: string; updated_at: number }>();

  const conversations = rows.results.map((r) => {
    const messages = JSON.parse(r.messages) as Array<{ role: string; content: string }>;
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    return {
      id: r.id,
      preview: lastMessage?.content?.slice(0, 100) ?? "",
      messageCount: messages.length,
      updatedAt: r.updated_at,
    };
  });

  return c.json(ok(conversations));
});

router.get("/conversations/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const convo = await financeService.getConversation(c.env.DB, id, userId);
  if (!convo) {
    return c.json(err("NOT_FOUND", "Conversation not found"), 404);
  }

  return c.json(ok(convo));
});

router.get("/actions", async (c) => {
  const userId = c.get("userId");
  const actions = await financeService.getAgentActions(c.env.DB, userId);
  return c.json(ok(actions));
});

router.post("/actions/:id/reverse", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const reversed = await financeService.reverseAgentAction(c.env.DB, id, userId);
  if (!reversed) {
    return c.json(
      err("CANNOT_REVERSE", "Action not found, already reversed, or outside the 15-minute window"),
      422
    );
  }

  return c.json(ok({ reversed: true }));
});

export { router as agentRouter };
