import { useEffect, useRef } from "react";
import { clearAuthSession, getAccessToken } from "@/lib/api";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = "rentsure:last-activity-at";
const ACTIVITY_SYNC_THROTTLE_MS = 5000;

function readLastActivity() {
  const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function writeLastActivity(timestamp: number) {
  localStorage.setItem(ACTIVITY_STORAGE_KEY, String(timestamp));
}

export function SessionTimeoutGuard() {
  const lastActivityRef = useRef(Date.now());
  const timeoutIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }

    const syncActivity = (timestamp: number) => {
      lastActivityRef.current = timestamp;
      writeLastActivity(timestamp);
    };

    const logoutForInactivity = () => {
      if (!getAccessToken()) return;
      clearAuthSession();
      window.location.assign("/login");
    };

    const scheduleTimeout = () => {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }

      const remainingMs = Math.max(0, IDLE_TIMEOUT_MS - (Date.now() - lastActivityRef.current));
      timeoutIdRef.current = window.setTimeout(logoutForInactivity, remainingMs);
    };

    const markActivity = () => {
      if (!getAccessToken()) return;
      const now = Date.now();
      if (now - lastActivityRef.current < ACTIVITY_SYNC_THROTTLE_MS) {
        return;
      }
      syncActivity(now);
      scheduleTimeout();
    };

    const syncFromStorage = () => {
      const stored = readLastActivity();
      lastActivityRef.current = stored;
      if (Date.now() - stored >= IDLE_TIMEOUT_MS) {
        logoutForInactivity();
        return;
      }
      scheduleTimeout();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_STORAGE_KEY) {
        syncFromStorage();
      }
      if (event.key === "accessToken" && !event.newValue) {
        window.location.assign("/login");
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

    syncActivity(Date.now());
    scheduleTimeout();

    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", syncFromStorage);
    window.addEventListener("focus", syncFromStorage);

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", syncFromStorage);
      window.removeEventListener("focus", syncFromStorage);
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  return null;
}
