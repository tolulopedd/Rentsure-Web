import { useEffect, useState } from "react";
import { ShieldCheck, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import { scoreBandBadgeClass } from "@/lib/renter-workspace-presenters";

export function RenterWorkspaceTopbar() {
  const nav = useNavigate();
  const userName = localStorage.getItem("userName") || "RentSure renter";
  const { data } = useRenterWorkspace();
  const photoUrl = data?.profile.passportPhoto?.viewUrl || "";
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoUrl]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 backdrop-blur">
      <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 md:px-6">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-[var(--rentsure-blue)] md:text-base">Renter workspace</div>
          <div className="hidden text-[11px] text-muted-foreground sm:block">
            Manage your score, view rent score, payment confirmations, and verified your renter profile
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {data ? (
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 lg:flex">
              <ShieldCheck className="h-4 w-4 text-[var(--rentsure-blue)]" />
              <span className="text-sm font-semibold text-slate-950">
                {data.rentScore.summary.score}
                <span className="ml-1 text-xs font-medium text-slate-400">/ {data.rentScore.summary.maxScore}</span>
              </span>
              <Badge className={scoreBandBadgeClass(data.rentScore.summary.scoreBand)}>{data.rentScore.summary.scoreBand}</Badge>
            </div>
          ) : null}
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
