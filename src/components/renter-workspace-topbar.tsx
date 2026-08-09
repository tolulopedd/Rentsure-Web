import { useEffect, useMemo, useState } from "react";
import { Bell, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import { formatDate } from "@/lib/renter-workspace-presenters";

export function RenterWorkspaceTopbar() {
  const nav = useNavigate();
  const userName = localStorage.getItem("userName") || "RentSure renter";
  const { data } = useRenterWorkspace();
  const photoUrl = data?.profile.passportPhoto?.viewUrl || "";
  const [photoFailed, setPhotoFailed] = useState(false);
  const [ngTime, setNgTime] = useState("");
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);

  const notifications = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    return data.notifications.filter((notification) => {
      const signature = [
        notification.title.trim().toLowerCase(),
        notification.message.trim().toLowerCase(),
        notification.ctaPath || ""
      ].join("|");
      if (seen.has(signature)) {
        return false;
      }
      seen.add(signature);
      return true;
    });
  }, [data]);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedNotificationIds.includes(notification.id)),
    [dismissedNotificationIds, notifications]
  );

  function closeNotification(notificationId: string) {
    setDismissedNotificationIds((current) => (current.includes(notificationId) ? current : [...current, notificationId]));
  }

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoUrl]);

  useEffect(() => {
    setDismissedNotificationIds((current) => current.filter((id) => notifications.some((notification) => notification.id === id)));
  }, [notifications]);

  useEffect(() => {
    const update = () => {
      const formatter = new Intl.DateTimeFormat("en-NG", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        weekday: "short",
        day: "2-digit",
        month: "short"
      });
      setNgTime(formatter.format(new Date()));
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  function actionLabel(label?: string | null) {
    if (!label) return "Open";
    return label.trim().toLowerCase() === "open account" ? "Open" : label;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 backdrop-blur">
      <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 md:px-6">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-[var(--rentsure-blue)] md:text-base">Renter workspace</div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden flex-col items-end px-2 md:flex">
            <span className="text-sm text-muted-foreground">Nigerian Time</span>
            <span className="text-xs font-medium leading-tight text-[var(--rentsure-blue)]">{ngTime}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5" />
                {visibleNotifications.length > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--rentsure-blue)] px-1.5 text-[10px] font-semibold text-white">
                    {visibleNotifications.length}
                  </span>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px] rounded-2xl border-slate-200 bg-white p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">Notifications</p>
                  <p className="text-xs text-slate-500">{visibleNotifications.length}</p>
                </div>
                {!visibleNotifications.length ? <p className="text-sm text-slate-500">No notifications right now.</p> : null}
                {visibleNotifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="font-medium text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">{formatDate(notification.createdAt)}</p>
                      <div className="flex items-center gap-2">
                        {notification.ctaPath ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => nav(notification.ctaPath || "/account/renter/dashboard")}>
                            {actionLabel(notification.ctaLabel)}
                          </Button>
                        ) : null}
                        <Button type="button" variant="outline" size="sm" onClick={() => closeNotification(notification.id)}>
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" className="rounded-lg px-2" onClick={() => nav("/account/renter/profile")} title="My profile">
            <Avatar className="h-8 w-8 rounded-lg md:h-9 md:w-9">
              {photoUrl && !photoFailed ? (
                <AvatarImage
                  src={photoUrl}
                  alt={userName}
                  className="object-cover"
                  onError={() => setPhotoFailed(true)}
                />
              ) : null}
              <AvatarFallback className="rounded-lg bg-gradient-to-br from-[var(--rentsure-blue)] to-[var(--rentsure-blue-deep)] text-sm font-medium text-white">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-2 hidden text-left md:block">
              <div className="text-xs text-muted-foreground">renter</div>
              <div className="text-sm font-semibold text-[var(--rentsure-blue)]">{userName}</div>
            </div>
            <UserCircle2 className="h-4 w-4 text-[var(--rentsure-blue)] md:hidden" />
          </Button>
        </div>
      </div>
    </header>
  );
}
