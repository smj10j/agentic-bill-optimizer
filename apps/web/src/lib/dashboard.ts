import { apiFetch } from "./api";
import type { Account, Bill, Subscription } from "@orbit/shared";
import type { PendingAction } from "./autopilot";

export type DashboardSummary = {
  balanceSummary: {
    checkingSavingsCents: number;
    yieldCents: number;
    totalCents: number;
    lastSyncedAt: number | null;
    accounts: Account[];
  };
  pendingActions: PendingAction[];
  autopilot: {
    enabled: boolean;
    tier: 0 | 1 | 2 | 3;
    actionsThisWeek: number;
  };
  upcomingBills: Bill[];
  overdueBills: Bill[];
  yieldSnapshot: {
    balanceCents: number;
    apyBasisPoints: number;
    totalEarnedCents: number;
    monthlyEarningCents: number;
    weeklyEarningCents: number;
  };
  recentActivity: Array<{
    id: string;
    actionType: string;
    description: string;
    status: string;
    createdAt: number;
    reversedAt: number | null;
  }>;
  flaggedSubscriptions: Subscription[];
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await apiFetch<DashboardSummary>("/dashboard/summary");
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to load dashboard");
  return res.data;
}
