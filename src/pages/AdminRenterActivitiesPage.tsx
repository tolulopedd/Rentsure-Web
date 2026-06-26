import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { listAdminRenterActivities, type AdminRenterActivityItem } from "@/lib/rent-score-api";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function decisionLabel(value?: string | null) {
  if (value === "HOLD") return "Additional info";
  return value || "Pending";
}

function activityLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function AdminRenterActivitiesPage() {
  const [items, setItems] = useState<AdminRenterActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityType, setActivityType] = useState("ALL");
  const [query, setQuery] = useState("");
  const hasActiveFilter = query.trim().length > 0 || activityType !== "ALL";

  async function loadItems() {
    try {
      setLoading(true);
      const response = await listAdminRenterActivities();
      setItems(response.items);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load renter activities"));
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
      const matchesSearch =
        !search ||
        item.message.toLowerCase().includes(search) ||
        item.renter.name.toLowerCase().includes(search) ||
        item.renter.email.toLowerCase().includes(search) ||
        item.property.summaryLabel.toLowerCase().includes(search) ||
        item.property.city.toLowerCase().includes(search) ||
        item.property.state.toLowerCase().includes(search);

      return matchesType && matchesSearch;
    });
  }, [activityType, hasActiveFilter, items, query]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Admin workflow</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Renter activities</h1>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Activity list</CardTitle>
          {hasActiveFilter ? <Badge variant="outline">{filteredItems.length} items</Badge> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search renter, email, property, or message"
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
                    <TableHead>Renter</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell>{decisionLabel(item.renter.decision)}</TableCell>
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
