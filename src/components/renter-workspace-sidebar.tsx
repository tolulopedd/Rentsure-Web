import { ClipboardList, CreditCard, LayoutDashboard, ListChecks, LogOut, Share2, UserCircle2 } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { clearAuthSession } from "@/lib/api";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const items = [
  { label: "Dashboard", to: "/account/renter/dashboard", icon: LayoutDashboard },
  { label: "Linked Properties", to: "/account/renter/cases", icon: ClipboardList },
  { label: "Queue", to: "/account/renter/queue", icon: ListChecks },
  { label: "Payments", to: "/account/renter/payments", icon: CreditCard },
  { label: "Profile", to: "/account/renter/profile", icon: UserCircle2 },
  { label: "Share score", to: "/account/renter/share-score", icon: Share2 }
];

export function RenterWorkspaceSidebar() {
  const nav = useNavigate();

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
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your rent score, payment confirmations, and profile trust signals live here.
          </p>
        </div>

        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    isActive
                      ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)] shadow-sm ring-1 ring-[var(--rentsure-blue-soft)]"
                      : "text-muted-foreground hover:bg-slate-50 hover:text-[var(--rentsure-blue)]"
                  )
                }
              >
                <Icon className="h-4 w-4 opacity-80 transition group-hover:opacity-100" />
                <span className="font-medium">{item.label}</span>
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
      </div>
    </div>
  );
}
