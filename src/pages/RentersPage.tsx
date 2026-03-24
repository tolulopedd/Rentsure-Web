import { useEffect, useMemo, useState } from "react";
import { Search, Send, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import {
  deleteRentScoreEvent,
  getRentScoreConfig,
  getRenterScoreDetails,
  listPendingRenterInvites,
  listRenterScores,
  recordRentScoreEvent,
  resendPendingRenterInvite,
  type PublicAccountStatus,
  type PendingRenterInviteItem,
  type RentScoreBand,
  type RentScoreConfig,
  type RenterScoreListItem,
  type RenterScoreSnapshot
} from "@/lib/rent-score-api";

type EventDraft = {
  ruleId: string;
  quantity: string;
  sourceNote: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function renterDisplayName(item: {
  firstName?: string | null;
  lastName?: string | null;
  organizationName?: string | null;
}) {
  if (item.organizationName) return item.organizationName;
  return [item.firstName, item.lastName].filter(Boolean).join(" ") || "Unnamed renter";
}

function bandClasses(band: RentScoreBand) {
  if (band === "STRONG") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (band === "STABLE") return "bg-lime-50 text-lime-700 border-lime-200";
  if (band === "WATCH") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function statusClasses(status: PublicAccountStatus) {
  if (status === "ACTIVE") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "UNVERIFIED") return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

const emptyEventDraft: EventDraft = {
  ruleId: "",
  quantity: "1",
  sourceNote: ""
};

export default function RentersPage() {
  const [items, setItems] = useState<RenterScoreListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<RenterScoreSnapshot | null>(null);
  const [config, setConfig] = useState<RentScoreConfig | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingRenterInviteItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PublicAccountStatus | "ALL">("ALL");
  const [eventDraft, setEventDraft] = useState<EventDraft>(emptyEventDraft);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitePreviewById, setInvitePreviewById] = useState<Record<string, string>>({});

  async function loadList(activeSelectedId?: string) {
    try {
      setLoadingList(true);
      setError(null);
      const [listResponse, policy, inviteResponse] = await Promise.all([
        listRenterScores({ q: query.trim() || undefined, status }),
        getRentScoreConfig(),
        listPendingRenterInvites()
      ]);
      setItems(listResponse.items);
      setConfig(policy);
      setPendingInvites(inviteResponse.items);

      const nextSelectedId =
        activeSelectedId && listResponse.items.some((item) => item.accountId === activeSelectedId)
          ? activeSelectedId
          : listResponse.items[0]?.accountId || "";
      setSelectedId(nextSelectedId);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "Failed to load renter score queue"));
      setItems([]);
      setPendingInvites([]);
      setSelectedId("");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadDetail(accountId: string) {
    if (!accountId) {
      setDetail(null);
      return;
    }

    try {
      setLoadingDetail(true);
      const snapshot = await getRenterScoreDetails(accountId);
      setDetail(snapshot);
      setEventDraft((current) => ({
        ...current,
        ruleId: current.ruleId || snapshot.breakdown.find((item) => item.isActive)?.ruleId || ""
      }));
    } catch (loadError: unknown) {
      setDetail(null);
      toast.error(getErrorMessage(loadError, "Failed to load renter score details"));
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    void loadList(selectedId);
  }, [query, status]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId]);

  const selectedRenterName = detail ? renterDisplayName(detail.account) : "Renter";
  const selectableRules = useMemo(
    () => (config?.rules || []).filter((rule) => rule.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [config]
  );

  async function submitEvent() {
    if (!selectedId || !eventDraft.ruleId) {
      toast.error("Select a renter and score rule first");
      return;
    }

    try {
      setSavingEvent(true);
      const quantity = Number(eventDraft.quantity || 1);
      const snapshot = await recordRentScoreEvent(selectedId, {
        ruleId: eventDraft.ruleId,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        sourceNote: eventDraft.sourceNote.trim() || undefined
      });
      setDetail(snapshot);
      setEventDraft((current) => ({ ...emptyEventDraft, ruleId: current.ruleId }));
      await loadList(selectedId);
      toast.success("Rent score activity recorded");
    } catch (saveError: unknown) {
      toast.error(getErrorMessage(saveError, "Failed to record rent score activity"));
    } finally {
      setSavingEvent(false);
    }
  }

  async function removeEvent(eventId: string) {
    if (!selectedId) return;
    try {
      const snapshot = await deleteRentScoreEvent(eventId);
      setDetail(snapshot);
      await loadList(selectedId);
      toast.success("Rent score activity removed");
    } catch (deleteError: unknown) {
      toast.error(getErrorMessage(deleteError, "Failed to remove rent score activity"));
    }
  }

  async function sendInviteReminder(proposedRenterId: string) {
    try {
      const response = await resendPendingRenterInvite(proposedRenterId);
      if (response.invitePreviewUrl) {
        setInvitePreviewById((current) => ({
          ...current,
          [proposedRenterId]: response.invitePreviewUrl as string
        }));
      }
      await loadList(selectedId);
      toast.success(response.invitePreviewUrl ? "Reminder logged and preview link refreshed" : "Reminder logged");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to send renter reminder"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Renter review queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review live renter profiles, inspect their score logic, and add verified score events.
          </p>
        </div>
        <Badge className="w-fit border border-[var(--rentsure-blue-soft)] bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]">
          RentSure admin workflow
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1.8fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">Renter profiles</CardTitle>
              <Badge variant="outline">{items.length} profiles</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.5fr_0.8fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by renter name or email"
                  className="pl-9"
                />
              </div>

              <Select value={status} onValueChange={(value) => setStatus(value as PublicAccountStatus | "ALL")}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                  <SelectItem value="DISABLED">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {loadingList ? <p className="text-sm text-muted-foreground">Loading renter queue...</p> : null}
            {!loadingList && error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {!loadingList && !items.length && !error ? (
              <p className="text-sm text-muted-foreground">No renter profiles matched the current filters.</p>
            ) : null}

            <div className="space-y-3">
              {items.map((item) => {
                const isActive = item.accountId === selectedId;
                return (
                  <button
                    key={item.accountId}
                    type="button"
                    onClick={() => setSelectedId(item.accountId)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-[var(--rentsure-blue)] bg-[var(--rentsure-blue-soft)]/60 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-950">{renterDisplayName(item)}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {[item.city, item.state].filter(Boolean).join(", ") || "Location pending"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={`border ${bandClasses(item.scoreBand)}`}>{item.scoreBand}</Badge>
                        <Badge className={`border ${statusClasses(item.status)}`}>{item.status}</Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Rent score</p>
                        <p className="text-xl font-semibold tracking-tight text-slate-950">
                          {item.score}
                          <span className="ml-1 text-sm font-medium text-muted-foreground">/ 900</span>
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>+{item.positivePoints} positive</p>
                        <p>-{item.negativePoints} negative</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>{item.eventCount} recorded activities</p>
                        <p>Joined {formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Tenant trust snapshot</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {detail ? `${selectedRenterName} is currently being reviewed against the live rule set.` : "Select a renter profile to inspect the score breakdown."}
                  </p>
                </div>
                {detail ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Current score</p>
                    <p className="text-3xl font-semibold tracking-tight text-slate-950">
                      {detail.summary.score}
                      <span className="ml-1 text-base font-medium text-muted-foreground">/ {detail.summary.maxScore}</span>
                    </p>
                    <Badge className={`mt-2 border ${bandClasses(detail.summary.scoreBand)}`}>{detail.summary.scoreBand}</Badge>
                  </div>
                ) : null}
              </div>
            </CardHeader>

            <CardContent>
              {loadingDetail ? <p className="text-sm text-muted-foreground">Loading renter snapshot...</p> : null}
              {!loadingDetail && !detail ? (
                <p className="text-sm text-muted-foreground">Choose a renter from the queue to view full scoring details.</p>
              ) : null}

              {detail ? (
                <div className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-3">
                    <SnapshotMetric label="Status" value={detail.account.status} accent={statusClasses(detail.account.status)} />
                    <SnapshotMetric
                      label="Positive points"
                      value={`+${detail.summary.positivePoints}`}
                      accent="bg-emerald-50 text-emerald-700 border-emerald-200"
                    />
                    <SnapshotMetric
                      label="Negative points"
                      value={`-${detail.summary.negativePoints}`}
                      accent="bg-rose-50 text-rose-700 border-rose-200"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Profile summary</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p><span className="font-medium text-slate-950">Email:</span> {detail.account.email}</p>
                        <p><span className="font-medium text-slate-950">Phone:</span> {detail.account.phone || "-"}</p>
                        <p><span className="font-medium text-slate-950">Entity type:</span> {detail.account.entityType}</p>
                        <p><span className="font-medium text-slate-950">Location:</span> {[detail.account.city, detail.account.state].filter(Boolean).join(", ") || "-"}</p>
                        <p><span className="font-medium text-slate-950">Address:</span> {detail.account.address || "-"}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Activity summary</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p><span className="font-medium text-slate-950">Recorded score activities:</span> {detail.summary.eventCount}</p>
                        <p><span className="font-medium text-slate-950">Policy range:</span> {detail.policy.minScore} to {detail.policy.maxScore}</p>
                        <p><span className="font-medium text-slate-950">Policy name:</span> {detail.policy.name}</p>
                        <p><span className="font-medium text-slate-950">Last policy update:</span> {formatDate(detail.policy.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[var(--rentsure-blue)]" />
                      <p className="text-sm font-semibold text-slate-950">Rule contribution breakdown</p>
                    </div>
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rule</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead>Tracked</TableHead>
                            <TableHead>Applied</TableHead>
                            <TableHead>Contribution</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.breakdown.map((row) => (
                            <TableRow key={row.ruleId}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-slate-950">{row.name}</p>
                                  <p className="text-xs text-muted-foreground">{row.code}</p>
                                </div>
                              </TableCell>
                              <TableCell>{row.points > 0 ? `+${row.points}` : row.points}</TableCell>
                              <TableCell>{row.quantity}</TableCell>
                              <TableCell>{row.appliedOccurrences}</TableCell>
                              <TableCell className={row.contribution >= 0 ? "text-emerald-700" : "text-rose-700"}>
                                {row.contribution > 0 ? `+${row.contribution}` : row.contribution}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {detail ? (
            <div className="grid gap-6 2xl:grid-cols-[1.1fr_1fr]">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Record verified score activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ruleId">Rule</Label>
                    <Select
                      value={eventDraft.ruleId}
                      onValueChange={(value) => setEventDraft((current) => ({ ...current, ruleId: value }))}
                    >
                      <SelectTrigger id="ruleId" className="bg-white">
                        <SelectValue placeholder="Select rule" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {selectableRules.map((rule) => (
                          <SelectItem key={rule.id} value={rule.id}>
                            {rule.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[0.6fr_1.4fr]">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={eventDraft.quantity}
                        onChange={(event) => setEventDraft((current) => ({ ...current, quantity: event.target.value }))}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sourceNote">Source note</Label>
                      <Textarea
                        id="sourceNote"
                        value={eventDraft.sourceNote}
                        onChange={(event) => setEventDraft((current) => ({ ...current, sourceNote: event.target.value }))}
                        placeholder="What evidence supports this score event?"
                        className="min-h-[88px] bg-white"
                      />
                    </div>
                  </div>

                  <Button onClick={() => void submitEvent()} disabled={savingEvent} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                    {savingEvent ? "Recording..." : "Record activity"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Recent recorded activities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!detail.recentEvents.length ? (
                    <p className="text-sm text-muted-foreground">No score activity has been recorded for this renter yet.</p>
                  ) : null}

                  {detail.recentEvents.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{event.rule.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.quantity} occurrence{event.quantity > 1 ? "s" : ""} recorded on {formatDateTime(event.occurredAt)}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">{event.sourceNote || "No source note added."}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={`border ${event.rule.points > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                            {event.rule.points > 0 ? `+${event.rule.points}` : event.rule.points}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => void removeEvent(event.id)} title="Delete event">
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Pending renter invites</CardTitle>
            <Badge variant="outline">{pendingInvites.length} pending</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Renters captured from landlord or agent queues stay visible here until they join or complete verification.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!pendingInvites.length ? <p className="text-sm text-muted-foreground">No pending renter invites right now.</p> : null}
          {pendingInvites.map((invite) => (
            <div key={invite.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{renterDisplayName(invite)}</p>
                    <Badge variant="outline">{invite.inviteState === "UNVERIFIED_ACCOUNT" ? "Unverified account" : "Invited renter"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{invite.email} · {invite.phone}</p>
                  <p className="text-sm text-slate-600">{invite.property.summaryLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {invite.property.address}, {invite.property.city}, {invite.property.state}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Added by {invite.requestedBy.name} on {formatDate(invite.createdAt)}
                    {invite.lastReminderAt ? ` · Last reminder ${formatDate(invite.lastReminderAt)}` : ""}
                  </p>
                </div>

                <Button variant="outline" onClick={() => void sendInviteReminder(invite.id)}>
                  <Send className="mr-2 h-4 w-4" />
                  Send reminder
                </Button>
              </div>
              {invitePreviewById[invite.id] ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">Local email preview</div>
                  <a
                    className="mt-2 block break-all text-[var(--rentsure-blue)] hover:underline"
                    href={invitePreviewById[invite.id]}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {invitePreviewById[invite.id]}
                  </a>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SnapshotMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
