import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import {
  confirmWorkspacePaymentSchedule,
  createWorkspacePaymentSchedule,
  getWorkspaceQueueItem,
  listWorkspaceQueue,
  type PaymentScheduleType,
  type QueueDetail,
  type QueueListItem
} from "@/lib/public-workspace-api";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

type ScheduleDraft = {
  paymentType: PaymentScheduleType;
  amountNgn: string;
  dueDate: string;
  note: string;
  recurrenceEnabled: boolean;
  recurrenceFrequency: "MONTHLY" | "QUARTERLY" | "YEARLY";
  recurrenceOccurrences: string;
};

const emptyScheduleDraft: ScheduleDraft = {
  paymentType: "RENT",
  amountNgn: "",
  dueDate: "",
  note: "",
  recurrenceEnabled: false,
  recurrenceFrequency: "MONTHLY",
  recurrenceOccurrences: "1"
};

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

export default function PublicWorkspacePayments() {
  const [approvedQueue, setApprovedQueue] = useState<QueueListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<QueueDetail | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(emptyScheduleDraft);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadQueue = useCallback(async (nextSelectedId?: string, input?: { silent?: boolean }) => {
    try {
      if (!input?.silent) {
        setLoading(true);
      }
      const response = await listWorkspaceQueue();
      const approvedItems = response.items.filter((item) => item.decision?.decision === "APPROVED");
      setApprovedQueue(approvedItems);
      const resolvedId =
        nextSelectedId && approvedItems.some((item) => item.id === nextSelectedId)
          ? nextSelectedId
          : approvedItems[0]?.id || "";
      setSelectedId(resolvedId);
    } catch (error: unknown) {
      if (!input?.silent) {
        toast.error(getErrorMessage(error, "Failed to load payment queue"));
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
    } catch (error: unknown) {
      if (!input?.silent) {
        toast.error(getErrorMessage(error, "Failed to load payment detail"));
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
    setShowScheduleForm(false);
  }, [selectedId]);

  useAutoRefresh(
    async () => {
      const currentSelectedId = selectedId;
      await loadQueue(currentSelectedId, { silent: true });
      const fallbackSelectedId = currentSelectedId || approvedQueue[0]?.id || "";
      if (fallbackSelectedId) {
        await loadDetail(fallbackSelectedId, { silent: true });
      }
    },
    {
      enabled: Boolean(approvedQueue.length || selectedId),
      intervalMs: 12000
    }
  );

  async function addSchedule() {
    if (!detail) return;
    try {
      const response = await createWorkspacePaymentSchedule(detail.id, {
        paymentType: scheduleDraft.paymentType,
        amountNgn: Number(scheduleDraft.amountNgn),
        dueDate: scheduleDraft.dueDate,
        note: scheduleDraft.note || undefined,
        recurrence: scheduleDraft.recurrenceEnabled
          ? {
              enabled: true,
              frequency: scheduleDraft.recurrenceFrequency,
              occurrences: Number(scheduleDraft.recurrenceOccurrences)
            }
          : undefined
      });
      setDetail(response);
      setScheduleDraft(emptyScheduleDraft);
      setShowScheduleForm(false);
      await loadQueue(detail.id);
      toast.success("Payment schedule logged");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to add payment schedule"));
    }
  }

  async function confirmSchedule(paymentScheduleId: string) {
    if (!detail) return;
    try {
      const response = await confirmWorkspacePaymentSchedule(paymentScheduleId);
      setDetail(response);
      await loadQueue(detail.id);
      toast.success("Payment confirmed");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to confirm payment"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Payments</h1>
        <Button
          type="button"
          variant={showScheduleForm ? "outline" : "default"}
          onClick={() => setShowScheduleForm((current) => !current)}
          disabled={!detail}
          className={!showScheduleForm ? "bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]" : ""}
        >
          {showScheduleForm ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Close form
            </>
          ) : (
            "Log payment"
          )}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tenants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading payment cases...</p> : null}
            {!loading && !approvedQueue.length ? <p className="text-sm text-muted-foreground">No approved renters are available for payment scheduling yet.</p> : null}
            {approvedQueue.map((item) => (
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
                    <Badge variant="outline">{item.paymentSchedules.length} schedule{item.paymentSchedules.length === 1 ? "" : "s"}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Payment schedules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {detailLoading ? <p className="text-sm text-muted-foreground">Loading payment detail...</p> : null}
            {!detailLoading && !detail ? <p className="text-sm text-muted-foreground">Select a renter case to manage payments.</p> : null}
            {detail ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{renterName(detail)}</p>
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">
                          Approved renter
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{detail.email} · {detail.phone}</p>
                      <p className="text-sm text-slate-600">{detail.property.summaryLabel}</p>
                      <p className="text-xs text-muted-foreground">{detail.property.address}</p>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <SummaryRow label="Decision" value={detail.decision?.decision || "APPROVED"} />
                      <SummaryRow label="Schedules" value={`${detail.paymentSchedules.length}`} />
                      <SummaryRow label="Property" value={detail.property.summaryLabel} />
                    </div>
                  </div>
                </div>

                {showScheduleForm ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Payment type</Label>
                        <Select value={scheduleDraft.paymentType} onValueChange={(value) => setScheduleDraft((current) => ({ ...current, paymentType: value as PaymentScheduleType }))}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="RENT">Rent</SelectItem>
                            <SelectItem value="UTILITY">Utility</SelectItem>
                            <SelectItem value="ESTATE_DUE">Estate due</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Amount (NGN)</Label>
                          <Input value={scheduleDraft.amountNgn} onChange={(event) => setScheduleDraft((current) => ({ ...current, amountNgn: event.target.value }))} className="bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label>Due date</Label>
                          <Input type="date" value={scheduleDraft.dueDate} onChange={(event) => setScheduleDraft((current) => ({ ...current, dueDate: event.target.value }))} className="bg-white" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Note</Label>
                        <Textarea value={scheduleDraft.note} onChange={(event) => setScheduleDraft((current) => ({ ...current, note: event.target.value }))} className="bg-white" />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">Future recurrence</p>
                          </div>
                          <Select
                            value={scheduleDraft.recurrenceEnabled ? "YES" : "NO"}
                            onValueChange={(value) => setScheduleDraft((current) => ({ ...current, recurrenceEnabled: value === "YES" }))}
                          >
                            <SelectTrigger className="w-[140px] bg-white">
                              <SelectValue placeholder="Repeat?" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="NO">One time</SelectItem>
                              <SelectItem value="YES">Repeat</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {scheduleDraft.recurrenceEnabled ? (
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Frequency</Label>
                              <Select
                                value={scheduleDraft.recurrenceFrequency}
                                onValueChange={(value) =>
                                  setScheduleDraft((current) => ({
                                    ...current,
                                    recurrenceFrequency: value as "MONTHLY" | "QUARTERLY" | "YEARLY"
                                  }))
                                }
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                  <SelectItem value="YEARLY">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Future cycles</Label>
                              <Input
                                type="number"
                                min="1"
                                max="24"
                                value={scheduleDraft.recurrenceOccurrences}
                                onChange={(event) => setScheduleDraft((current) => ({ ...current, recurrenceOccurrences: event.target.value }))}
                                className="bg-white"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <Button onClick={() => void addSchedule()} variant="outline">
                        Add schedule
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-950">Payment requests</p>
                  {!detail.paymentSchedules.length ? <p className="text-sm text-muted-foreground">No payment schedules logged yet.</p> : null}
                  {detail.paymentSchedules.map((schedule) => (
                    <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-950">{schedule.paymentType.replaceAll("_", " ")}</p>
                          {schedule.note ? <p className="text-sm text-slate-600">{schedule.note}</p> : null}
                          <p className="text-xs text-slate-500">Requested by {schedule.createdBy.name}</p>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                          <SummaryRow label="Amount" value={formatNgn(schedule.amountNgn)} />
                          <SummaryRow label="Due" value={formatDate(schedule.dueDate)} />
                          <SummaryRow label="Status" value={schedule.status} />
                          <SummaryRow
                            label="Timing"
                            value={schedule.confirmationTiming ? (schedule.confirmationTiming === "ON_TIME" ? "On time" : "Late") : "-"}
                          />
                        </div>
                      </div>
                      {schedule.paymentEvidenceFileName ? (
                        <p className="mt-3 text-xs text-slate-500">Evidence: {schedule.paymentEvidenceFileName}</p>
                      ) : null}
                      {schedule.confirmationInitiatedAt ? (
                        <p className="mt-1 text-xs text-amber-700">Renter sent proof on {formatDate(schedule.confirmationInitiatedAt)}.</p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">Awaiting renter proof of payment.</p>
                      )}
                      {schedule.receiptReference ? (
                        <p className="mt-1 text-xs text-slate-500">Receipt reference: {schedule.receiptReference}</p>
                      ) : null}
                      {schedule.confirmationInitiatedBy ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Initiated by {schedule.confirmationInitiatedBy.name} ({schedule.confirmationInitiatedBy.accountType.toLowerCase()})
                        </p>
                      ) : null}
                      <div className="mt-4 flex items-center gap-3">
                        {schedule.paymentEvidenceViewUrl ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={schedule.paymentEvidenceViewUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View proof
                            </a>
                          </Button>
                        ) : null}
                        {schedule.status !== "PAID" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void confirmSchedule(schedule.id)}
                            disabled={!schedule.confirmationInitiatedAt}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Confirm payment
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-emerald-700">
                            <Clock3 className="h-4 w-4" />
                            Paid {formatDate(schedule.paidAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
