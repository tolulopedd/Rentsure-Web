import { Bell, ChevronDown, ClipboardList, CreditCard, LayoutDashboard, ListChecks, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { clearAuthSession } from "@/lib/api";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function RenterWorkspaceSidebar() {
  const nav = useNavigate();
  const location = useLocation();
  const groups = [
    { label: "Properties & Units", icon: ClipboardList, items: [{ label: "Linked Properties", to: "/account/renter/cases" }] },
    { label: "Applications & Tenancies", icon: ListChecks, items: [{ label: "Landlord Decision", to: "/account/renter/queue" }] },
    { label: "Payments", icon: CreditCard, items: [{ label: "Payments and Proof", to: "/account/renter/payments" }] },
    { label: "RentScore", icon: ShieldCheck, items: [{ label: "Your Rent Score", to: "/account/renter/buy-score" }, { label: "Share Rent Score", to: "/account/renter/share-score" }] },
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Renter</p>
        </div>

        <nav className="space-y-1">
          <NavLink to="/account/renter/dashboard" className={({ isActive }) => cx("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", isActive ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)] shadow-sm ring-1 ring-[var(--rentsure-blue-soft)]" : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]")}><LayoutDashboard className="h-4 w-4 opacity-80" /><span className="font-medium">Dashboard</span></NavLink>
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
          <NavLink to="/account/renter/profile" className={({ isActive }) => cx("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", isActive ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)] shadow-sm ring-1 ring-[var(--rentsure-blue-soft)]" : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]")}><UserCircle2 className="h-4 w-4 opacity-80" /><span className="font-medium">Profile</span></NavLink>
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
