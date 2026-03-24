import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Download, PauseCircle, Send, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import {
  decideWorkspaceProposedRenter,
  forwardWorkspaceScoreRequest,
  getWorkspaceQueueItem,
  listWorkspaceQueue,
  requestWorkspaceRentScore,
  type ProposedRenterDecision,
  type QueueDetail,
  type QueueListItem
} from "@/lib/public-workspace-api";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatNgn(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

function renterName(item: { firstName: string; lastName: string; organizationName?: string | null }) {
  return item.organizationName || [item.firstName, item.lastName].filter(Boolean).join(" ");
}

function decisionBadgeClass(decision?: string | null) {
  if (decision === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (decision === "HOLD") return "border-amber-200 bg-amber-50 text-amber-700";
  if (decision === "DECLINED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function PublicWorkspaceDecisions() {
  const [queue, setQueue] = useState<QueueListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<QueueDetail | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const rawRole = (localStorage.getItem("userRole") || "").toUpperCase();
  const isAgent = rawRole === "AGENT";
  const isLandlord = rawRole === "LANDLORD";

  const loadQueue = useCallback(async (nextSelectedId?: string, input?: { silent?: boolean }) => {
    try {
      if (!input?.silent) {
        setLoading(true);
      }
      const response = await listWorkspaceQueue();
      setQueue(response.items);
      const resolvedId =
        nextSelectedId && response.items.some((item) => item.id === nextSelectedId)
          ? nextSelectedId
          : response.items[0]?.id || "";
      setSelectedId(resolvedId);
    } catch (error: unknown) {
      if (!input?.silent) {
        toast.error(getErrorMessage(error, "Failed to load decision queue"));
      }
    } finally {
      if (!input?.silent) {
        setLoading(false);
      }
    }
  }, []);

  const loadDetail = useCallback(async (id: string, input?: { silent?: boolean }) => {
    if (!id) {
      setDetail(null);
      return;
    }
    try {
      if (!input?.silent) {
        setDetailLoading(true);
      }
      const response = await getWorkspaceQueueItem(id);
      setDetail(response);
      setDecisionNote(response.decision?.note || "");
    } catch (error: unknown) {
      if (!input?.silent) {
        toast.error(getErrorMessage(error, "Failed to load queue detail"));
      }
    } finally {
      if (!input?.silent) {
        setDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  useAutoRefresh(
    async () => {
      const currentSelectedId = selectedId;
      await loadQueue(currentSelectedId, { silent: true });
      const fallbackSelectedId = currentSelectedId || queue[0]?.id || "";
      if (fallbackSelectedId) {
        await loadDetail(fallbackSelectedId, { silent: true });
      }
    },
    {
      enabled: Boolean(queue.length || selectedId),
      intervalMs: 12000
    }
  );

  async function requestScore() {
    if (!detail) return;
    try {
      const response = await requestWorkspaceRentScore(detail.id, detail.notes || undefined);
      setDetail(response);
      await loadQueue(detail.id);
      toast.success("Rent score request created");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to request rent score"));
    }
  }

  async function forwardScoreRequest() {
    if (!detail?.scoreRequests[0]) return;
    try {
      const response = await forwardWorkspaceScoreRequest(detail.scoreRequests[0].id);
      setDetail(response);
      await loadQueue(detail.id);
      toast.success("Score report forwarded to landlord");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to forward score report"));
    }
  }

  async function takeDecision(decision: ProposedRenterDecision) {
    if (!detail) return;
    try {
      const response = await decideWorkspaceProposedRenter(detail.id, {
        decision,
        note: decisionNote.trim() || undefined
      });
      setDetail(response);
      setDecisionNote(response.decision?.note || "");
      await loadQueue(detail.id);
      toast.success(`Renter marked as ${decision.toLowerCase()}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to save landlord decision"));
    }
  }

  function downloadReport() {
    if (!detail || !detail.linkedRentScoreReport) return;
    const renter = renterName(detail);
    const decisionLabel = detail.decision?.decision || "PENDING";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>RentSure Report - ${escapeHtml(renter)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1, h2, h3 { margin: 0 0 12px; }
            .hero { padding: 24px; border: 1px solid #dbe4f3; border-radius: 18px; background: linear-gradient(135deg, #ffffff, #eef5ff); }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
            .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; }
            .section { margin-top: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 13px; }
            th { background: #f8fafc; }
            ul { padding-left: 18px; }
          </style>
        </head>
        <body>
          <div class="hero">
            <h1>RentSure Rent Score Report</h1>
            <p><strong>Proposed renter:</strong> ${escapeHtml(renter)}</p>
            <p><strong>Property:</strong> ${escapeHtml(detail.property.summaryLabel)}</p>
            <p><strong>Property address:</strong> ${escapeHtml(detail.property.address)}, ${escapeHtml(detail.property.city)}, ${escapeHtml(detail.property.state)}</p>
            <p><strong>Landlord decision:</strong> ${escapeHtml(decisionLabel)}</p>
          </div>
          <div class="meta">
            <div class="card">
              <h3>Renter details</h3>
              <p><strong>Email:</strong> ${escapeHtml(detail.email)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(detail.phone)}</p>
              <p><strong>Address:</strong> ${escapeHtml(detail.address || "Profile information pending")}</p>
            </div>
            <div class="card">
              <h3>Decision details</h3>
              <p><strong>Status:</strong> ${escapeHtml(detail.status)}</p>
              <p><strong>Decision note:</strong> ${escapeHtml(detail.decision?.note || "No note added")}</p>
              <p><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
            </div>
          </div>
          <div class="section">
            <h3>Rent Score Summary</h3>
            <p><strong>Score:</strong> ${detail.linkedRentScoreReport.summary.score} / ${detail.linkedRentScoreReport.summary.maxScore}</p>
            <p><strong>Band:</strong> ${detail.linkedRentScoreReport.summary.scoreBand}</p>
            <p><strong>Positive points:</strong> ${detail.linkedRentScoreReport.summary.positivePoints}</p>
            <p><strong>Negative points:</strong> ${detail.linkedRentScoreReport.summary.negativePoints}</p>
            <p><strong>Policy:</strong> ${escapeHtml(detail.linkedRentScoreReport.policy.name)}</p>
          </div>
          <div class="section">
            <h3>Rule Breakdown</h3>
            <table>
              <thead>
                <tr><th>Rule</th><th>Points</th><th>Applied</th><th>Contribution</th></tr>
              </thead>
              <tbody>
                ${detail.linkedRentScoreReport.breakdown
                  .map(
                    (item) => `
                      <tr>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${item.points}</td>
                        <td>${item.appliedOccurrences}</td>
                        <td>${item.contribution}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          <div class="section">
            <h3>Payment schedules</h3>
            ${
              detail.paymentSchedules.length
                ? `<ul>${detail.paymentSchedules
                    .map(
                      (schedule) =>
                        `<li>${escapeHtml(schedule.paymentType.replaceAll("_", " "))}: ${escapeHtml(formatNgn(schedule.amountNgn))} due ${escapeHtml(
                          formatDate(schedule.dueDate)
                        )} (${escapeHtml(schedule.status)})</li>`
                    )
                    .join("")}</ul>`
                : "<p>No payment schedules have been logged yet.</p>"
            }
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${renter.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-rentsure-report.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Landlord decision</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review rent score outcomes, forward reports, and take approval, hold, or decline decisions.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Decision queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading decision queue...</p> : null}
            {!loading && !queue.length ? <p className="text-sm text-muted-foreground">No proposed renters available yet.</p> : null}
            {queue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedId === item.id
                    ? "border-[var(--rentsure-blue)] bg-[var(--rentsure-blue-soft)]/60"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{renterName(item)}</p>
                    <p className="text-sm text-slate-600">{item.property.summaryLabel}</p>
                    <p className="text-xs text-muted-foreground">{item.property.address}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={decisionBadgeClass(item.decision?.decision)} variant="outline">
                      {item.decision?.decision || item.status}
                    </Badge>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.linkedRentScore ? `${item.linkedRentScore.score} / 900` : "Rent score in progress"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Decision detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {detailLoading ? <p className="text-sm text-muted-foreground">Loading decision detail...</p> : null}
            {!detailLoading && !detail ? <p className="text-sm text-muted-foreground">Select a proposed renter to continue.</p> : null}
            {detail ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{renterName(detail)}</p>
                      <p className="text-sm text-slate-600">{detail.email} · {detail.phone}</p>
                      <p className="mt-2 text-sm text-slate-600">{detail.property.summaryLabel}</p>
                      <p className="text-xs text-muted-foreground">{detail.property.address}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={decisionBadgeClass(detail.decision?.decision)} variant="outline">
                        {detail.decision?.decision || detail.status}
                      </Badge>
                      {detail.linkedRentScore ? (
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                          {detail.linkedRentScore.score}
                          <span className="ml-1 text-sm font-medium text-muted-foreground">/ 900</span>
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">Rent score review is pending</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => void requestScore()}
                    disabled={Boolean(detail.scoreRequests.length)}
                    className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    {detail.scoreRequests.length ? "Rent score requested" : "Request rent score"}
                  </Button>
                  {isAgent ? (
                    <Button
                      variant="outline"
                      onClick={() => void forwardScoreRequest()}
                      disabled={!detail.scoreRequests.length || detail.scoreRequests[0]?.status === "FORWARDED"}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {detail.scoreRequests[0]?.status === "FORWARDED" ? "Forwarded to landlord" : "Forward report to landlord"}
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={downloadReport} disabled={!detail.linkedRentScoreReport}>
                    <Download className="mr-2 h-4 w-4" />
                    Download report
                  </Button>
                </div>

                {detail.decision ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current landlord decision</p>
                    <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{detail.decision.decision}</p>
                        <p className="text-sm text-slate-600">
                          {detail.decision.decidedBy?.name ? `By ${detail.decision.decidedBy.name}` : "Decision maker not captured"}
                          {detail.decision.decidedAt ? ` on ${formatDate(detail.decision.decidedAt)}` : ""}
                        </p>
                      </div>
                      {detail.decision.note ? <p className="max-w-xl text-sm text-slate-600">{detail.decision.note}</p> : null}
                    </div>
                  </div>
                ) : null}

                {isLandlord ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-950">Landlord decision</p>
                    {!detail.linkedRentScoreReport ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Decision actions unlock once the rent score report is ready.
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-2">
                      <Label>Decision note</Label>
                      <Textarea
                        value={decisionNote}
                        onChange={(event) => setDecisionNote(event.target.value)}
                        placeholder="Why are you approving, holding, or declining this renter?"
                        className="bg-white"
                        disabled={!detail.linkedRentScoreReport}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        onClick={() => void takeDecision("APPROVED")}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={!detail.linkedRentScoreReport}
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button variant="outline" onClick={() => void takeDecision("HOLD")} disabled={!detail.linkedRentScoreReport}>
                        <PauseCircle className="mr-2 h-4 w-4" />
                        Hold
                      </Button>
                      <Button
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => void takeDecision("DECLINED")}
                        disabled={!detail.linkedRentScoreReport}
                      >
                        <ShieldX className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-950">Timeline / audit trail</p>
                    {!detail.activities.length ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
                    {detail.activities.map((activity) => (
                      <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-950">{activity.message}</p>
                          <Badge variant="outline">{activity.activityType.replaceAll("_", " ")}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activity.actor ? `${activity.actor.name} · ` : ""}
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-950">Rent score request history</p>
                    {!detail.scoreRequests.length ? <p className="text-sm text-muted-foreground">No score requests yet.</p> : null}
                    {detail.scoreRequests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="outline">{request.status}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">Requested by {request.requestedBy.name}</p>
                        {request.forwardedTo ? <p className="text-sm text-slate-700">Forwarded to {request.forwardedTo.name}</p> : null}
                        {request.notes ? <p className="mt-2 text-sm text-slate-600">{request.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
