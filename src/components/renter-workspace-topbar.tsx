import { MessagingShortcut } from "@/components/messaging-shortcut";
import { NotificationBell } from "@/components/notification-bell";
import { useEffect, useState } from "react";
import { UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";

export function RenterWorkspaceTopbar() {
  const nav = useNavigate();
  const userName = localStorage.getItem("userName") || "RentSure renter";
  const { data } = useRenterWorkspace();
  const photoUrl = data?.profile.passportPhoto?.viewUrl || "";
  const [photoFailed, setPhotoFailed] = useState(false);
  const [ngTime, setNgTime] = useState("");
  useEffect(() => {
    setPhotoFailed(false);
  }, [photoUrl]);

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

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 backdrop-blur">
      <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 md:px-6">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-[var(--rentsure-blue)] md:text-base">Renter</div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden flex-col items-end px-2 md:flex">
            <span className="text-sm text-muted-foreground">Nigerian Time</span>
            <span className="text-xs font-medium leading-tight text-[var(--rentsure-blue)]">{ngTime}</span>
          </div>
          <MessagingShortcut />
          <NotificationBell />
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
