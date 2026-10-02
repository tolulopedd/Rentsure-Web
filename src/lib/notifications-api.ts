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

export function listNotifications(limit = 50) {
  return apiFetch<{ notifications: AppNotification[]; unreadCount: number }>(`/api/notifications?limit=${limit}`);
}

export function markNotificationRead(notificationId: string) {
  return apiFetch<{ success: true }>(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiFetch<{ success: true }>("/api/notifications/read-all", { method: "POST" });
}
