import { useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { exportCustomers, listCustomers, type Customer } from "@/lib/customers-api";

const typeLabels = { RENTER: "Renter", LANDLORD: "Landlord", AGENT: "Agent" } as const;

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function statusClass(status: string) {
  return status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "SUSPENDED" || status === "UNVERIFIED" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-700";
}

export default function AdminCustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [customerType, setCustomerType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("dateRegistered");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const result = await listCustomers({ q: query, customerType: customerType === "ALL" ? undefined : customerType, status: status === "ALL" ? undefined : status, sortBy, sortDir, page, pageSize: 25 });
      setItems(result.items);
      setTotalCustomers(result.totalCustomers);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load customers."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [query, customerType, status, sortBy, sortDir, page]);

  async function downloadExport() {
    try {
      const csv = await exportCustomers({ q: query, customerType: customerType === "ALL" ? undefined : customerType, status: status === "ALL" ? undefined : status, sortBy, sortDir });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rentsure-customers-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to export customers."));
    }
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Admin</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Customers</h1><p className="mt-1 text-sm text-muted-foreground">Renters, landlords and agents.</p></div>
      <Button onClick={() => void downloadExport()}><Download className="mr-2 h-4 w-4" />Export Customers</Button>
    </div>
    <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Total customers</p><p className="mt-2 text-3xl font-semibold text-slate-950">{totalCustomers}</p></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-lg">Customer list</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><div className="relative xl:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, email or phone" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} /></div><Select value={customerType} onValueChange={(value) => { setPage(1); setCustomerType(value); }}><SelectTrigger><SelectValue placeholder="Customer type" /></SelectTrigger><SelectContent><SelectItem value="ALL">All customer types</SelectItem><SelectItem value="RENTER">Renters</SelectItem><SelectItem value="LANDLORD">Landlords</SelectItem><SelectItem value="AGENT">Agents</SelectItem></SelectContent></Select><Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}><SelectTrigger><SelectValue placeholder="Account status" /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="UNVERIFIED">Unverified</SelectItem><SelectItem value="DISABLED">Disabled</SelectItem><SelectItem value="SUSPENDED">Suspended</SelectItem><SelectItem value="BLOCKED">Blocked</SelectItem></SelectContent></Select><div className="flex gap-2"><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dateRegistered">Date registered</SelectItem><SelectItem value="firstName">First name</SelectItem><SelectItem value="lastName">Last name</SelectItem><SelectItem value="type">Customer type</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select><Button variant="outline" onClick={() => setSortDir((value) => value === "asc" ? "desc" : "asc")}>{sortDir === "asc" ? "Asc" : "Desc"}</Button></div></div>
      {loading ? <p className="text-sm text-muted-foreground">Loading customers...</p> : null}
      {!loading && !items.length ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No customers match these filters.</p> : null}
      {!loading && items.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>First Name</TableHead><TableHead>Last Name</TableHead><TableHead>Customer Type</TableHead><TableHead>Email Address</TableHead><TableHead>Phone Number</TableHead><TableHead>Address</TableHead><TableHead>Status</TableHead><TableHead>Date Registered</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.firstName || "-"}</TableCell><TableCell>{item.lastName || "-"}</TableCell><TableCell>{typeLabels[item.customerType]}</TableCell><TableCell>{item.email}</TableCell><TableCell>{item.phone || "-"}</TableCell><TableCell className="max-w-[260px] truncate">{item.address || "-"}</TableCell><TableCell><Badge className={`border ${statusClass(item.accountStatus)}`}>{item.accountStatus}</Badge></TableCell><TableCell>{dateLabel(item.dateRegistered)}</TableCell></TableRow>)}</TableBody></Table></div> : null}
      <div className="flex items-center justify-between border-t pt-4 text-sm"><span className="text-muted-foreground">Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </CardContent></Card>
  </div>;
}

