import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileStack,
  LayoutDashboard,
  Users,
  Building2,
  SlidersHorizontal,
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
  const location = useLocation();
  const role = getStoredUserRole();
  const showAdminPortal = isAdminPortalRole(role);

  const agentItems = [
    { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
    { label: "Profile", to: "/app/profile", icon: UserCircle2 }
  ];

  const adminGroups = [
    { label: "Customers", icon: Users, items: [{ label: "All Customers", to: "/app/customers" }, { label: "Identity Reviews", to: "/app/identity-reviews" }, { label: "Renter Scores", to: "/app/renters" }] },
    { label: "Properties & Units", icon: Building2, items: [{ label: "Landlord & Agent Activities", to: "/app/landlord-agent-activities" }] },
    { label: "Applications & Tenancies", icon: FileStack, items: [{ label: "Unregistered Requests", to: "/app/unregistered-requests" }, { label: "Renter Activities", to: "/app/renter-activities" }] },
    { label: "Payments", icon: CreditCard, items: [{ label: "Payment Activity", to: "/app/renter-activities" }] },
    { label: "Notifications", icon: Bell, items: [{ label: "Renter Notifications", to: "/app/renter-activities" }, { label: "Landlord & Agent Notifications", to: "/app/landlord-agent-activities" }] },
    { label: "Support", icon: ClipboardCheck, items: [{ label: "Renter Activities", to: "/app/renter-activities" }] },
    { label: "User Management", icon: UserCircle2, items: [{ label: "Users & Admins", to: "/app/users" }] },
    { label: "RentScore Settings", icon: SlidersHorizontal, items: [{ label: "Score Rules", to: "/app/rent-score-setup" }] }
  ];

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
          {showAdminPortal ? <>
            <NavLink
              to="/app/dashboard"
              onClick={onNavigate}
              className={({ isActive }) => cx(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                "focus:outline-none focus:ring-2 focus:ring-[var(--rentsure-blue-soft)]",
                isActive ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)] shadow-sm ring-1 ring-[var(--rentsure-blue-soft)]" : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]"
              )}
            >
              <LayoutDashboard className="h-4 w-4 opacity-80" /><span className="font-medium">Dashboard</span>
            </NavLink>
            {adminGroups.map((group) => {
              const Icon = group.icon;
              const isOpen = group.items.some((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
              return (
                <details key={group.label} open={isOpen || undefined} className="group/nav">
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-slate-50 hover:text-[var(--rentsure-blue)] [&::-webkit-details-marker]:hidden">
                    <Icon className="h-4 w-4 opacity-80" /><span className="flex-1 font-medium">{group.label}</span><ChevronDown className="h-4 w-4 transition group-open/nav:rotate-180" />
                  </summary>
                  <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-3">
                    {group.items.map((item) => <NavLink key={`${group.label}-${item.to}-${item.label}`} to={item.to} onClick={onNavigate} className={({ isActive }) => cx("block rounded-lg px-3 py-2 text-xs transition", isActive ? "bg-[var(--rentsure-blue-soft)] font-semibold text-[var(--rentsure-blue)]" : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]")}>{item.label}</NavLink>)}
                  </div>
                </details>
              );
            })}
            {canManagePortal(role) ? <NavLink to="/app/profile" onClick={onNavigate} className={({ isActive }) => cx("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", isActive ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]" : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]")}><UserCircle2 className="h-4 w-4 opacity-80" /><span className="font-medium">Profile</span></NavLink> : null}
          </> : null}
          {!showAdminPortal && agentItems.map((it) => {
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
