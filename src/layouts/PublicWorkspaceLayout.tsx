import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { PublicWorkspaceSidebar } from "@/components/public-workspace-sidebar";
import { PublicWorkspaceTopbar } from "@/components/public-workspace-topbar";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PublicWorkspaceLayout() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <aside className={cx("hidden md:block md:w-72 md:border border-slate-300 md:bg-background")}>
          <PublicWorkspaceSidebar />
        </aside>

        <div className="flex flex-1 flex-col">
          <PublicWorkspaceTopbar />
          <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { label: "Dashboard", to: "/account/dashboard" },
                { label: "Properties", to: "/account/properties" },
                { label: "Queue", to: "/account/queue" },
                { label: "Decisions", to: "/account/decisions" },
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
