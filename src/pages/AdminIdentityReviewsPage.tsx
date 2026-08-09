import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import {
  listPendingIdentityReviews,
  reviewIdentitySubmission,
  type PendingIdentityReviewItem
} from "@/lib/rent-score-api";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function AdminIdentityReviewsPage() {
  const [items, setItems] = useState<PendingIdentityReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [commentsById, setCommentsById] = useState<Record<string, string>>({});

  async function loadItems() {
    try {
      setLoading(true);
      const response = await listPendingIdentityReviews();
      setItems(response.items);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load identity reviews"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleReview(publicAccountId: string, action: "APPROVE" | "FAIL") {
    try {
      setSubmittingId(publicAccountId);
      await reviewIdentitySubmission(publicAccountId, {
        action,
        comment: commentsById[publicAccountId]
      });
      toast.success(action === "APPROVE" ? "Identity approved" : "Identity review failed");
      setCommentsById((current) => ({ ...current, [publicAccountId]: "" }));
      await loadItems();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to submit identity review"));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Admin workflow</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Identity reviews</h1>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Pending reviews</CardTitle>
          <Badge variant="outline">{items.length} pending</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading identity reviews...</p> : null}
          {!loading && !items.length ? <p className="text-sm text-muted-foreground">No pending identity reviews.</p> : null}

          {!loading && items.length ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Renter</TableHead>
                      <TableHead>Identity</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.accountId}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-950">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.email}</p>
                            <p className="text-xs text-muted-foreground">{item.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-950">{item.identityVerificationType || "-"}</p>
                            <p className="text-xs text-muted-foreground">{item.maskedValue || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[240px]">
                          <div>
                            <p className="font-medium text-slate-950">{item.address}</p>
                            <p className="text-xs text-muted-foreground">{item.city}, {item.state}</p>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(item.submittedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.accountId} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.name}</p>
                        <p className="text-sm text-slate-500">
                          {item.identityVerificationType || "Identity"} submitted {formatDate(item.submittedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => void handleReview(item.accountId, "APPROVE")}
                          disabled={submittingId === item.accountId}
                          className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void handleReview(item.accountId, "FAIL")}
                          disabled={submittingId === item.accountId}
                        >
                          Fail review
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Textarea
                        value={commentsById[item.accountId] || ""}
                        onChange={(event) =>
                          setCommentsById((current) => ({ ...current, [item.accountId]: event.target.value }))
                        }
                        placeholder="Required if the review fails"
                        className="bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
