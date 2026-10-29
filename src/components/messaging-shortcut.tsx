import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { apiFetch } from "@/lib/api";
export function MessagingShortcut({ path = "/account/messages" }: { path?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (!document.hidden) void apiFetch<{ count: number }>("/api/messaging/unread").then(data => { if (active) setCount(data.count); }).catch(() => {}); };
    refresh();
    const timer = setInterval(refresh, 10000);
    window.addEventListener("focus", refresh); window.addEventListener("messaging-updated", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("messaging-updated", refresh); };
  }, []);
  return <Link to={path} aria-label={`Messages, ${count} unread`} title="Messages" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
    <Mail className="h-5 w-5" />{count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-blue-700 px-1.5 text-[10px] text-white">{count > 99 ? "99+" : count}</span>}
  </Link>;
}
