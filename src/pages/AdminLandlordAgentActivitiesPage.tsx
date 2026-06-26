import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { listAdminLandlordAgentActivities, type AdminLandlordAgentActivityItem } from "@/lib/rent-score-api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function activityLabel(value: string) {
  return value.replaceAll("_", " ");
}

function approvalLabel(status: AdminLandlordAgentActivityItem["shareApproval"]["status"]) {
  if (status === "APPROVED") return "Approved";
  if (status === "PENDING") return "Pending";
  return "No request";
}

export default function AdminLandlordAgentActivitiesPage() {
  const [items, setItems] = useState<AdminLandlordAgentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityType, setActivityType] = useState("ALL");
  const [actorType, setActorType] = useState("ALL");
  const [query, setQuery] = useState("");
  const hasActiveFilter = query.trim().length > 0 || activityType !== "ALL" || actorType !== "ALL";

  async function loadItems() {
    try {
      setLoading(true);
      const response = await listAdminLandlordAgentActivities();
      setItems(response.items);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load landlord and agent activities"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const activityTypes = useMemo(
    () => Array.from(new Set(items.map((item) => item.activityType))).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    if (!hasActiveFilter) return [];
    const search = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = activityType === "ALL" || item.activityType === activityType;
      const matchesActorType = actorType === "ALL" || item.actor?.accountType === actorType;
      const matchesSearch =
        !search ||
        item.message.toLowerCase().includes(search) ||
        item.renter.name.toLowerCase().includes(search) ||
        item.renter.email.toLowerCase().includes(search) ||
        item.property.summaryLabel.toLowerCase().includes(search) ||
        item.property.city.toLowerCase().includes(search) ||
        item.property.state.toLowerCase().includes(search) ||
        item.actor?.name.toLowerCase().includes(search) ||
        item.actor?.email.toLowerCase().includes(search);

      return matchesType && matchesActorType && matchesSearch;
    });
  }, [activityType, actorType, hasActiveFilter, items, query]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Admin workflow</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Landlord and agent activities</h1>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Activity list</CardTitle>
          {hasActiveFilter ? <Badge variant="outline">{filteredItems.length} items</Badge> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search actor, renter, property, or message"
              className="bg-white"
            />
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All activity types" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">All activity types</SelectItem>
                {activityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {activityLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actorType} onValueChange={setActorType}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All actor types" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">All actor types</SelectItem>
                <SelectItem value="LANDLORD">Landlord</SelectItem>
                <SelectItem value="AGENT">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading activities...</p> : null}
          {!loading && hasActiveFilter && !filteredItems.length ? <p className="text-sm text-muted-foreground">No activities found.</p> : null}

          {!loading && filteredItems.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Renter</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Share</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>{activityLabel(item.activityType)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{item.actor?.name || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.actor?.accountType || "-"}{item.actor?.email ? ` · ${item.actor.email}` : ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{item.renter.name}</p>
                          <p className="text-xs text-muted-foreground">{item.renter.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{item.property.summaryLabel}</p>
                          <p className="text-xs text-muted-foreground">{item.property.city}, {item.property.state}</p>
                        </div>
                      </TableCell>
                      <TableCell>{approvalLabel(item.shareApproval.status)}</TableCell>
                      <TableCell className="min-w-[260px]">{item.message}</TableCell>
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
