import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listNotifications, markAllNotificationsRead, markNotificationRead, markNotificationUnread, NOTIFICATIONS_CHANGED, type AppNotification } from "@/lib/notifications-api";

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const pages = await Promise.all(Array.from({ length: Math.ceil(limit / 50) }, (_, index) => listNotifications(50, index * 50)));
      setItems(Array.from(new Map(pages.flatMap(page => page.notifications).map(item => [item.id, item])).values()));
      setHasMore(pages[pages.length - 1].hasMore);
      setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [limit]);
  useEffect(() => {
    void load();
    const refresh = () => void load();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => { clearInterval(timer); window.removeEventListener(NOTIFICATIONS_CHANGED, refresh); };
  }, [load]);
  async function changeRead(item?: AppNotification, open = false) {
    setBusy(true);
    try {
      if (!item) await markAllNotificationsRead();
      else if (!item.readAt || open) await markNotificationRead(item.id);
      else await markNotificationUnread(item.id);
      await load();
    } catch { toast.error("Could not update notifications. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-4 md:p-8">
      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon"><Link to={location.pathname.startsWith("/app/") ? "/app" : "/account"}><ArrowLeft className="h-4 w-4" /></Link></Button>
            <CardTitle>Notifications</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void changeRead()}>Mark all read</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p role="alert" className="text-sm text-rose-600">Notifications could not load. <button onClick={() => void load()}>Retry</button></p> : null}
          {loading ? <p className="text-sm text-slate-500">Loading notifications...</p> : null}
          {!loading && !items.length ? <p className="text-sm text-slate-500">No notifications yet.</p> : null}
          {items.map((item) => (
            <div key={item.id} className={`rounded-2xl border p-4 ${item.readAt ? "border-slate-200" : "border-blue-200 bg-blue-50"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-950">{item.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {item.ctaPath ? <Button asChild size="sm" variant="outline" onClick={() => void changeRead(item, true)}><Link to={item.ctaPath}>{item.ctaLabel || "Open"}</Link></Button> : null}
                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void changeRead(item)}>{item.readAt ? "Mark unread" : "Mark read"}</Button>
                </div>
              </div>
            </div>
          ))}
          {hasMore ? <Button variant="outline" onClick={() => setLimit(value => value + 50)}>Load more</Button> : null}
        </CardContent>
      </Card>
    </main>
  );
}
