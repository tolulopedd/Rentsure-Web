import { useMemo, useState } from "react";
import { Building2, Clock3, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { occupancyBadgeClass, occupancyLabel, propertyUnitDisplayName } from "@/lib/property-display";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import {
  decisionBadgeClass,
  formatDate,
  formatNgn,
  paymentStatusBadgeClass,
  paymentTypeLabel
} from "@/lib/renter-workspace-presenters";

export default function RenterWorkspaceCases() {
  const { data, requestLandlordReference } = useRenterWorkspace();
  const linkedCases = data?.linkedCases || [];
  const [selectedId, setSelectedId] = useState("");
  const [referenceNote, setReferenceNote] = useState("");

  const selectedCase = useMemo(
    () => linkedCases.find((item) => item.id === selectedId) || null,
    [linkedCases, selectedId]
  );
  const pendingLandlordReferenceRequest =
    selectedCase?.landlordReferenceRequests.find((request) => request.status === "PENDING") || null;
  const canShowLandlordReference =
    selectedCase?.decision === "APPROVED" && Boolean(selectedCase.propertyUnit?.isOccupied);
  const canRequestLandlordReference = canShowLandlordReference && !pendingLandlordReferenceRequest;

  if (!data) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.16),_transparent_34%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-4 shadow-sm md:rounded-[28px] md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">My Links</p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:mt-3 md:text-2xl">Track every properties linked to you</h1>
      </div>

      <div className="space-y-4 md:space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Linked properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!linkedCases.length ? <p className="text-sm text-muted-foreground">No landlord or agent property is linked to your renter account yet.</p> : null}
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
            <CardTitle className="text-lg">Property detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-5">
            {!selectedId ? <p className="text-sm text-muted-foreground">Select a linked property to continue.</p> : null}
            {selectedId && !selectedCase ? <p className="text-sm text-muted-foreground">Loading property detail...</p> : null}
            {selectedCase ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rentsure-blue)]">
                        <Building2 className="h-4 w-4" />
                        Linked property
                      </div>
                      <p className="mt-3 text-lg font-semibold text-slate-950">{selectedCase.property.name}</p>
                      {selectedCase.propertyUnit ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-sm text-slate-600">{propertyUnitDisplayName(selectedCase.propertyUnit)}</p>
                          <Badge className={occupancyBadgeClass(selectedCase.propertyUnit.isOccupied)} variant="outline">
                            {occupancyLabel(selectedCase.propertyUnit.isOccupied)}
                          </Badge>
                        </div>
                      ) : null}
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

                <div className="grid gap-3 md:grid-cols-3">
                  <MiniCard label="Score requests" value={String(selectedCase.scoreRequests.length)} />
                  <MiniCard label="Payment schedules" value={String(selectedCase.paymentSchedules.length)} />
                  <MiniCard label="Timeline events" value={String(selectedCase.activities.length)} />
                </div>

                {canShowLandlordReference ? (
                  <Card className="border-slate-200 shadow-none">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-base">Landlord reference</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-0 pb-0">
                      {!selectedCase.landlordReferenceRequests.length ? (
                        <p className="text-sm text-muted-foreground">No landlord reference request has been submitted for this property yet.</p>
                      ) : null}
                      {selectedCase.landlordReferenceRequests.map((request) => (
                        <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-slate-950">{request.landlordName}</p>
                              <p className="text-sm text-slate-600">Status: {request.status.replaceAll("_", " ")}</p>
                              {request.recommendation ? <p className="text-sm text-slate-600">Response: {request.recommendation.replaceAll("_", " ")}</p> : null}
                              {request.note ? <p className="mt-1 text-sm text-slate-500">{request.note}</p> : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(request.respondedAt || request.requestedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                        <Label>Reference note</Label>
                        <textarea
                          value={referenceNote}
                          onChange={(event) => setReferenceNote(event.target.value)}
                          disabled={!canRequestLandlordReference}
                          className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Add a short note to the landlord reference request"
                        />
                        <Button
                          variant="outline"
                          disabled={!canRequestLandlordReference}
                          onClick={async () => {
                            const success = await requestLandlordReference(selectedCase.id, referenceNote || undefined);
                            if (success) {
                              setReferenceNote("");
                            }
                          }}
                        >
                          {pendingLandlordReferenceRequest ? "Reference request pending" : "Request landlord reference"}
                        </Button>
                        {pendingLandlordReferenceRequest ? (
                          <p className="text-sm text-slate-500">
                            A landlord reference request is already pending with {pendingLandlordReferenceRequest.landlordName}. You can request another one after this request is completed or declined.
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-[1fr_1fr] xl:gap-6">
                  <Card className="border-slate-200 shadow-none">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-base">Rent score request history</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-0 pb-0">
                      {!selectedCase.scoreRequests.length ? (
                        <p className="text-sm text-muted-foreground">No rent score request has been logged yet for this case.</p>
                      ) : null}
                      {selectedCase.scoreRequests.map((request) => (
                        <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
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
                        <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
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
                        <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
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
