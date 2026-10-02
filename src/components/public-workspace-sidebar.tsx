import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Building2, ChevronDown, ClipboardCheck, CreditCard, LayoutDashboard, LogOut, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { clearAuthSession } from "@/lib/api";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PublicWorkspaceSidebar() {
  const nav = useNavigate();
  const location = useLocation();
  const userRole = (localStorage.getItem("userRole") || "LANDLORD").toUpperCase();
  const roleLabel = userRole === "AGENT" ? "Agent" : "Landlord";
  const groups = [
    { label: "Properties & Units", icon: Building2, items: [{ label: "Properties", to: "/account/properties" }, { label: "Link Tenant", to: "/account/queue" }] },
    { label: "Applications & Tenancies", icon: ClipboardCheck, items: [{ label: "Landlord Decision", to: "/account/decisions" }] },
    { label: "Payments", icon: CreditCard, items: [{ label: "Payment Schedules", to: "/account/payments" }] },
    { label: "Notifications", icon: Bell, items: [{ label: "Notification History", to: "/account/notifications" }] }
  ];

  function logout() {
    clearAuthSession();
    toast.success("Logged out");
    nav("/login");
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-4 pb-3 pt-6">
        <BrandLogo size="sm" showTagline className="origin-left scale-[0.9]" />
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto px-3 py-6">
        <div className="mb-5 rounded-2xl border border-[var(--rentsure-blue-soft)] bg-[var(--rentsure-blue-soft)]/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">
            {roleLabel}
          </p>
        </div>

        <nav className="space-y-1">
          <NavLink to="/account/dashboard" className={({ isActive }) => cx("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", isActive ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)] shadow-sm ring-1 ring-[var(--rentsure-blue-soft)]" : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]")}><LayoutDashboard className="h-4 w-4 opacity-80" /><span className="font-medium">Dashboard</span></NavLink>
          {groups.map((group) => {
            const Icon = group.icon;
            const isOpen = group.items.some((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
            return (
              <details key={group.label} open={isOpen || undefined} className="group/nav">
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-slate-50 hover:text-[var(--rentsure-blue)] [&::-webkit-details-marker]:hidden"><Icon className="h-4 w-4 opacity-80" /><span className="flex-1 font-medium">{group.label}</span><ChevronDown className="h-4 w-4 transition group-open/nav:rotate-180" /></summary>
                <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-3">{group.items.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => cx("block rounded-lg px-3 py-2 text-xs transition", isActive ? "bg-[var(--rentsure-blue-soft)] font-semibold text-[var(--rentsure-blue)]" : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]")}>{item.label}</NavLink>)}</div>
              </details>
            );
          })}
          <NavLink to="/account/profile" className={({ isActive }) => cx("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", isActive ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)] shadow-sm ring-1 ring-[var(--rentsure-blue-soft)]" : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]")}><UserCircle2 className="h-4 w-4 opacity-80" /><span className="font-medium">Profile</span></NavLink>
          <Button
            variant="ghost"
            className="w-full justify-start rounded-xl px-3 py-2.5 text-sm text-[var(--rentsure-blue)] hover:bg-slate-50"
            onClick={logout}
          >
            <LogOut className="mr-3 h-4 w-4 opacity-80" />
            <span className="font-medium">Logout</span>
          </Button>
        </nav>
      </div>
    </div>
  );
}
