import { useMemo, useState } from "react";
import { CreditCard, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import {
  formatDate,
  formatNgn,
  paymentStatusBadgeClass,
  paymentTypeLabel
} from "@/lib/renter-workspace-presenters";

export default function RenterWorkspacePayments() {
  const { data, pendingSchedules, confirmSchedulePayment } = useRenterWorkspace();
  const [receiptById, setReceiptById] = useState<Record<string, string>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const paidSchedules = useMemo(
    () =>
      data?.linkedCases
        .flatMap((item) =>
          item.paymentSchedules
            .filter((schedule) => schedule.status === "PAID")
            .map((schedule) => ({
              ...schedule,
              propertyName: item.property.name
            }))
        )
        .sort((a, b) => new Date(b.confirmedByRenterAt || b.dueDate).getTime() - new Date(a.confirmedByRenterAt || a.dueDate).getTime()) || [],
    [data]
  );

  if (!data) return null;

  async function submitPayment(scheduleId: string) {
    setSubmittingId(scheduleId);
    const success = await confirmSchedulePayment({
      paymentScheduleId: scheduleId,
      receiptReference: receiptById[scheduleId] || undefined,
      note: noteById[scheduleId] || undefined
    });
    if (success) {
      setReceiptById((current) => ({ ...current, [scheduleId]: "" }));
      setNoteById((current) => ({ ...current, [scheduleId]: "" }));
    }
    setSubmittingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.14),_transparent_32%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">Payments</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Confirm rent and utility payments</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Confirm schedules linked to your renter record so your rent score reflects real payment behaviour on time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Pending schedules" value={String(pendingSchedules.length)} icon={CreditCard} />
        <MetricCard label="Paid schedules" value={String(paidSchedules.length)} icon={ReceiptText} />
        <MetricCard label="Linked rental properties" value={String(data.summary.activeLinkedCases)} icon={CreditCard} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Schedules awaiting confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!pendingSchedules.length ? (
              <p className="text-sm text-muted-foreground">No pending payment schedules linked to your renter record yet.</p>
            ) : null}
            {pendingSchedules.map((schedule) => (
              <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{paymentTypeLabel(schedule.paymentType)}</p>
                    <p className="text-sm text-slate-600">
                      {formatNgn(schedule.amountNgn)} · due {formatDate(schedule.dueDate)}
                    </p>
                    {schedule.note ? <p className="mt-1 text-sm text-slate-600">{schedule.note}</p> : null}
                  </div>
                  <Badge className={paymentStatusBadgeClass(schedule.status)} variant="outline">
                    {schedule.status}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <FormField
                    label="Receipt reference"
                    value={receiptById[schedule.id] || ""}
                    onChange={(value) => setReceiptById((current) => ({ ...current, [schedule.id]: value }))}
                    placeholder="Enter receipt reference"
                  />
                  <FormField
                    label="Payment note"
                    value={noteById[schedule.id] || ""}
                    onChange={(value) => setNoteById((current) => ({ ...current, [schedule.id]: value }))}
                    placeholder="Add payment note"
                  />
                </div>
                <Button className="mt-4" variant="outline" onClick={() => void submitPayment(schedule.id)} disabled={submittingId === schedule.id}>
                  {submittingId === schedule.id ? "Confirming..." : "Confirm payment"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent confirmations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!paidSchedules.length ? <p className="text-sm text-muted-foreground">No payment confirmation has been recorded yet.</p> : null}
            {paidSchedules.slice(0, 8).map((schedule) => (
              <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{paymentTypeLabel(schedule.paymentType)}</p>
                    <p className="text-sm text-slate-600">{schedule.propertyName}</p>
                    <p className="text-xs text-muted-foreground">
                      Confirmed {formatDate(schedule.confirmedByRenterAt || schedule.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">{formatNgn(schedule.amountNgn)}</p>
                    <Badge className={paymentStatusBadgeClass(schedule.status)} variant="outline">
                      {schedule.status}
                    </Badge>
                  </div>
                </div>
                {schedule.receiptReference ? (
                  <p className="mt-3 text-xs text-slate-500">Receipt reference: {schedule.receiptReference}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: typeof CreditCard;
}) {
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

function FormField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="bg-white" />
    </div>
  );
}
