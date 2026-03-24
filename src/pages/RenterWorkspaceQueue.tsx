import { useMemo, useState } from "react";
import { ClipboardList, Clock3, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import {
  decisionBadgeClass,
  formatDate,
  formatNgn,
  paymentStatusBadgeClass,
  paymentTypeLabel
} from "@/lib/renter-workspace-presenters";

export default function RenterWorkspaceQueue() {
  const { data } = useRenterWorkspace();
  const linkedCases = data?.linkedCases || [];
  const [selectedId, setSelectedId] = useState(linkedCases[0]?.id || "");

  const selectedItem = useMemo(
    () => linkedCases.find((item) => item.id === selectedId) || linkedCases[0] || null,
    [linkedCases, selectedId]
  );

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.15),_transparent_34%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">Queue</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Track decision flow for every linked property</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Follow rent score requests, landlord or agent decisions, payment schedules, and activity history tied to your profile.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.94fr_1.36fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">My queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!linkedCases.length ? <p className="text-sm text-muted-foreground">No property has been linked into your renter queue yet.</p> : null}
            {linkedCases.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedItem?.id === item.id
                    ? "border-[var(--rentsure-blue)] bg-[var(--rentsure-blue-soft)]/60"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{item.property.name}</p>
                    <p className="text-sm text-slate-600">{item.property.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.property.city}, {item.property.state}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <Badge className={decisionBadgeClass(item.decision || item.status)} variant="outline">
                      {item.decision || item.status}
                    </Badge>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.scoreRequests.length} score request{item.scoreRequests.length === 1 ? "" : "s"} · {item.activities.length} timeline event
                      {item.activities.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Queue detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedItem ? <p className="text-sm text-muted-foreground">Select a linked property from your queue to continue.</p> : null}
            {selectedItem ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rentsure-blue)]">
                        <ClipboardList className="h-4 w-4" />
                        Queue status
                      </div>
                      <p className="mt-3 text-lg font-semibold text-slate-950">{selectedItem.property.name}</p>
                      <p className="text-sm text-slate-600">{selectedItem.property.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedItem.property.city}, {selectedItem.property.state}
                      </p>
                    </div>
                    <div className="text-left lg:text-right">
                      <Badge className={decisionBadgeClass(selectedItem.decision || selectedItem.status)} variant="outline">
                        {selectedItem.decision || selectedItem.status}
                      </Badge>
                      {selectedItem.decisionNote ? <p className="mt-2 max-w-xs text-sm text-slate-600 lg:ml-auto">{selectedItem.decisionNote}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <MiniCard label="Score requests" value={String(selectedItem.scoreRequests.length)} />
                  <MiniCard label="Payment schedules" value={String(selectedItem.paymentSchedules.length)} />
                  <MiniCard label="Timeline events" value={String(selectedItem.activities.length)} />
                </div>

                <Card className="border-slate-200 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base">Rent score request history</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-0 pb-0">
                    {!selectedItem.scoreRequests.length ? (
                      <p className="text-sm text-muted-foreground">No rent score request has been logged for this property yet.</p>
                    ) : null}
                    {selectedItem.scoreRequests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">{request.status.replaceAll("_", " ")}</p>
                            <p className="text-sm text-slate-600">Requested by {request.requestedBy}</p>
                            {request.forwardedTo ? <p className="text-sm text-slate-600">Forwarded to {request.forwardedTo}</p> : null}
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base">Payment schedules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-0 pb-0">
                    {!selectedItem.paymentSchedules.length ? (
                      <p className="text-sm text-muted-foreground">No payment schedule has been attached to this linked property yet.</p>
                    ) : null}
                    {selectedItem.paymentSchedules.map((schedule) => (
                      <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">{paymentTypeLabel(schedule.paymentType)}</p>
                            <p className="text-sm text-slate-600">
                              {formatNgn(schedule.amountNgn)} · due {formatDate(schedule.dueDate)}
                            </p>
                            <p className="text-xs text-muted-foreground">Logged by {schedule.createdBy}</p>
                            {schedule.note ? <p className="mt-1 text-xs text-slate-500">{schedule.note}</p> : null}
                            {schedule.receiptReference ? <p className="mt-1 text-xs text-slate-500">Receipt reference: {schedule.receiptReference}</p> : null}
                          </div>
                          <Badge className={paymentStatusBadgeClass(schedule.status)} variant="outline">
                            {schedule.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ScrollText className="h-4 w-4 text-[var(--rentsure-blue)]" />
                      Timeline / audit trail
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-0 pb-0">
                    {!selectedItem.activities.length ? (
                      <p className="text-sm text-muted-foreground">No queue activity has been recorded for this linked property yet.</p>
                    ) : null}
                    {selectedItem.activities.map((activity) => (
                      <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">{activity.message}</p>
                            <p className="text-sm text-slate-600">{activity.actorName || "RentSure"}</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <Badge variant="outline">{activity.activityType.replaceAll("_", " ")}</Badge>
                            <p className="mt-2 text-xs text-muted-foreground">{formatDate(activity.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <Clock3 className="h-5 w-5 text-[var(--rentsure-blue)]" />
      </div>
    </div>
  );
}
