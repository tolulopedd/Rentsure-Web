import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
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
  createWorkspacePaymentSchedule,
  getWorkspaceQueueItem,
  listWorkspaceQueue,
  updateWorkspacePaymentSchedule,
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
      await loadQueue(detail.id);
      toast.success("Payment schedule logged");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to add payment schedule"));
    }
  }

  async function markSchedulePaid(paymentScheduleId: string) {
    if (!detail) return;
    try {
      const response = await updateWorkspacePaymentSchedule(paymentScheduleId, "PAID");
      setDetail(response);
      await loadQueue(detail.id);
      toast.success("Payment schedule marked as paid");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update payment schedule"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log rent, utility, and estate due schedules only for renters that have already been approved.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Renter payment cases</CardTitle>
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
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-lg font-semibold text-slate-950">{renterName(detail)}</p>
                  <p className="text-sm text-slate-600">{detail.email} · {detail.phone}</p>
                  <p className="mt-2 text-sm text-slate-600">{detail.property.summaryLabel}</p>
                  <p className="text-xs text-muted-foreground">{detail.property.address}</p>
                  <div className="mt-3">
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">
                      Approved renter
                    </Badge>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-950">Log payment schedule</p>
                  <div className="mt-4 space-y-4">
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
                          <p className="mt-1 text-xs text-slate-500">Create additional future schedules from this payment setup.</p>
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

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-950">Existing schedules</p>
                  {!detail.paymentSchedules.length ? <p className="text-sm text-muted-foreground">No payment schedules logged yet.</p> : null}
                  {detail.paymentSchedules.map((schedule) => (
                    <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">{schedule.paymentType.replaceAll("_", " ")}</p>
                          <p className="text-sm text-slate-600">{formatNgn(schedule.amountNgn)} · due {formatDate(schedule.dueDate)}</p>
                          {schedule.note ? <p className="mt-1 text-sm text-slate-600">{schedule.note}</p> : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{schedule.status}</Badge>
                          {schedule.status !== "PAID" ? (
                            <Button size="sm" variant="outline" onClick={() => void markSchedulePaid(schedule.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark paid
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-emerald-700">
                              <Clock3 className="h-4 w-4" />
                              Paid {formatDate(schedule.paidAt)}
                            </div>
                          )}
                        </div>
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
