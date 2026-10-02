import { useEffect, useMemo, useState } from "react";
import { Bell, Building2, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/lib/notifications-api";
import { getErrorMessage } from "@/lib/errors";

export function PublicWorkspaceTopbar() {
  const nav = useNavigate();
  const userName = localStorage.getItem("userName") || "RentSure user";
  const userRole = (localStorage.getItem("userRole") || "LANDLORD").toLowerCase();
  const userPhotoUrl = localStorage.getItem("userPhotoUrl") || "";
  const [photoFailed, setPhotoFailed] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setPhotoFailed(false);
  }, [userPhotoUrl]);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const response = await listNotifications();
        if (isCancelled) return;
        setNotifications(response.notifications);
        setUnreadCount(response.unreadCount);
      } catch (error) {
        if (!isCancelled) {
          console.error(getErrorMessage(error, "Failed to load notifications"));
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 15000);

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const dedupedNotifications = useMemo(() => {
    const seen = new Set<string>();
    return notifications.filter((notification) => {
      const signature = [notification.title.trim().toLowerCase(), notification.message.trim().toLowerCase(), notification.ctaPath || ""].join("|");
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  }, [notifications]);

  const visibleNotifications = dedupedNotifications;

  async function readNotification(notification: AppNotification) {
    if (!notification.readAt) {
      await markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    if (notification.ctaPath) nav(notification.ctaPath);
  }

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  }

  function actionLabel(label?: string | null) {
    if (!label) return "Open";
    return label.trim().toLowerCase() === "open account" ? "Open" : label;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 backdrop-blur">
      <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 md:px-6">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-[var(--rentsure-blue)] md:text-base">Workspace</div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 lg:flex">
            <Building2 className="h-4 w-4 text-[var(--rentsure-blue)]" />
            <span className="text-sm text-slate-600">RentSure Operations</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--rentsure-blue)] px-1.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px] rounded-2xl border-slate-200 bg-white p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">Notifications</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500">{unreadCount} unread</p>
                    {unreadCount ? <Button type="button" variant="ghost" size="sm" onClick={() => { void markAllNotificationsRead(); setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))); setUnreadCount(0); }}>Mark all read</Button> : null}
                  </div>
                </div>
                {!visibleNotifications.length ? <p className="text-sm text-slate-500">No notifications.</p> : null}
                {visibleNotifications.map((notification) => (
                  <div key={notification.id} className={`rounded-2xl border p-3 ${notification.readAt ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"}`}>
                    <p className="font-medium text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">{formatDate(notification.createdAt)}</p>
                      <div className="flex items-center gap-2">
                        {notification.ctaPath ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => void readNotification(notification)}>
                            {actionLabel(notification.ctaLabel)}
                          </Button>
                        ) : null}
                        <Button type="button" variant="outline" size="sm" onClick={() => void readNotification(notification)}>
                          Mark read
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="ghost" className="w-full" onClick={() => nav("/account/notifications")}>View all</Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" className="rounded-lg px-2" onClick={() => nav("/account/profile")} title="My profile">
            <Avatar className="h-8 w-8 rounded-lg md:h-9 md:w-9">
              {userPhotoUrl && !photoFailed ? (
                <AvatarImage
                  src={userPhotoUrl}
                  alt={userName}
                  className="object-cover"
                  onError={() => {
                    setPhotoFailed(true);
                    localStorage.removeItem("userPhotoUrl");
                  }}
                />
              ) : null}
              <AvatarFallback className="rounded-lg bg-gradient-to-br from-[var(--rentsure-blue)] to-[var(--rentsure-blue-deep)] text-sm font-medium text-white">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-2 hidden text-left md:block">
              <div className="text-xs capitalize text-muted-foreground">{userRole}</div>
              <div className="text-sm font-semibold text-[var(--rentsure-blue)]">{userName}</div>
            </div>
            <UserCircle2 className="h-4 w-4 text-[var(--rentsure-blue)] md:hidden" />
          </Button>
        </div>
      </div>
    </header>
  );
}

