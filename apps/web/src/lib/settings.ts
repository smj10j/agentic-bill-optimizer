import { apiFetch } from "./api.js";

export type NotificationPrefs = {
  agentActions: boolean;
  billReminders: boolean;
  unusualCharges: boolean;
  insights: boolean;
  yieldUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  timezone: string;
};

export type Profile = {
  id: string;
  email: string;
  createdAt: number;
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const res = await apiFetch<NotificationPrefs>("/settings/notifications");
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function updateNotificationPrefs(patch: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  const res = await apiFetch<NotificationPrefs>("/settings/notifications", {
    method: "PATCH",
    body: patch,
  });
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function getProfile(): Promise<Profile> {
  const res = await apiFetch<Profile>("/settings/profile");
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function updateProfile(patch: { email?: string }): Promise<Profile> {
  const res = await apiFetch<Profile>("/settings/profile", { method: "PATCH", body: patch });
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
