import { NavLink, Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearAuthSession } from "@/lib/api";
import { RenterWorkspaceProvider, useRenterWorkspace } from "@/lib/renter-workspace-context";
import { RenterWorkspaceSidebar } from "@/components/renter-workspace-sidebar";
import { RenterWorkspaceTopbar } from "@/components/renter-workspace-topbar";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function RenterWorkspaceShell({ children }: { children?: ReactNode }) {
  const { data, loading, loadError, refresh } = useRenterWorkspace();
  const nav = useNavigate();

  function logout() {
    clearAuthSession();
    toast.success("Logged out");
    nav("/login");
  }

  if (loading) {
    return <div className="min-h-screen bg-muted/30 px-4 py-6 text-muted-foreground md:px-6 md:py-10">Loading...</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_40%,#f8fbff_100%)] px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Workspace unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                {loadError || "Unable to load your account."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void refresh()} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                  Retry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    clearAuthSession();
                    window.location.assign("/login");
                  }}
                >
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <aside className={cx("hidden md:block md:w-72 md:border border-slate-300 md:bg-background")}>
          <RenterWorkspaceSidebar />
        </aside>

        <div className="flex flex-1 flex-col">
          <RenterWorkspaceTopbar />
          <div className="border-b border-slate-200 bg-white px-2.5 py-2.5 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { label: "Dashboard", mobileLabel: "Dashboard", to: "/account/renter/dashboard" },
                { label: "Linked Properties", mobileLabel: "My Links", to: "/account/renter/cases" },
                { label: "Landlord Decision", mobileLabel: "Decision", to: "/account/renter/queue" },
                { label: "Payments", mobileLabel: "Payments", to: "/account/renter/payments" },
                { label: "Notifications", mobileLabel: "Alerts", to: "/account/notifications" },
                { label: "Profile", mobileLabel: "Profile", to: "/account/renter/profile" }
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cx(
                      "whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition",
                      isActive
                        ? "bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]"
                        : "bg-slate-100 text-slate-600"
                    )
                  }
                >
                  <span className="sm:hidden">{item.mobileLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium text-[var(--rentsure-blue)] hover:bg-slate-100"
                onClick={logout}
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Logout
              </Button>
              </div>
            </div>
          </div>
          <main className="relative flex-1 overflow-y-auto p-3 md:p-6">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-xl bg-background p-3 shadow-sm md:p-6">
                {children || <Outlet />}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function RenterWorkspaceLayout({ children }: { children?: ReactNode }) {
  return (
    <RenterWorkspaceProvider>
      <RenterWorkspaceShell>{children}</RenterWorkspaceShell>
    </RenterWorkspaceProvider>
  );
}

