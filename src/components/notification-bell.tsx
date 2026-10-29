import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { listNotifications, markAllNotificationsRead, markNotificationRead, markNotificationUnread, NOTIFICATIONS_CHANGED, type AppNotification } from "@/lib/notifications-api";

export function NotificationBell({ historyPath = "/account/notifications" }: { historyPath?: string }) {
  const nav = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const load = async () => {
      const request = ++generation;
      try {
        const result = await listNotifications();
        if (!cancelled && request === generation) { setItems(result.notifications); setUnread(result.unreadCount); setError(false); }
      } catch { if (!cancelled) setError(true); }
    };
    void load();
    const reload = () => void load();
    const timer = window.setInterval(reload, 15000);
    window.addEventListener(NOTIFICATIONS_CHANGED, reload);
    window.addEventListener("focus", reload);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener(NOTIFICATIONS_CHANGED, reload); window.removeEventListener("focus", reload); };
  }, []);
  async function act(task: () => Promise<unknown>) {
    setBusy(true);
    try { await task(); } catch { toast.error("Could not update notifications. Please try again."); }
    finally { setBusy(false); }
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label={`Open notifications, ${unread} unread`}>
        <Bell className="h-5 w-5" />
        {unread > 0 ? <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--rentsure-blue)] px-1.5 text-[10px] font-semibold text-white">{unread}</span> : null}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="max-h-[75vh] w-[340px] overflow-y-auto rounded-2xl border-slate-200 bg-white p-3">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-950">Notifications</p><span className="text-xs text-slate-500">{unread} unread</span>
          {unread > 0 ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => void act(markAllNotificationsRead)}>Mark all read</Button> : null}
        </div>
        {error ? <p role="alert" className="text-sm text-rose-600">Notifications could not refresh. Retrying shortly.</p> : null}
        {!items.length && !error ? <p className="text-sm text-slate-500">No notifications.</p> : null}
        {items.map(item => <div key={item.id} className={`rounded-2xl border p-3 ${item.readAt ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"}`}>
          <p className="font-medium text-slate-950">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.message}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</p>
            {item.ctaPath ? <Button variant="outline" size="sm" disabled={busy} onClick={() => void act(async () => { if (!item.readAt) await markNotificationRead(item.id); nav(item.ctaPath!); })}>{item.ctaLabel || "Open"}</Button> : null}
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void act(() => item.readAt ? markNotificationUnread(item.id) : markNotificationRead(item.id))}>{item.readAt ? "Mark unread" : "Mark read"}</Button>
          </div>
        </div>)}
        <Button variant="ghost" className="w-full" onClick={() => nav(historyPath)}>View all</Button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>;
}
