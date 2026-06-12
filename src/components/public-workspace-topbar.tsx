import { useEffect, useState } from "react";
import { Building2, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function PublicWorkspaceTopbar() {
  const nav = useNavigate();
  const userName = localStorage.getItem("userName") || "RentSure user";
  const userRole = (localStorage.getItem("userRole") || "LANDLORD").toLowerCase();
  const userPhotoUrl = localStorage.getItem("userPhotoUrl") || "";
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [userPhotoUrl]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 backdrop-blur">
      <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 md:px-6">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-[var(--rentsure-blue)] md:text-base">Property workspace</div>
          <div className="hidden text-[11px] text-muted-foreground sm:block">
            Shared queue for landlords and agents managing proposed renters and payment schedules
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 lg:flex">
            <Building2 className="h-4 w-4 text-[var(--rentsure-blue)]" />
            <span className="text-sm text-slate-600">Nigeria RentSure Operations</span>
          </div>
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
