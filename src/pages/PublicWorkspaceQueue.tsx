import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { propertyDisplayName, propertyUnitDisplayName } from "@/lib/property-display";
import {
  createWorkspaceProposedRenter,
  getWorkspaceQueueItem,
  listWorkspaceProperties,
  listWorkspaceQueue,
  requestWorkspaceRentScore,
  searchWorkspaceRenters,
  type QueueDetail,
  type QueueListItem,
  type WorkspaceRenterSearchResult,
  type WorkspaceProperty
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

type ProposedDraft = {
  propertyId: string;
  propertyUnitId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyProposedDraft: ProposedDraft = {
  propertyId: "",
  propertyUnitId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: ""
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function PublicWorkspaceQueue() {
  const [queue, setQueue] = useState<QueueListItem[]>([]);
  const [properties, setProperties] = useState<WorkspaceProperty[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<QueueDetail | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [draft, setDraft] = useState<ProposedDraft>(emptyProposedDraft);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchResults, setSearchResults] = useState<WorkspaceRenterSearchResult[]>([]);
  const [selectedExistingRenter, setSelectedExistingRenter] = useState<WorkspaceRenterSearchResult | null>(null);
  const [invitePreviewUrl, setInvitePreviewUrl] = useState<string | null>(null);
  const isAgent = (localStorage.getItem("userRole") || "").toUpperCase() === "AGENT";

  const loadQueue = useCallback(async (nextSelectedId?: string, input?: { silent?: boolean }) => {
    try {
      if (!input?.silent) {
        setLoading(true);
      }
      const [queueResponse, propertyResponse] = await Promise.all([listWorkspaceQueue(), listWorkspaceProperties()]);
      setQueue(queueResponse.items);
      setProperties(propertyResponse.items);
      setDraft((current) => ({
        ...current,
        propertyId: current.propertyId || propertyResponse.items[0]?.id || "",
        propertyUnitId:
          current.propertyUnitId ||
          propertyResponse.items.find((property) => property.id === (current.propertyId || propertyResponse.items[0]?.id || ""))?.units[0]?.id ||
          propertyResponse.items[0]?.units[0]?.id ||
          ""
      }));
      const resolvedId =
        nextSelectedId && queueResponse.items.some((item) => item.id === nextSelectedId)
          ? nextSelectedId
          : queueResponse.items[0]?.id || "";
      setSelectedId(resolvedId);
    } catch (error: unknown) {
      if (!input?.silent) {
        toast.error(getErrorMessage(error, "Failed to load queue"));
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
      enabled: Boolean(properties.length || queue.length || selectedId),
      intervalMs: 12000
    }
  );

  const propertyOptions = useMemo(
    () => properties.map((property) => ({ value: property.id, label: `${property.summaryLabel} · ${property.address}` })),
    [properties]
  );

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === draft.propertyId) || null,
    [draft.propertyId, properties]
  );

  const propertyUnitOptions = useMemo(() => {
    if (!selectedProperty) return [];
    return selectedProperty.units
      .map((unit) => ({
        value: unit.id,
        label: `${unit.label} · ${unit.bedroomCount} bed · ${unit.bathroomCount} bath`
      }));
  }, [selectedProperty]);

  function resetSearchFlow(nextPropertyId?: string) {
    const nextSelectedProperty = properties.find((property) => property.id === (nextPropertyId ?? draft.propertyId)) || null;
    setSearchQuery("");
    setSearchLoading(false);
    setSearchPerformed(false);
    setSearchResults([]);
    setSelectedExistingRenter(null);
    setInvitePreviewUrl(null);
    setDraft({
      ...emptyProposedDraft,
      propertyId: nextPropertyId ?? draft.propertyId,
      propertyUnitId: nextSelectedProperty?.units[0]?.id || ""
    });
  }

  async function searchRenterDirectory() {
    if (!draft.propertyId) {
      toast.error("Select a property first.");
      return;
    }
    if (!draft.propertyUnitId) {
      toast.error("Select a unit first.");
      return;
    }
    if (searchQuery.trim().length < 2) {
      toast.error("Enter at least two characters to search.");
      return;
    }

    try {
      setSearchLoading(true);
      setSearchPerformed(true);
      setSelectedExistingRenter(null);
      const response = await searchWorkspaceRenters(draft.propertyId, draft.propertyUnitId, searchQuery.trim());
      setSearchResults(response.items);
      if (!response.items.length) {
        setDraft((current) => ({
          ...current,
          email: isValidEmail(searchQuery.trim()) ? searchQuery.trim() : current.email,
          phone: /^\+?\d[\d\s-]{6,}$/.test(searchQuery.trim()) ? searchQuery.trim() : current.phone
        }));
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to search renters"));
    } finally {
      setSearchLoading(false);
    }
  }

  function useExistingRenter(result: WorkspaceRenterSearchResult) {
    setSelectedExistingRenter(result);
    setDraft((current) => ({
      ...current,
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      phone: result.phone
    }));
  }

  async function createProposedRenterEntry() {
    if (!draft.propertyId) {
      toast.error("Select a property.");
      return;
    }
    if (!draft.propertyUnitId) {
      toast.error("Select a unit.");
      return;
    }
    const isExistingMember = Boolean(selectedExistingRenter);

    if (!draft.firstName.trim()) {
      toast.error("Enter the renter first name.");
      return;
    }
    if (!draft.lastName.trim()) {
      toast.error("Enter the renter last name.");
      return;
    }
    if (!draft.email.trim()) {
      toast.error("Enter the renter email address.");
      return;
    }
    if (!isValidEmail(draft.email)) {
      toast.error("Enter a valid renter email address.");
      return;
    }
    if (!draft.phone.trim()) {
      toast.error("Enter the renter phone number.");
      return;
    }

    try {
      const response = await createWorkspaceProposedRenter({
        propertyId: draft.propertyId,
        propertyUnitId: draft.propertyUnitId,
        renterAccountId: selectedExistingRenter?.id,
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phone: draft.phone,
        notes: draft.notes || undefined
      });
      setInvitePreviewUrl(response.invitePreviewUrl || null);
      resetSearchFlow(draft.propertyId);
      await loadQueue(response.id);
      setDetail(response);
      setShowLinkForm(false);
      toast.success(
        isExistingMember
          ? "Existing renter linked. They can review this request from their RentSure dashboard."
          : "Invite captured. The renter should provide full information within 1-2 days."
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to add proposed renter"));
    }
  }

  async function requestRentScore() {
    if (!detail) return;
    try {
      const response = await requestWorkspaceRentScore(detail.id, detail.notes || undefined);
      await loadDetail(detail.id);
      await loadQueue(detail.id);
      setDetail(response);
      toast.success("Rent score requested.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to request rent score"));
    }
  }

  const canRequestScore = Boolean(detail && !detail.scoreRequests.length);
  const requestButtonLabel = detail?.scoreRequests.length ? "Rent score requested" : "Request rent score";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">Link tenant to your property</h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowLinkForm((current) => !current)}
          disabled={!properties.length}
        >
          {showLinkForm ? "Close" : "Link property to tenant"}
        </Button>
      </div>

      {!properties.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No property attached to this profile yet. Add a property before creating a proposed renter case.
        </div>
      ) : null}

      {showLinkForm ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 pt-6">
            {invitePreviewUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div className="font-medium text-slate-900">Local invite email preview</div>
                <a
                  className="mt-2 block break-all text-[var(--rentsure-blue)] hover:underline"
                  href={invitePreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {invitePreviewUrl}
                </a>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Property</Label>
              <Select
                value={draft.propertyId}
                onValueChange={(value) => {
                  const nextProperty = properties.find((property) => property.id === value) || null;
                  setDraft((current) => ({
                    ...current,
                    propertyId: value,
                    propertyUnitId: nextProperty?.units[0]?.id || ""
                  }));
                  resetSearchFlow(value);
                }}
                disabled={!properties.length}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {propertyOptions.map((property) => (
                    <SelectItem key={property.value} value={property.value}>
                      {property.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={draft.propertyUnitId}
                onValueChange={(value) => setDraft((current) => ({ ...current, propertyUnitId: value }))}
                disabled={!selectedProperty || !propertyUnitOptions.length}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {propertyUnitOptions.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:p-4">
              <p className="text-sm font-semibold text-slate-950">Search</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Email, phone, first name, or last name"
                  className="bg-white"
                  disabled={!properties.length}
                />
                <Button variant="outline" onClick={() => void searchRenterDirectory()} disabled={!properties.length || searchLoading}>
                  <Search className="mr-2 h-4 w-4" />
                  {searchLoading ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>

            {searchPerformed && searchResults.length ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-950">Existing renters</p>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    disabled={result.alreadyQueued}
                    onClick={() => useExistingRenter(result)}
                    className={`w-full rounded-2xl border p-3 text-left transition md:p-4 ${
                      selectedExistingRenter?.id === result.id
                        ? "border-[var(--rentsure-blue)] bg-[var(--rentsure-blue-soft)]/50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    } ${result.alreadyQueued ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{renterName(result)}</p>
                        <p className="text-sm text-slate-600">{result.email} · {result.phone}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.address ? `${result.address}, ${result.city}, ${result.state}` : `${result.city}, ${result.state}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{result.status}</Badge>
                        {result.alreadyQueued ? <p className="mt-2 text-xs text-amber-700">Already in this unit queue</p> : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {selectedExistingRenter ? (
              <div className="rounded-2xl border border-blue-200 bg-[var(--rentsure-blue-soft)]/40 p-3 md:p-4">
                <p className="text-sm font-semibold text-slate-950">Selected renter</p>
                <p className="mt-2 text-sm text-slate-700">{renterName(selectedExistingRenter)}</p>
                <p className="text-sm text-slate-600">{selectedExistingRenter.email} · {selectedExistingRenter.phone}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedExistingRenter.address}, {selectedExistingRenter.city}, {selectedExistingRenter.state}
                </p>
              </div>
            ) : null}

            {searchPerformed && !searchResults.length ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" value={draft.firstName} onChange={(value) => setDraft((current) => ({ ...current, firstName: value }))} />
                  <Field label="Last name" value={draft.lastName} onChange={(value) => setDraft((current) => ({ ...current, lastName: value }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
                  <Field label="Phone" value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} />
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="bg-white" />
            </div>
            <Button
              onClick={() => void createProposedRenterEntry()}
              disabled={!properties.length || (!selectedExistingRenter && (!searchPerformed || Boolean(searchResults.length)))}
              className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
            >
              Add tenant
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4 md:space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Linked tenants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <p className="text-sm text-muted-foreground">Loading queue...</p> : null}
              {!loading && !properties.length ? (
                <p className="text-sm text-muted-foreground">No property attached to this profile yet.</p>
              ) : null}
              {!loading && properties.length && !queue.length ? <p className="text-sm text-muted-foreground">No proposed renters in the queue yet.</p> : null}
              {queue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedId === item.id
                      ? "border-[var(--rentsure-blue)] bg-[var(--rentsure-blue-soft)]/60"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Property</p>
                      <p className="truncate font-semibold text-slate-950">{propertyDisplayName(item.property)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Unit</p>
                      <p className="truncate font-medium text-slate-700">{propertyUnitDisplayName(item.propertyUnit)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Renter</p>
                      <p className="truncate font-semibold text-slate-950">{renterName(item)}</p>
                    </div>
                    <div className="sm:justify-self-end">
                      <Badge className={decisionBadgeClass(item.decision?.decision)} variant="outline">
                        {item.decision?.decision || item.status}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Property-tenant details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-5">
              {detailLoading ? <p className="text-sm text-muted-foreground">Loading detail...</p> : null}
              {!detailLoading && !detail ? <p className="text-sm text-muted-foreground">Select a proposed renter to manage their record.</p> : null}
              {detail ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Renter</p>
                          <p className="truncate font-semibold text-slate-950">{renterName(detail)}</p>
                        </div>
                        <div className="sm:justify-self-end">
                          <Badge className={decisionBadgeClass(detail.decision?.decision)} variant="outline">
                            {detail.decision?.decision || detail.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-200">
                      <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Contact</p>
                        <p className="text-sm text-slate-600">
                          {[detail.email, detail.phone].filter(Boolean).join(" · ") || "Contact details pending"}
                        </p>
                      </div>
                      <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Renter address</p>
                        {detail.address ? (
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>{detail.address}</p>
                            <p>{detail.city}, {detail.state}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">Profile details pending</p>
                        )}
                      </div>
                      {!isAgent ? (
                        <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Rent score</p>
                          <p className="text-sm text-slate-600">
                            {detail.linkedRentScore ? `${detail.linkedRentScore.score} / 900` : "In progress"}
                          </p>
                        </div>
                      ) : null}
                      <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Property</p>
                        <p className="text-sm text-slate-600">{propertyDisplayName(detail.property)}</p>
                      </div>
                      <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Unit</p>
                        <p className="text-sm text-slate-600">{propertyUnitDisplayName(detail.propertyUnit)}</p>
                      </div>
                      <div className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Property address</p>
                        <p className="text-sm text-slate-600">{`${detail.property.address}, ${detail.property.city}, ${detail.property.state}`}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void requestRentScore()} disabled={!canRequestScore} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      {requestButtonLabel}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-950">Rent score requests</p>
                    {!detail.scoreRequests.length ? <p className="text-sm text-muted-foreground">No score requests yet.</p> : null}
                    {detail.scoreRequests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="outline">{request.status}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          <p>Requested by {request.requestedBy.name}</p>
                          {request.forwardedTo ? <p>Forwarded to {request.forwardedTo.name}</p> : null}
                          {request.notes ? <p>{request.notes}</p> : null}
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

function Field({
  label,
  value,
  onChange,
  type
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="bg-white" />
    </div>
  );
}

function decisionBadgeClass(decision?: string | null) {
  if (decision === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (decision === "HOLD") return "border-amber-200 bg-amber-50 text-amber-700";
  if (decision === "DECLINED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}
