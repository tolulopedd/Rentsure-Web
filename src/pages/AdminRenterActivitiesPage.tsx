import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { listAdminRenterActivities, type AdminRenterActivityItem } from "@/lib/rent-score-api";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function decisionLabel(value?: string | null) {
  if (value === "HOLD") return "Request for additional information";
  return value || "Pending";
}

export default function AdminRenterActivitiesPage() {
  const [items, setItems] = useState<AdminRenterActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Renter activities</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent renter actions that affect review and payment flow.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Activities</CardTitle>
          <Badge variant="outline">{items.length} items</Badge>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading activities...</p> : null}
          {!loading && !items.length ? <p className="text-sm text-muted-foreground">No renter activity right now.</p> : null}

          {!loading && items.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Renter</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-950">{item.renter.name}</div>
                          <div className="text-xs text-muted-foreground">{item.renter.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{item.property.summaryLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.property.city}, {item.property.state}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{item.message}</div>
                          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.activityType.replaceAll("_", " ")}</div>
                        </div>
                      </TableCell>
                      <TableCell>{decisionLabel(item.renter.decision)}</TableCell>
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
