import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Plus, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/errors";
import { canAdminEditUsers, canAdminManageAdmins, getStoredUserRole } from "@/lib/roles";
import { changeManagedUserStatus, createAdmin, listManagedUsers, resendManagedVerification, sendManagedPasswordReset, type AdminRole, type ManagedUser } from "@/lib/user-management-api";

const typeLabels = { RENTER: "Renter", LANDLORD: "Landlord", AGENT: "Agent", ADMIN: "Admin" } as const;

function dateLabel(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function statusClass(status: string) {
  if (status === "ACTIVE" || status === "VERIFIED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "SUSPENDED" || status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "BLOCKED" || status === "DISABLED" || status === "FAILED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function requestReason(label: string) {
  if (!window.confirm(`${label}?`)) return null;
  const reason = window.prompt("Reason (required):", "")?.trim() || "";
  return reason || null;
}

export default function AdminUserManagementPage() {
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [counts, setCounts] = useState({ totalUsers: 0, renters: 0, landlords: 0, agents: 0, admins: 0, active: 0, suspended: 0 });
  const [query, setQuery] = useState("");
  const [userType, setUserType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [verificationStatus, setVerificationStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("dateRegistered");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ fullName: "", email: "", password: "", adminRole: "ADMIN" as AdminRole });

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      const response = await listManagedUsers({ q: query, userType: userType === "ALL" ? undefined : userType, status: status === "ALL" ? undefined : status, verificationStatus: verificationStatus === "ALL" ? undefined : verificationStatus, sortBy, sortDir, page, pageSize: 25 });
      setItems(response.items);
      setCounts(response.counts);
      setTotalPages(response.pagination.totalPages);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "Unable to load users."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadUsers(); }, [query, userType, status, verificationStatus, sortBy, sortDir, page]);

  async function handleStatus(item: ManagedUser, action: "ACTIVATE" | "DEACTIVATE" | "SUSPEND" | "UNSUSPEND" | "BLOCK") {
    const needsReason = action === "DEACTIVATE" || action === "SUSPEND" || action === "BLOCK";
    const reason = needsReason ? requestReason(action === "BLOCK" ? "Block user" : action === "SUSPEND" ? "Suspend user" : "Deactivate user") : (window.confirm(`${action === "ACTIVATE" ? "Activate" : "Unsuspend"} ${item.name}?`) ? "Admin action" : null);
    if (!reason) return;
    try {
      await changeManagedUserStatus(item.id, action, reason);
      toast.success("User status updated.");
      await loadUsers();
    } catch (actionError: unknown) { toast.error(getErrorMessage(actionError, "Unable to update user status.")); }
  }

  async function handleCreateAdmin(event: FormEvent) {
    event.preventDefault();
    try {
      await createAdmin(adminForm);
      toast.success("Admin account created.");
      setAdminForm({ fullName: "", email: "", password: "", adminRole: "ADMIN" });
      setCreateOpen(false);
      await loadUsers();
    } catch (createError: unknown) { toast.error(getErrorMessage(createError, "Unable to create admin account.")); }
  }

  const statCards = [["Total Users", counts.totalUsers], ["Renters", counts.renters], ["Landlords", counts.landlords], ["Agents", counts.agents], ["Admins", counts.admins], ["Active", counts.active], ["Suspended", counts.suspended]];
  const canEdit = getStoredUserRole() === "ADMIN" && canAdminEditUsers();
  const canManageAdmins = getStoredUserRole() === "ADMIN" && canAdminManageAdmins();

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Admin</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">User Management</h1><p className="mt-1 text-sm text-muted-foreground">Manage accounts and access.</p></div>
      {canManageAdmins ? <Button onClick={() => setCreateOpen((value) => !value)}><UserPlus className="mr-2 h-4 w-4" />{createOpen ? "Close" : "Create admin"}</Button> : null}
    </div>

    {createOpen ? <Card><CardHeader><CardTitle className="text-lg">Create admin account</CardTitle></CardHeader><CardContent><form onSubmit={handleCreateAdmin} className="grid gap-3 md:grid-cols-4"><Input required placeholder="Full name" value={adminForm.fullName} onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })} /><Input required type="email" placeholder="Email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} /><Input required type="password" placeholder="Password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} /><Select value={adminForm.adminRole} onValueChange={(value) => setAdminForm({ ...adminForm, adminRole: value as AdminRole })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="SUPPORT_ADMIN">Support Admin</SelectItem><SelectItem value="READ_ONLY_ADMIN">Read Only Admin</SelectItem><SelectItem value="SUPER_ADMIN">Super Admin</SelectItem></SelectContent></Select><Button type="submit" className="md:col-span-4"><Plus className="mr-2 h-4 w-4" />Create admin</Button></form></CardContent></Card> : null}

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{statCards.map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></CardContent></Card>)}</div>

    <Card><CardHeader><CardTitle className="text-lg">Users</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><div className="relative xl:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, email, phone or ID" value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} /></div><Select value={userType} onValueChange={(value) => { setPage(1); setUserType(value); }}><SelectTrigger><SelectValue placeholder="User type" /></SelectTrigger><SelectContent><SelectItem value="ALL">All types</SelectItem><SelectItem value="RENTER">Renters</SelectItem><SelectItem value="LANDLORD">Landlords</SelectItem><SelectItem value="AGENT">Agents</SelectItem><SelectItem value="ADMIN">Admins</SelectItem></SelectContent></Select><Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="UNVERIFIED">Unverified</SelectItem><SelectItem value="DISABLED">Disabled</SelectItem><SelectItem value="SUSPENDED">Suspended</SelectItem><SelectItem value="BLOCKED">Blocked</SelectItem></SelectContent></Select><Select value={verificationStatus} onValueChange={(value) => { setPage(1); setVerificationStatus(value); }}><SelectTrigger><SelectValue placeholder="Verification" /></SelectTrigger><SelectContent><SelectItem value="ALL">All verification</SelectItem><SelectItem value="VERIFIED">Verified</SelectItem><SelectItem value="UNVERIFIED">Unverified</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="FAILED">Failed</SelectItem></SelectContent></Select><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dateRegistered">Date registered</SelectItem><SelectItem value="name">Name</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="type">User type</SelectItem><SelectItem value="status">Status</SelectItem></SelectContent></Select><Button variant="outline" onClick={() => setSortDir((value) => value === "asc" ? "desc" : "asc")}>{sortDir === "asc" ? "Ascending" : "Descending"}</Button></div>
      {loading ? <p className="text-sm text-muted-foreground">Loading users...</p> : null}{error ? <p className="text-sm text-rose-600">{error}</p> : null}{!loading && !error && !items.length ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No users match these filters.</p> : null}
      {!loading && !error && items.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>User Type</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Verification</TableHead><TableHead>Status</TableHead><TableHead>Date Registered</TableHead><TableHead>Last Login</TableHead><TableHead /></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={`${item.source}-${item.id}`}><TableCell><Link className="font-medium text-[var(--rentsure-blue)] hover:underline" to={`/app/users/${item.id}`}>{item.name}</Link></TableCell><TableCell>{typeLabels[item.userType]}{item.adminRole ? <span className="block text-xs text-muted-foreground">{item.adminRole.replaceAll("_", " ")}</span> : null}</TableCell><TableCell>{item.email}</TableCell><TableCell>{item.phone}</TableCell><TableCell><Badge className={`border ${statusClass(item.verificationStatus)}`}>{item.verificationStatus}</Badge></TableCell><TableCell><Badge className={`border ${statusClass(item.accountStatus)}`}>{item.accountStatus}</Badge></TableCell><TableCell>{dateLabel(item.dateRegistered)}</TableCell><TableCell>{dateLabel(item.lastLogin)}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${item.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to={`/app/users/${item.id}`}>View User</Link></DropdownMenuItem>{canEdit ? <><DropdownMenuItem asChild><Link to={`/app/users/${item.id}?edit=1`}>Edit User</Link></DropdownMenuItem><DropdownMenuSeparator />{item.verificationStatus === "UNVERIFIED" && item.source === "PUBLIC" ? <DropdownMenuItem onClick={() => void resendManagedVerification(item.id).then(() => toast.success("Verification email sent.")).catch((e: unknown) => toast.error(getErrorMessage(e, "Unable to resend verification.")))}>Resend verification</DropdownMenuItem> : null}<DropdownMenuItem onClick={() => void sendManagedPasswordReset(item.id).then(() => toast.success("Password reset email sent.")).catch((e: unknown) => toast.error(getErrorMessage(e, "Unable to send password reset.")))}>Send password reset</DropdownMenuItem><DropdownMenuSeparator />{item.accountStatus === "ACTIVE" ? <><DropdownMenuItem onClick={() => void handleStatus(item, "SUSPEND")}>Suspend</DropdownMenuItem><DropdownMenuItem onClick={() => void handleStatus(item, "DEACTIVATE")}>Deactivate</DropdownMenuItem><DropdownMenuItem onClick={() => void handleStatus(item, "BLOCK")}>Block</DropdownMenuItem></> : <DropdownMenuItem onClick={() => void handleStatus(item, item.accountStatus === "SUSPENDED" ? "UNSUSPEND" : "ACTIVATE")}>{item.accountStatus === "SUSPENDED" ? "Unsuspend" : "Activate"}</DropdownMenuItem>}</> : null}</DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table></div> : null}
      <div className="flex items-center justify-between border-t pt-4 text-sm"><span className="text-muted-foreground">Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </CardContent></Card>
  </div>;
}

