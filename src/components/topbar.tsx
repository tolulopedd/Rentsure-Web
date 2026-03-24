import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuthSession } from "@/lib/api";
import { getStoredUserRole, isAdminPortalRole } from "@/lib/roles";

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const nav = useNavigate();
  const [ngTime, setNgTime] = useState("");
  const userName = localStorage.getItem("userName") || "User";
  const role = getStoredUserRole();
  const userRole = role.toLowerCase();
  const isAdmin = isAdminPortalRole(role);

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

  function logout() {
    clearAuthSession();
    nav("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-[var(--rentsure-blue)]">
              RentSure workspace
            </div>
            <div className="text-[11px] text-muted-foreground">
              {isAdmin ? "Rent score controls and renter review" : "RentSure staff workspace"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end px-2 md:flex">
            <span className="text-sm text-muted-foreground">Lagos Time</span>
            <span className="text-xs font-medium leading-tight text-[var(--rentsure-blue)]">{ngTime}</span>
          </div>

          <Button
            variant="ghost"
            className="rounded-lg flex items-center gap-2"
            onClick={() => nav("/app/profile")}
            title="My Profile"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--rentsure-blue)] to-[var(--rentsure-blue-deep)] text-sm font-medium text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden text-left md:block">
              <div className="text-xs text-muted-foreground capitalize">{userRole}</div>
              <div className="text-sm font-semibold text-[var(--rentsure-blue)]">{userName}</div>
            </div>
            <User className="h-4 w-4 text-[var(--rentsure-blue)] md:hidden" />
          </Button>

          <Button variant="ghost" onClick={logout} className="rounded-lg text-[var(--rentsure-blue)]" title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
