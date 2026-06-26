import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import {
  getRenterScoreDetails,
  listRenterScores,
  type PublicAccountStatus,
  type RentScoreBand,
  type RenterScoreListItem,
  type RenterScoreSnapshot
} from "@/lib/rent-score-api";
import { rentScoreBandLabel } from "@/lib/rent-score-band";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
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

export default function RentersPage() {
  const [items, setItems] = useState<RenterScoreListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<RenterScoreSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PublicAccountStatus | "ALL">("ALL");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSearch = query.trim().length > 0;
  const visibleItems = hasSearch ? items : [];

  async function loadList(activeSelectedId?: string) {
    try {
      setLoadingList(true);
      setError(null);
      const search = query.trim();
      if (!search) {
        setItems([]);
        setSelectedId("");
        return;
      }

      const listResponse = await listRenterScores({ q: search, status });
      setItems(listResponse.items);

      const nextSelectedId =
        activeSelectedId && listResponse.items.some((item) => item.accountId === activeSelectedId)
          ? activeSelectedId
          : "";
      setSelectedId(nextSelectedId);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "Failed to load renter scores"));
      setItems([]);
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
    if (!hasSearch) {
      setItems([]);
      setSelectedId("");
      setDetail(null);
    }
  }, [hasSearch]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Admin workflow</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Renter scores</h1>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Renter list</CardTitle>
          <Badge variant="outline">{visibleItems.length} profiles</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search renter or email"
              className="bg-white"
            />
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

          {loadingList ? <p className="text-sm text-muted-foreground">Loading renters...</p> : null}
          {!loadingList && error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {!loadingList && hasSearch && !visibleItems.length && !error ? <p className="text-sm text-muted-foreground">No renters found.</p> : null}

          {!loadingList && visibleItems.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Renter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Band</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.map((item) => {
                    const isSelected = item.accountId === selectedId;
                    return (
                      <TableRow
                        key={item.accountId}
                        className={isSelected ? "bg-[var(--rentsure-blue-soft)]/40" : "cursor-pointer"}
                        onClick={() => setSelectedId(item.accountId)}
                      >
                        <TableCell className="min-w-[220px]">
                          <div>
                            <p className="font-medium text-slate-950">{renterDisplayName(item)}</p>
                            <p className="text-xs text-muted-foreground">{item.email}</p>
                            <p className="text-xs text-muted-foreground">{[item.city, item.state].filter(Boolean).join(", ") || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border ${statusClasses(item.status)}`}>{item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border ${bandClasses(item.scoreBand)}`}>{rentScoreBandLabel(item.scoreBand)}</Badge>
                        </TableCell>
                        <TableCell>{item.score} / 900</TableCell>
                        <TableCell>{item.eventCount}</TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Score detail</CardTitle>
          </div>
          {detail ? (
            <div className="text-right">
              <p className="text-sm font-medium text-slate-950">{renterDisplayName(detail.account)}</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-950">{detail.summary.score} / {detail.summary.maxScore}</p>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingDetail ? <p className="text-sm text-muted-foreground">Loading score detail...</p> : null}
          {!loadingDetail && !detail ? <p className="text-sm text-muted-foreground">Select a renter to continue.</p> : null}

          {detail ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Positive</TableHead>
                      <TableHead>Negative</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{detail.account.email}</TableCell>
                      <TableCell>{detail.account.phone || "-"}</TableCell>
                      <TableCell>{detail.account.status}</TableCell>
                      <TableCell>+{detail.summary.positivePoints}</TableCell>
                      <TableCell>-{detail.summary.negativePoints}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-950">Categories</h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Renter score</TableHead>
                        <TableHead>Max score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.categoryBreakdown.map((category) => (
                        <TableRow key={category.code}>
                          <TableCell>{category.name}</TableCell>
                          <TableCell>{category.score}</TableCell>
                          <TableCell>{category.maxScore}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
