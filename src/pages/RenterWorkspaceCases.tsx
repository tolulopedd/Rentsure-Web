import { useMemo, useState } from "react";
import { ArrowRight, Building2, Clock3, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import {
  decisionBadgeClass,
  formatDate,
  formatNgn,
  paymentStatusBadgeClass,
  paymentTypeLabel
} from "@/lib/renter-workspace-presenters";

export default function RenterWorkspaceCases() {
  const { data } = useRenterWorkspace();
  const linkedCases = data?.linkedCases || [];
  const [selectedId, setSelectedId] = useState(linkedCases[0]?.id || "");

  const selectedCase = useMemo(
    () => linkedCases.find((item) => item.id === selectedId) || linkedCases[0] || null,
    [linkedCases, selectedId]
  );

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.16),_transparent_34%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">My Links</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Track every properties linked by landlord or agent to you</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.38fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Linked properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!linkedCases.length ? <p className="text-sm text-muted-foreground">No landlord or agent property is linked to your renter account yet.</p> : null}
            {linkedCases.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedCase?.id === item.id
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
                  <div className="text-right">
                    <Badge className={decisionBadgeClass(item.decision || item.status)} variant="outline">
                      {item.decision || item.status}
                    </Badge>
                    <p className="mt-2 text-xs text-slate-500">{item.paymentSchedules.length} payment schedule{item.paymentSchedules.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Property detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedCase ? <p className="text-sm text-muted-foreground">Select a linked property to continue.</p> : null}
            {selectedCase ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rentsure-blue)]">
                        <Building2 className="h-4 w-4" />
                        Linked property
                      </div>
                      <p className="mt-3 text-lg font-semibold text-slate-950">{selectedCase.property.name}</p>
                      <p className="text-sm text-slate-600">{selectedCase.property.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedCase.property.city}, {selectedCase.property.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={decisionBadgeClass(selectedCase.decision || selectedCase.status)} variant="outline">
                        {selectedCase.decision || selectedCase.status}
                      </Badge>
                      {selectedCase.decisionNote ? <p className="mt-2 max-w-xs text-sm text-slate-600 lg:ml-auto">{selectedCase.decisionNote}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <MiniCard label="Score requests" value={String(selectedCase.scoreRequests.length)} />
                  <MiniCard label="Payment schedules" value={String(selectedCase.paymentSchedules.length)} />
                  <MiniCard label="Timeline events" value={String(selectedCase.activities.length)} />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <Card className="border-slate-200 shadow-none">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-base">Rent score request history</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-0 pb-0">
                      {!selectedCase.scoreRequests.length ? (
                        <p className="text-sm text-muted-foreground">No rent score request has been logged yet for this case.</p>
                      ) : null}
                      {selectedCase.scoreRequests.map((request) => (
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
                      {!selectedCase.paymentSchedules.length ? (
                        <p className="text-sm text-muted-foreground">No payment schedule has been attached to this case yet.</p>
                      ) : null}
                      {selectedCase.paymentSchedules.map((schedule) => (
                        <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-slate-950">{paymentTypeLabel(schedule.paymentType)}</p>
                              <p className="text-sm text-slate-600">
                                {formatNgn(schedule.amountNgn)} · due {formatDate(schedule.dueDate)}
                              </p>
                              <p className="text-xs text-muted-foreground">Logged by {schedule.createdBy}</p>
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
                </div>

                <Card className="border-slate-200 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ScrollText className="h-4 w-4 text-[var(--rentsure-blue)]" />
                      Timeline / audit trail
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-0 pb-0">
                    {!selectedCase.activities.length ? (
                      <p className="text-sm text-muted-foreground">No activity has been recorded for this case yet.</p>
                    ) : null}
                    {selectedCase.activities.map((activity) => (
                      <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">{activity.message}</p>
                            <p className="text-sm text-slate-600">{activity.actorName || "RentSure"} </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{activity.activityType.replaceAll("_", " ")}</Badge>
                            <p className="mt-2 text-xs text-muted-foreground">{formatDate(activity.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-3">
                  <Button asChild className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                    <Link to="/account/renter/payments">
                      Confirm payments
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/account/renter/share-score">Share rent score</Link>
                  </Button>
                </div>
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
