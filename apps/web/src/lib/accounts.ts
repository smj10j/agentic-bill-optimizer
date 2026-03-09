import { apiFetch } from "./api.js";
import type { Account } from "@orbit/shared";

export async function getAccounts(): Promise<Account[]> {
  const res = await apiFetch<Account[]>("/api/v1/accounts");
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function getLinkToken(): Promise<{ linkToken: string; expiration: number }> {
  const res = await apiFetch<{ linkToken: string; expiration: number }>("/api/v1/accounts/link/token");
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function exchangeLinkToken(
  publicToken: string,
  institutionId: string,
  institutionName: string
): Promise<{ accountsLinked: number; accounts: Account[] }> {
  const res = await apiFetch<{ accountsLinked: number; accounts: Account[] }>("/api/v1/accounts/link/exchange", {
    method: "POST",
    body: { publicToken, institutionId, institutionName },
  });
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function disconnectAccount(id: string): Promise<void> {
  const res = await apiFetch<{ disconnected: boolean }>(`/api/v1/accounts/${id}/disconnect`, { method: "DELETE" });
  if (res.error) throw new Error(res.error.message);
}
