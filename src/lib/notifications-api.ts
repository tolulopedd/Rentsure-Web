import { apiFetch } from "@/lib/api";

export type AppNotification = {
  id: string;
  notificationType: string;
  title: string;
  message: string;
  ctaLabel?: string | null;
  ctaPath?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

export const NOTIFICATIONS_CHANGED = "rentsure:notifications-changed";
export function listNotifications(limit = 50, offset = 0) {
  return apiFetch<{ notifications: AppNotification[]; unreadCount: number; totalCount: number; hasMore: boolean }>(`/api/notifications?limit=${limit}&offset=${offset}`);
}
async function mutate(path: string, method: "PATCH" | "POST") {
  const result = await apiFetch<{ success: true }>(path, { method });
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  return result;
}
export function markNotificationRead(id: string) { return mutate(`/api/notifications/${id}/read`, "PATCH"); }
export function markNotificationUnread(id: string) { return mutate(`/api/notifications/${id}/unread`, "PATCH"); }
export function markAllNotificationsRead() { return mutate("/api/notifications/read-all", "POST"); }
