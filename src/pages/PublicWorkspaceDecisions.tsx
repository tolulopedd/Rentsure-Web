import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Download, PauseCircle, Send, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { occupancyLabel, propertyDisplayName, propertyUnitDisplayName } from "@/lib/property-display";
import { rentScoreBandLabel } from "@/lib/rent-score-band";
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

function decisionLabel(decision?: string | null) {
  if (decision === "HOLD") return "Request for additional information";
  if (decision === "APPROVED") return "Approved";
  if (decision === "DECLINED") return "Declined";
  return decision || "Pending";
}

function scoreBandBadgeClass(scoreBand?: string | null) {
  if (scoreBand === "STRONG") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (scoreBand === "STABLE") return "border-sky-200 bg-sky-50 text-sky-700";
  if (scoreBand === "WATCH") return "border-amber-200 bg-amber-50 text-amber-700";
  if (scoreBand === "RISK") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
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
          : "";
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
      if (currentSelectedId) {
        await loadDetail(currentSelectedId, { silent: true });
      }
    },
    {
      enabled: Boolean(queue.length || selectedId),
      intervalMs: 12000
    }
  );

  async function requestRentScore() {
    if (!detail) return;
    try {
      await requestWorkspaceRentScore(detail.id, detail.notes || undefined);
      await loadQueue(detail.id);
      await loadDetail(detail.id);
      toast.success("Rent score requested.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to request rent score"));
    }
  }

  async function forwardScoreRequest() {
    if (!detail?.scoreRequests[0]) return;
    try {
      await forwardWorkspaceScoreRequest(detail.scoreRequests[0].id);
      await loadQueue(detail.id);
      await loadDetail(detail.id);
      toast.success("Score report forwarded to landlord");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to forward score report"));
    }
  }

  async function takeDecision(decision: ProposedRenterDecision) {
    if (!detail) return;
    try {
      await decideWorkspaceProposedRenter(detail.id, {
        decision,
        note: decisionNote.trim() || undefined
      });
      await loadQueue(detail.id);
      await loadDetail(detail.id);
      toast.success(`Renter marked as ${decisionLabel(decision).toLowerCase()}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to save landlord decision"));
    }
  }

  function downloadReport() {
    if (!detail || !detail.linkedRentScoreReport) return;
    const renter = renterName(detail);
    const currentDecisionLabel = decisionLabel(detail.decision?.decision);
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
            <p><strong>Property:</strong> ${escapeHtml(propertyDisplayName(detail.property))}</p>
            <p><strong>Unit:</strong> ${escapeHtml(
              detail.propertyUnit
                ? `${propertyUnitDisplayName(detail.propertyUnit)} · ${occupancyLabel(detail.propertyUnit.isOccupied)}`
                : propertyUnitDisplayName(detail.propertyUnit)
            )}</p>
            <p><strong>Property address:</strong> ${escapeHtml(detail.property.address)}, ${escapeHtml(detail.property.city)}, ${escapeHtml(detail.property.state)}</p>
            <p><strong>Landlord decision:</strong> ${escapeHtml(currentDecisionLabel)}</p>
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
            <p><strong>Status:</strong> ${escapeHtml(decisionLabel(detail.status))}</p>
              <p><strong>Decision note:</strong> ${escapeHtml(detail.decision?.note || "No note added")}</p>
              <p><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
            </div>
          </div>
          <div class="section">
            <h3>Rent Score Summary</h3>
            <p><strong>Score:</strong> ${detail.linkedRentScoreReport.summary.score} / ${detail.linkedRentScoreReport.summary.maxScore}</p>
            <p><strong>Band:</strong> ${rentScoreBandLabel(detail.linkedRentScoreReport.summary.scoreBand)}</p>
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

  const canRequestScore = Boolean(detail && !detail.scoreRequests.length);
  const requestButtonLabel = detail?.scoreRequests.length ? "Rent score requested" : "Request rent score";

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">Landlord Decision</h1>
      </div>

      <div className="space-y-4 md:space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Linked tenants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-sm text-muted-foreground">Loading decision queue...</p> : null}
            {!loading && !queue.length ? <p className="text-sm text-muted-foreground">No proposed renters available yet.</p> : null}
            {!loading && queue.length ? (
              <div className="space-y-2">
                <Label>Linked tenant</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select linked tenant" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {queue.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {renterName(item)} · {propertyDisplayName(item.property)} · {propertyUnitDisplayName(item.propertyUnit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Decision details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {detailLoading ? <p className="text-sm text-muted-foreground">Loading decision detail...</p> : null}
            {!detailLoading && !selectedId ? <p className="text-sm text-muted-foreground">Select a linked tenant to continue.</p> : null}
            {!detailLoading && selectedId && !detail ? <p className="text-sm text-muted-foreground">Loading decision detail...</p> : null}
            {detail ? (
              <>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:px-4 md:py-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-slate-950">{renterName(detail)}</p>
                          <Badge className={decisionBadgeClass(detail.decision?.decision)} variant="outline">
                            {decisionLabel(detail.decision?.decision || detail.status)}
                          </Badge>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <DetailPair label="Email" value={detail.email} />
                          <DetailPair label="Phone" value={detail.phone} />
                          <DetailPair label="Property" value={propertyDisplayName(detail.property)} />
                          <DetailPair
                            label="Unit"
                            value={
                              detail.propertyUnit
                                ? `${propertyUnitDisplayName(detail.propertyUnit)} · ${occupancyLabel(detail.propertyUnit.isOccupied)}`
                                : propertyUnitDisplayName(detail.propertyUnit)
                            }
                          />
                          <div className="md:col-span-2">
                            <DetailPair
                              label="Address"
                              value={`${detail.property.address}, ${detail.property.city}, ${detail.property.state}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isAgent && detail.linkedRentScoreReport ? (
                      <div className="rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.12),_transparent_38%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] px-3 py-4 md:px-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rentsure-blue)]">Rent score report</p>
                            <div className="mt-3 flex flex-wrap items-end gap-3">
                              <p className="text-4xl font-bold tracking-[-0.04em] text-slate-950">
                                {detail.linkedRentScoreReport.summary.score}
                                <span className="ml-2 text-lg font-medium text-slate-400">
                                  / {detail.linkedRentScoreReport.summary.maxScore}
                                </span>
                              </p>
                              <Badge className={scoreBandBadgeClass(detail.linkedRentScoreReport.summary.scoreBand)} variant="outline">
                                {rentScoreBandLabel(detail.linkedRentScoreReport.summary.scoreBand)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                              Shared report is ready for landlord review.
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Positive</p>
                              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                                +{detail.linkedRentScoreReport.summary.positivePoints}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Negative</p>
                              <p className="mt-2 text-2xl font-semibold text-rose-700">
                                {detail.linkedRentScoreReport.summary.negativePoints}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Events</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-950">
                                {detail.linkedRentScoreReport.summary.eventCount}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          {detail.linkedRentScoreReport.breakdown.filter((item) => item.appliedOccurrences > 0).slice(0, 6).map((item) => (
                            <div key={item.ruleId} className="rounded-2xl border border-slate-200 bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-slate-950">{item.name}</p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Applied {item.appliedOccurrences} time{item.appliedOccurrences === 1 ? "" : "s"}
                                  </p>
                                </div>
                                <span className={`text-sm font-semibold ${item.contribution >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                  {item.contribution > 0 ? "+" : ""}
                                  {item.contribution}
                                </span>
                              </div>
                            </div>
                          ))}
                          {!detail.linkedRentScoreReport.breakdown.some((item) => item.appliedOccurrences > 0) ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
                              No scored activity has been recorded yet for this renter.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:px-4 md:py-4">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => void requestRentScore()}
                          disabled={!canRequestScore}
                          className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          {requestButtonLabel}
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
                        {!isAgent ? (
                          <Button variant="outline" onClick={downloadReport} disabled={!detail.linkedRentScoreReport}>
                            <Download className="mr-2 h-4 w-4" />
                            Download report
                          </Button>
                        ) : null}
                      </div>
                      {!detail.linkedRentScoreReport && !isAgent ? (
                        <p className="mt-3 text-sm text-slate-500">Download report becomes available once the renter shares a rent score report.</p>
                      ) : null}
                    </div>

                    {detail.decision ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:px-4 md:py-4">
                        <div className="space-y-2 text-sm text-slate-600">
                          <SummaryRow label="Decision" value={detail.decision.decision} />
                          <SummaryRow
                            label="By"
                            value={detail.decision.decidedBy?.name || "Decision maker not captured"}
                          />
                          <SummaryRow
                            label="Date"
                            value={detail.decision.decidedAt ? formatDate(detail.decision.decidedAt) : "-"}
                          />
                          <SummaryRow label="Note" value={detail.decision.note || "No note added."} />
                        </div>
                      </div>
                    ) : null}

                    {isLandlord ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:px-4 md:py-4">
                        {!detail.linkedRentScoreReport ? (
                          <p className="text-sm text-slate-500">
                            Decision actions unlock once the rent score report is ready.
                          </p>
                        ) : detail.decision ? (
                          <p className="text-sm text-slate-500">
                            A decision has already been recorded for this renter. Approve, request for additional information, and decline are now locked.
                          </p>
                        ) : null}
                        <div className="space-y-2">
                          <Label>Decision note</Label>
                          <Textarea
                            value={decisionNote}
                            onChange={(event) => setDecisionNote(event.target.value)}
                            placeholder="Why are you approving, holding, or declining this renter?"
                            className="bg-white"
                            disabled={!detail.linkedRentScoreReport || Boolean(detail.decision)}
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            onClick={() => void takeDecision("APPROVED")}
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={!detail.linkedRentScoreReport || Boolean(detail.decision)}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void takeDecision("HOLD")}
                            disabled={!detail.linkedRentScoreReport || Boolean(detail.decision)}
                          >
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Request for additional information
                          </Button>
                          <Button
                            variant="outline"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() => void takeDecision("DECLINED")}
                            disabled={!detail.linkedRentScoreReport || Boolean(detail.decision)}
                          >
                            <ShieldX className="mr-2 h-4 w-4" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-950">Recent activity</p>
                        {!detail.activities.length ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
                        {detail.activities.slice(0, 3).map((activity) => (
                          <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                            <div className="space-y-2 text-sm text-slate-600">
                              <SummaryRow label="Activity" value={activity.activityType.replaceAll("_", " ")} />
                              <SummaryRow label="Message" value={activity.message} />
                              <SummaryRow label="Date" value={formatDate(activity.createdAt)} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-950">Rent score requests</p>
                        {!detail.scoreRequests.length ? <p className="text-sm text-muted-foreground">No score requests yet.</p> : null}
                        {detail.scoreRequests.slice(0, 3).map((request) => (
                          <div key={request.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                            <div className="space-y-2 text-sm text-slate-600">
                              <SummaryRow label="Status" value={request.status} />
                              <SummaryRow label="Requested by" value={request.requestedBy.name} />
                              <SummaryRow label="Date" value={formatDate(request.createdAt)} />
                              {request.forwardedTo ? <SummaryRow label="Forwarded to" value={request.forwardedTo.name} /> : null}
                            </div>
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
