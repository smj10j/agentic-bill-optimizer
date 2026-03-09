import { apiFetch } from "./api.js";

export type AgentActionRecord = {
  id: string;
  actionType: string;
  description: string;
  status: string;
  approvalStatus: string;
  riskLevel: string;
  amountCents: number;
  reasoning: string;
  undoExpiresAt: number | null;
  approvalExpiresAt: number | null;
  createdAt: number;
  reversedAt: number | null;
  // Computed by API
  canUndo: boolean;
  undoSecondsRemaining: number;
};

export async function getActions(): Promise<AgentActionRecord[]> {
  const res = await apiFetch<AgentActionRecord[]>("/api/v1/actions");
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function undoAction(id: string): Promise<void> {
  const res = await apiFetch<{ reversed: boolean }>(`/api/v1/actions/${id}/undo`, { method: "POST" });
  if (res.error) throw new Error(res.error.message);
}
