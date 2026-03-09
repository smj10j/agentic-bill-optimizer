import { apiFetch } from "./api.js";

export type PaymentRecord = {
  id: string;
  userId: string;
  billId: string | null;
  billerName: string;
  amountCents: number;
  status: "initiated" | "clearing" | "settled" | "failed" | "cancelled";
  idempotencyKey: string;
  fromAccountId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  initiatedAt: number;
  clearedAt: number | null;
  settledAt: number | null;
  failedAt: number | null;
  cancelledAt: number | null;
  createdAt: number;
};

export async function getPayments(): Promise<PaymentRecord[]> {
  const res = await apiFetch<PaymentRecord[]>("/payments");
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function cancelPayment(id: string): Promise<void> {
  const res = await apiFetch<{ cancelled: boolean }>(`/payments/${id}/cancel`, { method: "POST" });
  if (res.error) throw new Error(res.error.message);
}
