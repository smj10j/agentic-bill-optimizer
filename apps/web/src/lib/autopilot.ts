import { apiFetch } from "./api";

export type AutopilotTier = 0 | 1 | 2 | 3;

export type AutopilotSettings = {
  enabled: boolean;
  tier: AutopilotTier;
  dailyLimitCents: number;
  singleActionLimitCents: number;
  nightFreezeEnabled: boolean;
  nightFreezeStartHour: number;
  nightFreezeEndHour: number;
  billPaymentLimitCents: number;
  yieldSweepInLimitCents: number;
  yieldSweepOutLimitCents: number;
  requireApprovalSubscriptionCancel: boolean;
  alwaysAutopay: string[];
  neverAutopay: string[];
};

export type TrustScore = {
  score: number;
  label: string;
  undoRate: number;
  totalActions: number;
  undoneActions: number;
};

export type PendingAction = {
  id: string;
  actionType: string;
  description: string;
  amountCents: number;
  reasoning: string;
  riskLevel: string;
  approvalExpiresAt: number | null;
  createdAt: number;
};

export async function getAutopilotSettings(): Promise<AutopilotSettings> {
  const res = await apiFetch<AutopilotSettings>("/autopilot/settings");
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to load autopilot settings");
  return res.data;
}

export async function updateAutopilotSettings(
  patch: Partial<AutopilotSettings>
): Promise<AutopilotSettings> {
  const res = await apiFetch<AutopilotSettings>("/autopilot/settings", {
    method: "PUT",
    body: patch,
  });
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to update autopilot settings");
  return res.data;
}

export async function getTrustScore(): Promise<TrustScore> {
  const res = await apiFetch<TrustScore>("/autopilot/trust-score");
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to load trust score");
  return res.data;
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const res = await apiFetch<PendingAction[]>("/autopilot/actions/pending");
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to load pending actions");
  return res.data;
}

export async function approveAction(id: string): Promise<void> {
  const res = await apiFetch<null>(`/autopilot/actions/${id}/approve`, { method: "POST" });
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to approve action");
}

export async function rejectAction(id: string): Promise<void> {
  const res = await apiFetch<null>(`/autopilot/actions/${id}/reject`, { method: "POST" });
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to reject action");
}
