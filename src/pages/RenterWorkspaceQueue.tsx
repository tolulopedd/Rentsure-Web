import { useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Clock3, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { availableForRentLabel, occupancyBadgeClass, occupancyLabel, propertyUnitDisplayName } from "@/lib/property-display";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import {
  decisionBadgeClass,
  formatDate,
  formatNgn,
  paymentStatusBadgeClass,
  paymentTypeLabel
} from "@/lib/renter-workspace-presenters";

export default function RenterWorkspaceQueue() {
  const { data, acceptScoreRequest } = useRenterWorkspace();
  const linkedCases = data?.linkedCases || [];
  const [selectedId, setSelectedId] = useState("");

  const selectedItem = useMemo(
    () => linkedCases.find((item) => item.id === selectedId) || null,
    [linkedCases, selectedId]
  );
  const propertyLinkAccepted = selectedItem?.renterLinkResponseStatus === "ACCEPTED";
  const latestScoreRequest = selectedItem?.scoreRequests[0] || null;
  const canAcceptLatestRequest = Boolean(propertyLinkAccepted && latestScoreRequest && !latestScoreRequest.acceptedAt);
  const requestAlreadyShared = Boolean(
    latestScoreRequest?.acceptedAt &&
      selectedItem &&
      (selectedItem.status === "SCORE_SHARED" ||
        selectedItem.status === "UNDER_REVIEW" ||
        selectedItem.status === "DECISION_READY" ||
        selectedItem.decision)
  );
  const canShareLatestRequest = Boolean(latestScoreRequest?.acceptedAt) && !requestAlreadyShared;

  if (!data) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.15),_transparent_34%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-4 shadow-sm md:rounded-[28px] md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">Landlord Decision</p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:mt-3 md:text-3xl">Landlord Decision</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:mt-3">
          Review linked property decisions and share your rent score.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">My landlord decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!linkedCases.length ? <p className="text-sm text-muted-foreground">No linked properties.</p> : null}
            {linkedCases.length ? (
              <div className="space-y-2">
                <Label>Linked property</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select linked property" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {linkedCases.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.property.name} · {propertyUnitDisplayName(item.propertyUnit)} · {item.property.city}, {item.property.state}
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
            <CardTitle className="text-lg">Decision detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-5">
            {!selectedId ? <p className="text-sm text-muted-foreground">Select a property.</p> : null}
            {selectedId && !selectedItem ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {selectedItem ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rentsure-blue)]">
                        <ClipboardList className="h-4 w-4" />
                        Queue status
                      </div>
                      <p className="mt-3 text-lg font-semibold text-slate-950">{selectedItem.property.name}</p>
                      {selectedItem.propertyUnit ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-sm text-slate-600">{propertyUnitDisplayName(selectedItem.propertyUnit)}</p>
                          <Badge className={occupancyBadgeClass(selectedItem.propertyUnit.isOccupied)} variant="outline">
                            {occupancyLabel(selectedItem.propertyUnit.isOccupied)}
                          </Badge>
                          {selectedItem.propertyUnit.isOccupied && selectedItem.propertyUnit.availableForRentInMonths ? (
                            <span className="text-xs text-slate-500">
                              {availableForRentLabel(selectedItem.propertyUnit.availableForRentInMonths)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="text-sm text-slate-600">{selectedItem.property.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedItem.property.city}, {selectedItem.property.state}
                      </p>
                    </div>
                    <div className="text-left lg:text-right">
                      <Badge className={decisionBadgeClass(selectedItem.decision || selectedItem.status)} variant="outline">
                        {selectedItem.decision || selectedItem.status}
                      </Badge>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Property link: {selectedItem.renterLinkResponseStatus.replaceAll("_", " ")}
                      </p>
                      {selectedItem.decisionNote ? <p className="mt-2 max-w-xs text-sm text-slate-600 lg:ml-auto">{selectedItem.decisionNote}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
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
                      <p className="text-sm text-muted-foreground">No rent score requests.</p>
                    ) : null}
                    {selectedItem.scoreRequests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">{request.status.replaceAll("_", " ")}</p>
                            <p className="text-sm text-slate-600">Requested by {request.requestedBy}</p>
                            {request.forwardedTo ? <p className="text-sm text-slate-600">Forwarded to {request.forwardedTo}</p> : null}
                            {request.acceptedAt ? <p className="text-sm text-emerald-700">Accepted on {formatDate(request.acceptedAt)}</p> : null}
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
                      <p className="text-sm text-muted-foreground">No payment schedules.</p>
                    ) : null}
                    {selectedItem.paymentSchedules.map((schedule) => (
                      <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
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
                      <p className="text-sm text-muted-foreground">No activity.</p>
                    ) : null}
                    {selectedItem.activities.map((activity) => (
                      <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
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

                <div className="flex flex-wrap gap-3">
                  {selectedItem.renterLinkResponseStatus !== "ACCEPTED" ? (
                    <Button disabled className="bg-slate-300 text-slate-700 hover:bg-slate-300">
                      Accept property link first
                    </Button>
                  ) : canAcceptLatestRequest ? (
                    <Button
                      className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
                      onClick={() => void acceptScoreRequest(selectedItem.id)}
                    >
                      Accept landlord request
                    </Button>
                  ) : null}
                  {canShareLatestRequest ? (
                    <Button asChild className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                      <Link to={`/account/renter/share-score?linkedCaseId=${encodeURIComponent(selectedItem.id)}`}>
                        Share rent score
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : requestAlreadyShared ? (
                    <Button disabled className="bg-slate-300 text-slate-700 hover:bg-slate-300">
                      Rent score shared
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : !canAcceptLatestRequest ? (
                    <Button disabled className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                      Share rent score
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                {!selectedItem.scoreRequests.length ? (
                  <p className="text-sm text-slate-500">
                    Share rent score becomes available here after a landlord or agent requests it from you.
                  </p>
                ) : selectedItem.renterLinkResponseStatus !== "ACCEPTED" ? (
                  <p className="text-sm text-slate-500">Accept the property link first from Linked Properties.</p>
                ) : canAcceptLatestRequest ? (
                  <p className="text-sm text-slate-500">Accept the request to share your rent score.</p>
                ) : canShareLatestRequest ? (
                  <p className="text-sm text-slate-500">Request accepted. Share your rent score.</p>
                ) : requestAlreadyShared ? (
                  <p className="text-sm text-slate-500">Score shared. A new request is required to share again.</p>
                ) : null}
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
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 md:mt-2 md:text-2xl">{value}</p>
        </div>
        <Clock3 className="h-5 w-5 text-[var(--rentsure-blue)]" />
      </div>
    </div>
  );
}

