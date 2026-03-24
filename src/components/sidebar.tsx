import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Scale,
  UserCircle2,
  LogOut
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { clearAuthSession } from "@/lib/api";
import { canManagePortal, getStoredUserRole, isAdminPortalRole } from "@/lib/roles";
import { toast } from "sonner";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNavigate();
  const role = getStoredUserRole();
  const showAdminPortal = isAdminPortalRole(role);

  const agentItems = [
    { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
    { label: "Profile", to: "/app/profile", icon: UserCircle2 }
  ];

  const adminItems = [
    { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
    { label: "Renter Queue", to: "/app/renters", icon: Users },
    { label: "Rent Score", to: "/app/rent-score", icon: Scale },
    ...(canManagePortal(role) ? [{ label: "Profile", to: "/app/profile", icon: UserCircle2 }] : [])
  ];

  const items = showAdminPortal ? adminItems : agentItems;

  function logout() {
    clearAuthSession();
    toast.success("Logged out");
    nav("/login");
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-4 pb-3 pt-6">
        <BrandLogo size="sm" showTagline className="scale-[0.9] origin-left" />
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto px-3 py-6">
        <nav className="space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--rentsure-blue-soft)]",
                    isActive
                      ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)] shadow-sm ring-1 ring-[var(--rentsure-blue-soft)]"
                      : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]"
                  )
                }
              >
                <Icon className={cx("h-4 w-4 transition", "group-hover:opacity-100", "opacity-80")} />
                <span className="font-medium">{it.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <Separator />

      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start rounded-xl text-[var(--rentsure-blue)] hover:bg-slate-50"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>

        <div className="mt-3 px-2 text-[11px] text-muted-foreground">Powered by RentSure</div>
      </div>
    </div>
  );
}
