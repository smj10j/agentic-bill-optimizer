import { apiFetch } from "./api.js";

export type Notification = {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  actionUrl: string | null;
  actionLabel: string | null;
  readAt: number | null;
  createdAt: number;
};

export async function getNotifications(unreadOnly = false): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const qs = unreadOnly ? "?unread=true" : "";
  const res = await apiFetch<{ notifications: Notification[]; unreadCount: number }>(`/api/v1/notifications${qs}`);
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function markRead(id: string): Promise<void> {
  const res = await apiFetch<{ read: boolean }>(`/api/v1/notifications/${id}/read`, { method: "POST" });
  if (res.error) throw new Error(res.error.message);
}

export async function markAllRead(): Promise<void> {
  const res = await apiFetch<{ markedRead: number }>("/api/v1/notifications/read-all", { method: "POST" });
  if (res.error) throw new Error(res.error.message);
}

export async function dismissNotification(id: string): Promise<void> {
  const res = await apiFetch<{ dismissed: boolean }>(`/api/v1/notifications/${id}`, { method: "DELETE" });
  if (res.error) throw new Error(res.error.message);
}
