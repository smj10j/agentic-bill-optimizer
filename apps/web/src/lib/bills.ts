import { apiFetch } from "./api";
import type { Bill } from "@orbit/shared";

export type SmartPayTiming = {
  billId: string;
  optimalInitiateDate: number;
  safePayBy: number;
  floatDays: number;
  yieldSavedCents: number;
  effectiveGraceDays: number;
  isUrgent: boolean;
  isAtRisk: boolean;
};

export type SmartBill = Bill & { smartPay: SmartPayTiming };

export type SmartPayPatch = {
  gracePeriodDays?: number;
  lateFeeCents?: number;
  paymentRail?: "ach" | "same_day_ach" | "card" | "check" | "auto";
  smartPayEnabled?: boolean;
  billerCategory?: "utility" | "insurance" | "rent" | "mortgage" | "credit_card" | "subscription" | "medical" | "other";
};

export async function getBillSchedule(): Promise<SmartBill[]> {
  const res = await apiFetch<SmartBill[]>("/bills/schedule");
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to load bill schedule");
  return res.data;
}

export async function updateBillSettings(id: string, patch: SmartPayPatch): Promise<SmartBill> {
  const res = await apiFetch<SmartBill>(`/bills/${id}`, { method: "PUT", body: patch });
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to update bill");
  return res.data;
}

export async function payBill(id: string): Promise<{ paidAt: number; description: string }> {
  const res = await apiFetch<{ paidAt: number; description: string; actionId: string }>(`/bills/${id}/pay`, { method: "POST" });
  if (res.error !== null) throw new Error(res.error.message ?? "Failed to pay bill");
  return res.data;
}
