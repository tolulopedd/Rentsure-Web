import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { PublicWorkspaceSidebar } from "@/components/public-workspace-sidebar";
import { PublicWorkspaceTopbar } from "@/components/public-workspace-topbar";
import { Button } from "@/components/ui/button";
import { clearAuthSession } from "@/lib/api";
import { toast } from "sonner";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PublicWorkspaceLayout() {
  const nav = useNavigate();

  function logout() {
    clearAuthSession();
    toast.success("Logged out");
    nav("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <aside className={cx("hidden md:block md:w-72 md:border border-slate-300 md:bg-background")}>
          <PublicWorkspaceSidebar />
        </aside>

        <div className="flex flex-1 flex-col">
          <PublicWorkspaceTopbar />
          <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto">
              {[
                { label: "Dashboard", to: "/account/dashboard" },
                { label: "Properties", to: "/account/properties" },
                { label: "Link Tenant", to: "/account/queue" },
                { label: "Landlord Decision", to: "/account/decisions" },
                { label: "Payments", to: "/account/payments" },
                { label: "Profile", to: "/account/profile" }
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cx(
                      "whitespace-nowrap rounded-full px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]"
                        : "bg-slate-100 text-slate-600"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-full px-3 text-[var(--rentsure-blue)] hover:bg-slate-100"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
          <main className="relative flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-xl bg-background p-4 shadow-sm md:p-6">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
