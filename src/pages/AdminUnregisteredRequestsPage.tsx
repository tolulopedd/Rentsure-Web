import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function AdminUnregisteredRequestsPage() {
  const [items, setItems] = useState<PendingRenterInviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [previewById, setPreviewById] = useState<Record<string, string>>({});

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Unregistered rent score requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Rent score requests waiting for renter signup.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Requests</CardTitle>
          <Badge variant="outline">{items.length} open</Badge>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading requests...</p> : null}
          {!loading && !items.length ? <p className="text-sm text-muted-foreground">No open requests right now.</p> : null}

          {!loading && items.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Renter</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Requested by</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Last reminder</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-950">{renterName(item)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{item.email}</div>
                          <div className="text-xs text-muted-foreground">{item.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{item.property.summaryLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.property.address}, {item.property.city}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{item.requestedBy.name}</div>
                          <div className="text-xs text-muted-foreground">{item.requestedBy.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{item.property.state}</TableCell>
                      <TableCell>{formatDate(item.lastReminderAt || item.createdAt)}</TableCell>
                      <TableCell className="text-right">
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
                            {sendingId === item.id ? "Sending..." : "Send reminder"}
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
