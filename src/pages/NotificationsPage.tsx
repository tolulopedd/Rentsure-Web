import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/lib/notifications-api";

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listNotifications().then((result) => setItems(result.notifications)).finally(() => setLoading(false));
  }, []);

  async function markRead(item: AppNotification) {
    if (item.readAt) return;
    await markNotificationRead(item.id);
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-4 md:p-8">
      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon"><Link to="/account"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <CardTitle>Notifications</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void markAllRead()}>Mark all read</Button>
        </CardHeader>
        <CardContent className="space-y-3">
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
                  {item.ctaPath ? <Button asChild size="sm" variant="outline" onClick={() => void markRead(item)}><Link to={item.ctaPath}>{item.ctaLabel || "Open"}</Link></Button> : null}
                  {!item.readAt ? <Button type="button" size="sm" variant="ghost" onClick={() => void markRead(item)}>Mark read</Button> : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
