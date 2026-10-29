import { createRentScoreReport } from "@/lib/rent-score-report";
import { RentScoreReportViewer } from "@/components/rent-score-report-viewer";
import { applicationDecisionLabel, awaitingRenterInformation } from "@/lib/additional-information";
import { InformationRequestStatus } from "@/components/information-request-status";
import { INFORMATION_OPTIONS } from "@/lib/additional-information";
import { InformationResponseDetail } from "@/components/additional-information";
import { useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Eye, PauseCircle, Send, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LinkedTenantSelect } from "@/components/linked-tenant-select";
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


export default function PublicWorkspaceDecisions() {
  const [report, setReport] = useState<ReturnType<typeof createRentScoreReport>>(null);
  const [queue, setQueue] = useState<QueueListItem[]>([]);
  const notificationLocation = useLocation();
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<QueueDetail | null>(null);
  const [requestedInformation, setRequestedInformation] = useState<string[]>([]);
  const [decisionBusy, setDecisionBusy] = useState(false);
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
      if (!input?.silent) { setDecisionNote(response.decision?.note || ""); setRequestedInformation(response.requestedInformation || []); }
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
    void loadQueue(new URLSearchParams(notificationLocation.search).get("caseId") || undefined);
  }, [loadQueue, notificationLocation.search]);

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
    if (!detail || !canRequestScore) return;
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

  const informationPending = awaitingRenterInformation(detail?.decision?.decision, detail?.additionalInformationResponse, detail?.requestedInformation);
  const decisionsDisabled = decisionBusy || informationPending || Boolean(detail?.decision && detail.decision.decision !== "HOLD");

  async function takeDecision(decision: ProposedRenterDecision) {
    if (!detail || decisionsDisabled) return;
    if (decision === "HOLD" && !requestedInformation.length) { toast.error("Select at least one item to request"); return; }
    setDecisionBusy(true);
    try {
      await decideWorkspaceProposedRenter(detail.id, {
        decision,
        requestedInformation: decision === "HOLD" ? requestedInformation : [],
        note: decisionNote.trim() || undefined
      });
      await loadQueue(detail.id);
      await loadDetail(detail.id);
      toast.success(`Renter marked as ${decisionLabel(decision).toLowerCase()}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to save landlord decision"));
    } finally { setDecisionBusy(false); }
  }

  function viewReport() {
    if (!detail || !isLandlord) return;
    setReport(createRentScoreReport(detail));
  }

  const canRequestScore = Boolean(detail && detail.renterLinkResponseStatus === "ACCEPTED" && !detail.scoreRequests.length);
  const requestButtonLabel = detail?.scoreRequests.length ? "Rent score requested" : "Request rent score";

  return (
    <div className="space-y-4 md:space-y-6">
      <RentScoreReportViewer report={report} onClose={() => setReport(null)} />
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">Landlord Decision</h1>
      </div>

      <div className="space-y-4 md:space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Linked tenants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!loading && !queue.length ? <p className="text-sm text-muted-foreground">No linked tenants yet.</p> : null}
            {!loading && queue.length ? (
              <div className="space-y-2">
                <Label>Linked tenant</Label>
                <LinkedTenantSelect items={queue} value={selectedId} onValueChange={setSelectedId} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Decision details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {detailLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!detailLoading && !selectedId ? <p className="text-sm text-muted-foreground">Select a linked tenant.</p> : null}
            {!detailLoading && selectedId && !detail ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {detail ? (
              <>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:px-4 md:py-4">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="font-semibold text-slate-950">{renterName(detail)}</p>
                          <Badge className={decisionBadgeClass(detail.decision?.decision)} variant="outline">
                            {applicationDecisionLabel(detail.decision?.decision || detail.status, detail.additionalInformationResponse, detail.requestedInformation)}
                          </Badge>
                          {detail.decision?.decision === "HOLD" && <InformationRequestStatus caseId={detail.id} requestedInformation={detail.requestedInformation} response={detail.additionalInformationResponse} />}
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
                            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500">No rent score activity yet.</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:px-4 md:py-4">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => void requestRentScore()}
                          disabled={!canRequestScore}
                          title={detail.renterLinkResponseStatus !== "ACCEPTED" ? "Awaiting renter acceptance of the property link" : undefined}
                          className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100"
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          {requestButtonLabel}
                        </Button>
                        {detail.renterLinkResponseStatus !== "ACCEPTED" ? <p role="status" className="w-full text-sm text-slate-500">The renter must accept the property link before you can request a rent score.</p> : null}
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
                          <Button variant="outline" onClick={viewReport} disabled={!detail.linkedRentScoreReport}>
                            <Eye className="mr-2 h-4 w-4" />
                            View report
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {detail.decision ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:px-4 md:py-4">
                        <div className="space-y-2 text-sm text-slate-600">
                          <SummaryRow label="Decision" value={applicationDecisionLabel(detail.decision.decision, detail.additionalInformationResponse, detail.requestedInformation)} />
                          <SummaryRow
                            label="By"
                            value={detail.decision.decidedBy?.name || "Decision maker not captured"}
                          />
                          <SummaryRow
                            label="Date"
                            value={detail.decision.decidedAt ? formatDate(detail.decision.decidedAt) : "-"}
                          />
                          {!!detail.requestedInformation?.length && <SummaryRow label="Requested information" value={detail.requestedInformation.join(", ")} />}
                          <InformationResponseDetail response={detail.additionalInformationResponse} />
                          <SummaryRow label="Note" value={detail.decision.note || "No note added."} />
                        </div>
                      </div>
                    ) : null}

                    {isLandlord ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 md:px-4 md:py-4">
                        {!detail.linkedRentScoreReport ? <p className="text-sm text-slate-500">Rent score not available yet.</p> : null}
                        {detail.decision && detail.decision.decision !== "HOLD" ? <p className="text-sm text-slate-500">Decision recorded.</p> : null}
                        <div className="space-y-2">
                          <Label>Decision note</Label>
                          <Textarea
                            value={decisionNote}
                            onChange={(event) => setDecisionNote(event.target.value)}
                            placeholder="Add a decision note"
                            className="bg-white"
                            disabled={decisionsDisabled}
                          />
                        </div>
                        <fieldset className="mt-4 space-y-2" disabled={decisionsDisabled}>
                          <legend className="text-sm font-medium">Information to request from the renter</legend>
                          <p className="text-xs text-slate-500">Select one or more items. The renter will receive these selections in their notification and email.</p>
                          {INFORMATION_OPTIONS.map(option => <label key={option} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                            <input type="checkbox" checked={requestedInformation.includes(option)} onChange={event => setRequestedInformation(current => event.target.checked ? [...current, option] : current.filter(value => value !== option))} />
                            {option}
                          </label>)}
                        </fieldset>
                        <p role="status" className="mt-3 text-sm text-slate-500">{informationPending ? "Awaiting renter information. Decision buttons will be available after the renter submits all requested items." : null}</p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            onClick={() => void takeDecision("APPROVED")}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:border-slate-200 disabled:text-slate-500 disabled:opacity-100"
                            disabled={decisionsDisabled}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="disabled:cursor-not-allowed disabled:bg-slate-200 disabled:border-slate-200 disabled:text-slate-500 disabled:opacity-100"
                            onClick={() => void takeDecision("HOLD")}
                            disabled={decisionsDisabled}
                          >
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Request for additional information
                          </Button>
                          <Button
                            variant="outline"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:border-slate-200 disabled:text-slate-500 disabled:opacity-100"
                            onClick={() => void takeDecision("DECLINED")}
                            disabled={decisionsDisabled}
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
                      {!detail.scoreRequests.length ? <p className="text-sm text-muted-foreground">No rent score requests yet.</p> : null}
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
