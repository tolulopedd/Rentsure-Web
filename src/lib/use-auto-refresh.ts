import { useEffect } from "react";

export function useAutoRefresh(refresh: () => void | Promise<void>, options?: { enabled?: boolean; intervalMs?: number }) {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? 15000;

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;

    const runRefresh = () => {
      if (disposed || typeof document !== "undefined" && document.hidden) {
        return;
      }

      void Promise.resolve(refresh()).catch(() => undefined);
    };

    const onFocus = () => runRefresh();
    const onVisibility = () => {
      if (typeof document === "undefined" || !document.hidden) {
        runRefresh();
      }
    };

    const intervalId = window.setInterval(runRefresh, intervalMs);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs, refresh]);
}
