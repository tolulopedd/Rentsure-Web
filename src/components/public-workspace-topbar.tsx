import { Building2, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function PublicWorkspaceTopbar() {
  const nav = useNavigate();
  const userName = localStorage.getItem("userName") || "RentSure user";
  const userRole = (localStorage.getItem("userRole") || "LANDLORD").toLowerCase();
  const userPhotoUrl = localStorage.getItem("userPhotoUrl") || "";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div>
          <div className="text-sm font-semibold tracking-tight text-[var(--rentsure-blue)]">RentSure property workspace</div>
          <div className="text-[11px] text-muted-foreground">
            Shared queue for landlords and agents managing proposed renters and payment schedules
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 md:flex">
            <Building2 className="h-4 w-4 text-[var(--rentsure-blue)]" />
            <span className="text-sm text-slate-600">Nigeria RentSure Operations</span>
          </div>
          <Button variant="ghost" className="rounded-lg" onClick={() => nav("/account/profile")} title="My profile">
            <Avatar className="h-8 w-8 rounded-lg">
              {userPhotoUrl ? <AvatarImage src={userPhotoUrl} alt={userName} className="object-cover" /> : null}
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
