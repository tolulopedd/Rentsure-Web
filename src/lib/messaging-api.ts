import { apiFetch } from "@/lib/api";
export type Participant = { id: string; actorKey: string; displayName: string; role: string; readThrough: number; archivedAt: string | null };
export type Message = { id: string; senderId: string; sequence: number; content: string; createdAt: string };
export type Conversation = { id: string; subject: string; contextType: string; contextId: string | null; contextLabel: string | null; participants: Participant[]; messages: Message[]; updatedAt: string; lastSequence: number; unreadCount?: number };
export type Recipient = { key: string; name: string; role: string };
export const messaging = {
  list: (folder: string, q: string, offset: number) => apiFetch<{ items: Conversation[]; total: number; unreadCount: number; actorKey: string }>(`/api/messaging/conversations?folder=${folder}&q=${encodeURIComponent(q)}&offset=${offset}`),
  recipients: (q: string) => apiFetch<{ items: Recipient[] }>(`/api/messaging/recipients?q=${encodeURIComponent(q)}`),
  contexts: (key: string) => apiFetch<{ items: { type: string; id: string; label: string }[] }>(`/api/messaging/contexts?recipientKey=${encodeURIComponent(key)}`),
  history: (id: string, after = 0) => apiFetch<Conversation & { actorKey: string; hasMore: boolean }>(`/api/messaging/conversations/${id}?after=${after}`),
  start: (body: { recipientKey: string; subject: string; content: string; clientRequestId: string; contextType: string; contextId?: string }) => apiFetch<{ id: string }>("/api/messaging/conversations", { method: "POST", body: JSON.stringify(body) }),
  reply: (id: string, content: string, clientRequestId: string) => apiFetch<Message>(`/api/messaging/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content, clientRequestId }) }),
  read: (id: string, through: number) => apiFetch(`/api/messaging/conversations/${id}/read`, { method: "PATCH", body: JSON.stringify({ through }) }),
  archive: (id: string, archived: boolean) => apiFetch(`/api/messaging/conversations/${id}/archive`, { method: "PATCH", body: JSON.stringify({ archived }) })
};
