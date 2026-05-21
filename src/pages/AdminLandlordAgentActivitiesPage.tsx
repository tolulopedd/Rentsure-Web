import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import {
  approveRentScoreReport,
  listAdminLandlordAgentActivities,
  type AdminLandlordAgentActivityItem
} from "@/lib/rent-score-api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function approvalBadgeClass(status: AdminLandlordAgentActivityItem["shareApproval"]["status"]) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function approvalLabel(status: AdminLandlordAgentActivityItem["shareApproval"]["status"]) {
  if (status === "APPROVED") return "Approved";
  if (status === "PENDING") return "Waiting for admin";
  return "No request";
}

export default function AdminLandlordAgentActivitiesPage() {
  const [items, setItems] = useState<AdminLandlordAgentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

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

  async function approve(paymentId: string) {
    try {
      setApprovingId(paymentId);
      await approveRentScoreReport(paymentId);
      await loadItems();
      toast.success("Rent score report approved");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to approve rent score report"));
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Landlord and agent activities</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review property-link activity and approve rent score sharing for decisions.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Activities</CardTitle>
          <Badge variant="outline">{items.length} items</Badge>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading activities...</p> : null}
          {!loading && !items.length ? <p className="text-sm text-muted-foreground">No landlord or agent activity right now.</p> : null}

          {!loading && items.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Renter</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Share approval</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-950">{item.actor?.name || "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.actor?.accountType || "-"}{item.actor?.email ? ` · ${item.actor.email}` : ""}
                          </div>
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
                          <div className="font-medium text-slate-950">{item.renter.name}</div>
                          <div className="text-xs text-muted-foreground">{item.renter.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{item.message}</div>
                          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.activityType.replaceAll("_", " ")}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Badge className={approvalBadgeClass(item.shareApproval.status)}>{approvalLabel(item.shareApproval.status)}</Badge>
                          {item.latestScoreRequest ? (
                            <div className="text-xs text-muted-foreground">
                              Request {formatDate(item.latestScoreRequest.createdAt)}
                              {item.latestScoreRequest.reviewedAt ? ` · Reviewed ${formatDate(item.latestScoreRequest.reviewedAt)}` : ""}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.latestRentScorePayment && item.shareApproval.canApprove ? (
                          <Button
                            className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
                            disabled={approvingId === item.latestRentScorePayment.id}
                            onClick={() => void approve(item.latestRentScorePayment!.id)}
                          >
                            {approvingId === item.latestRentScorePayment.id ? "Approving..." : "Approve report"}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
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
