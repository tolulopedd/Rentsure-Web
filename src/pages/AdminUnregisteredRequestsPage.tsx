import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { listPendingRenterInvites, resendPendingRenterInvite, type PendingRenterInviteItem } from "@/lib/rent-score-api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function renterName(item: PendingRenterInviteItem) {
  return item.organizationName || [item.firstName, item.lastName].filter(Boolean).join(" ") || "Unnamed renter";
}

function inviteLabel(value: PendingRenterInviteItem["inviteState"]) {
  return value.replaceAll("_", " ");
}

export default function AdminUnregisteredRequestsPage() {
  const [items, setItems] = useState<PendingRenterInviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [previewById, setPreviewById] = useState<Record<string, string>>({});
  const [inviteState, setInviteState] = useState("ALL");
  const [query, setQuery] = useState("");
  const hasActiveFilter = query.trim().length > 0 || inviteState !== "ALL";

  async function loadItems() {
    try {
      setLoading(true);
      const response = await listPendingRenterInvites();
      setItems(response.items);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load unregistered requests"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function remind(proposedRenterId: string) {
    try {
      setSendingId(proposedRenterId);
      const response = await resendPendingRenterInvite(proposedRenterId);
      if (response.invitePreviewUrl) {
        setPreviewById((current) => ({ ...current, [proposedRenterId]: response.invitePreviewUrl as string }));
      }
      await loadItems();
      toast.success("Reminder sent");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to send reminder"));
    } finally {
      setSendingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    if (!hasActiveFilter) return [];
    const search = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesState = inviteState === "ALL" || item.inviteState === inviteState;
      const matchesSearch =
        !search ||
        renterName(item).toLowerCase().includes(search) ||
        item.email.toLowerCase().includes(search) ||
        item.phone.toLowerCase().includes(search) ||
        item.property.summaryLabel.toLowerCase().includes(search) ||
        item.property.address.toLowerCase().includes(search) ||
        item.property.city.toLowerCase().includes(search) ||
        item.property.state.toLowerCase().includes(search) ||
        item.requestedBy.name.toLowerCase().includes(search) ||
        item.requestedBy.email.toLowerCase().includes(search);

      return matchesState && matchesSearch;
    });
  }, [hasActiveFilter, inviteState, items, query]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Admin workflow</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Unregistered requests</h1>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Request list</CardTitle>
          {hasActiveFilter ? <Badge variant="outline">{filteredItems.length} items</Badge> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search renter, property, or requester"
              className="bg-white"
            />
            <Select value={inviteState} onValueChange={setInviteState}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All request states" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">All request states</SelectItem>
                <SelectItem value="INVITED">Invited</SelectItem>
                <SelectItem value="UNVERIFIED_ACCOUNT">Unverified account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading requests...</p> : null}
          {!loading && hasActiveFilter && !filteredItems.length ? <p className="text-sm text-muted-foreground">No requests found.</p> : null}

          {!loading && filteredItems.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Renter</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Requested by</TableHead>
                    <TableHead>Last follow-up</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="min-w-[180px]">
                        <p className="font-medium text-slate-950">{renterName(item)}</p>
                      </TableCell>
                      <TableCell>{inviteLabel(item.inviteState)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{item.email}</p>
                          <p className="text-xs text-muted-foreground">{item.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{item.property.summaryLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.property.address}, {item.property.city}, {item.property.state}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{item.requestedBy.name}</p>
                          <p className="text-xs text-muted-foreground">{item.requestedBy.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(item.lastReminderAt || item.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {previewById[item.id] ? (
                            <Button variant="outline" asChild>
                              <a href={previewById[item.id]} target="_blank" rel="noreferrer">
                                Preview
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
                            disabled={sendingId === item.id}
                            onClick={() => void remind(item.id)}
                          >
                            {sendingId === item.id ? "Sending..." : "Remind"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
