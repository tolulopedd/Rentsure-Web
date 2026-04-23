import { useCallback, useEffect, useState } from "react";
import { Building2, CalendarClock, ListChecks, Scale, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/errors";
import { getWorkspaceOverview, type WorkspaceOverview } from "@/lib/public-workspace-api";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

export default function PublicWorkspaceDashboard() {
  const [data, setData] = useState<WorkspaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async (input?: { silent?: boolean }) => {
    try {
      if (!input?.silent) {
        setLoading(true);
      }
      const response = await getWorkspaceOverview();
      setData(response);
      setError(null);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "Failed to load workspace dashboard"));
    } finally {
      if (!input?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useAutoRefresh(
    () => loadOverview({ silent: true }),
    {
      enabled: Boolean(data),
      intervalMs: 12000
    }
  );

  if (loading) return <div className="text-muted-foreground">Loading workspace...</div>;
  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-rose-600">{error || "Workspace unavailable"}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.15),_transparent_34%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">Dashboard</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Linked properties" value={String(data.summary.propertyCount)} icon={Building2} />
        <MetricCard label="Proposed renters" value={String(data.summary.proposedRenterCount)} icon={ListChecks} />
        <MetricCard label="Score requests" value={String(data.summary.scoreRequestCount)} icon={Scale} />
        <MetricCard label="Payment schedules" value={String(data.summary.pendingScheduleCount)} icon={CalendarClock} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Linked properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data.properties.length ? <p className="text-sm text-muted-foreground">No properties linked yet.</p> : null}
            {data.properties.map((property) => (
              <div key={property.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{property.summaryLabel}</p>
                    <p className="mt-1 text-sm text-slate-600">{property.address}</p>
                    <p className="text-xs text-muted-foreground">{property.city}, {property.state}</p>
                  </div>
                  <Badge variant="outline">{property.membershipRole}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-[var(--rentsure-blue)]" />
              Recent tenants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data.recentRenters.length ? <p className="text-sm text-muted-foreground">No proposed renters yet.</p> : null}
            {data.recentRenters.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.name}</p>
                    <p className="text-sm text-slate-600">{item.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.propertyName}</p>
                    <p className="text-xs text-muted-foreground">{item.propertyAddress}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{item.status}</Badge>
                    <p className="mt-2 text-xs text-muted-foreground">Added {formatDate(item.createdAt)}</p>
                    {item.linkedRentScore ? (
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {item.linkedRentScore.score}
                        <span className="ml-1 text-xs font-medium text-muted-foreground">/ 900</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">Rent score in progress</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Building2 }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-[var(--rentsure-blue)]" />
      </div>
    </div>
  );
}
