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
  createRentScorePaymentSession,
  decideWorkspaceProposedRenter,
  forwardWorkspaceScoreRequest,
  getWorkspaceQueueItem,
  listWorkspaceQueue,
  verifyRentScorePayment,
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
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
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
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

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const reference = search.get("rentScorePaymentRef");
    if (!reference) return;

    void (async () => {
      try {
        const response = await verifyRentScorePayment(reference);
        setDetail(response);
        setDecisionNote(response.decision?.note || "");
        await loadQueue(response.id);
        toast.success("Payment verified. Rent score request created.");
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Failed to verify rent score payment"));
      } finally {
        const nextUrl = `${window.location.pathname}${window.location.hash || ""}`;
        window.history.replaceState({}, "", nextUrl);
      }
    })();
  }, [loadQueue]);

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

  async function startRentScorePayment(provider: "PAYSTACK" | "FLUTTERWAVE" | "MANUAL_TRANSFER") {
    if (!detail) return;
    try {
      const response = await createRentScorePaymentSession(detail.id, {
        provider,
        notes: detail.notes || undefined,
        callbackPath: window.location.pathname
      });
      if (response.checkoutUrl) {
        window.location.assign(response.checkoutUrl);
        return;
      }
      await loadDetail(detail.id);
      await loadQueue(detail.id);
      setShowPaymentOptions(false);
      toast.success("Transfer instructions created. Admin will confirm once payment is received.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to start rent score payment"));
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
            <p><strong>Property:</strong> ${escapeHtml(detail.property.summaryLabel)}</p>
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

  const canRequestScore = Boolean(detail && !detail.scoreRequests.length);
  const paymentPending = detail?.latestRentScorePayment && !detail.scoreRequests.length ? detail.latestRentScorePayment : null;
  const requestButtonLabel = detail?.scoreRequests.length
    ? "Rent score requested"
    : paymentPending?.status === "AWAITING_MANUAL_CONFIRMATION"
      ? "Awaiting admin confirmation"
      : paymentPending?.status === "PENDING_ACTION"
        ? "Complete payment"
        : "Request rent score";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Landlord Decision</h1>
      </div>

      <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Linked tenants</CardTitle>
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
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <div className="space-y-2">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Property</p>
                          <p className="font-semibold text-slate-950">{item.property.summaryLabel}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Renter</p>
                          <p className="font-semibold text-slate-950">{renterName(item)}</p>
                        </div>
                        <Badge className={decisionBadgeClass(item.decision?.decision)} variant="outline">
                          {decisionLabel(item.decision?.decision || item.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <SummaryRow
                        label="Rent score"
                        value={item.linkedRentScore ? `${item.linkedRentScore.score} / 900` : "In progress"}
                      />
                      <SummaryRow label="Decision" value={decisionLabel(item.decision?.decision || item.status)} />
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Decision details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {detailLoading ? <p className="text-sm text-muted-foreground">Loading decision detail...</p> : null}
              {!detailLoading && !detail ? <p className="text-sm text-muted-foreground">Select a proposed renter to continue.</p> : null}
                {detail ? (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-slate-950">{renterName(detail)}</p>
                          <Badge className={decisionBadgeClass(detail.decision?.decision)} variant="outline">
                            {decisionLabel(detail.decision?.decision || detail.status)}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                          <SummaryRow label="Email" value={detail.email} />
                          <SummaryRow label="Phone" value={detail.phone} />
                          <SummaryRow label="Property" value={detail.property.summaryLabel} />
                          <SummaryRow label="Address" value={`${detail.property.address}, ${detail.property.city}, ${detail.property.state}`} />
                          <SummaryRow
                            label="Rent score"
                            value={detail.linkedRentScore ? `${detail.linkedRentScore.score} / 900` : "In progress"}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => {
                            if (paymentPending?.checkoutUrl) {
                              window.location.assign(paymentPending.checkoutUrl);
                              return;
                            }
                            setShowPaymentOptions((current) => !current);
                          }}
                          disabled={!canRequestScore && !paymentPending?.checkoutUrl}
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
                        <Button variant="outline" onClick={downloadReport} disabled={!detail.linkedRentScoreReport || !detail.decision}>
                          <Download className="mr-2 h-4 w-4" />
                          Download report
                        </Button>
                      </div>
                      {showPaymentOptions && canRequestScore ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-semibold text-slate-950">Choose payment method</p>
                          <p className="mt-1 text-sm text-slate-600">Complete payment before the rent score review starts.</p>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <Button variant="outline" onClick={() => void startRentScorePayment("PAYSTACK")}>
                              Paystack
                            </Button>
                            <Button variant="outline" onClick={() => void startRentScorePayment("FLUTTERWAVE")}>
                              Flutterwave
                            </Button>
                            <Button variant="outline" onClick={() => void startRentScorePayment("MANUAL_TRANSFER")}>
                              Cash / transfer
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      {paymentPending?.status === "AWAITING_MANUAL_CONFIRMATION" && paymentPending.manualTransfer ? (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <div className="space-y-2 text-sm text-slate-700">
                            <SummaryRow label="Amount" value={formatNgn(paymentPending.amountNgn)} />
                            <SummaryRow label="Bank" value={paymentPending.manualTransfer.bankName} />
                            <SummaryRow label="Account name" value={paymentPending.manualTransfer.accountName} />
                            <SummaryRow label="Account number" value={paymentPending.manualTransfer.accountNumber} />
                            <SummaryRow label="Reference" value={paymentPending.manualTransfer.reference} />
                          </div>
                          <p className="mt-3 text-sm text-slate-600">{paymentPending.manualTransfer.instructions}</p>
                        </div>
                      ) : null}
                      {!detail.decision ? (
                        <p className="mt-3 text-sm text-slate-500">Download report unlocks after a landlord decision is made.</p>
                      ) : null}
                    </div>

                    {detail.decision ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
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
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        {!detail.linkedRentScoreReport ? (
                          <p className="text-sm text-slate-500">
                            Decision actions unlock once the rent score report is ready.
                          </p>
                        ) : null}
                        <div className="space-y-2">
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
                            Request for additional information
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
