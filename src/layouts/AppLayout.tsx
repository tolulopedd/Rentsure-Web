import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useSubmitLock } from "@/lib/use-submit-lock";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppLayout() {
  const { isGlobalSubmitting } = useSubmitLock();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [networkBusy, setNetworkBusy] = useState(false);

  useEffect(() => {
    const onNetwork = (event: Event) => {
      const detail = (event as CustomEvent<{ inFlight?: number }>).detail;
      setNetworkBusy(Number(detail?.inFlight || 0) > 0);
    };

    window.addEventListener("app:network", onNetwork as EventListener);
    return () => window.removeEventListener("app:network", onNetwork as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <div
          className={cx(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={cx(
            "fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-out md:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{ willChange: "transform" }}
        >
          <div className="h-full p-3">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </aside>

        <aside className="hidden md:block md:w-64 md:border border-slate-300 md:bg-background">
          <Sidebar />
        </aside>

        <div className="flex flex-1 flex-col">
          <Topbar onMenu={() => setSidebarOpen(true)} />
          {networkBusy || isGlobalSubmitting ? (
            <div className="h-1 w-full overflow-hidden bg-[var(--rentsure-blue-soft)]">
              <div className="h-full w-1/3 animate-[pulse_1s_ease-in-out_infinite] bg-[var(--rentsure-blue)]" />
            </div>
          ) : null}

          <main className="relative flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-xl bg-background p-4 md:p-6 shadow-sm">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
