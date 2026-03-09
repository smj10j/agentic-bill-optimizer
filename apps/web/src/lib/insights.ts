import { apiFetch } from "./api.js";

export type InsightRecord = {
  id: string;
  type: string;
  category: string;
  status: string;
  title: string;
  body: string;
  dollarImpactCents: number | null;
  relevanceScore: number;
  urgency: number;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  feedback: string | null;
  expiresAt: number;
  createdAt: number;
};

export type InsightFeedback = "helpful" | "not_helpful" | "acted" | "dismissed";

export async function getInsights(): Promise<InsightRecord[]> {
  const res = await apiFetch<InsightRecord[]>("/insights");
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function runInsightDetection(): Promise<{ detected: number; ids: string[] }> {
  const res = await apiFetch<{ detected: number; ids: string[] }>("/insights/run", { method: "POST" });
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function recordInsightFeedback(id: string, feedback: InsightFeedback): Promise<void> {
  const res = await apiFetch<{ recorded: boolean }>(`/insights/${id}/feedback`, {
    method: "POST",
    body: { feedback },
  });
  if (res.error) throw new Error(res.error.message);
}

export async function markInsightViewed(id: string): Promise<void> {
  await apiFetch<{ viewed: boolean }>(`/insights/${id}/view`, { method: "POST" });
}
