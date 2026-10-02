import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { addAdminNote, changeAdminRole, getManagedUser, updateManagedUser, type AdminRole } from "@/lib/user-management-api";

function dateLabel(value?: unknown) { const date = value ? new Date(String(value)) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "-"; }
function statusClass(value: string) { return value === "ACTIVE" || value === "VERIFIED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : value === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700"; }

export default function AdminUserDetailsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<Awaited<ReturnType<typeof getManagedUser>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  async function load() {
    try { setLoading(true); const result = await getManagedUser(id); setUser(result); setDraft({ firstName: String(result.profile.firstName ?? ""), lastName: String(result.profile.lastName ?? ""), organizationName: String(result.profile.organizationName ?? ""), phone: String(result.profile.phone ?? ""), address: String(result.profile.address ?? ""), city: String(result.profile.city ?? ""), state: String(result.profile.state ?? "") }); } catch (error: unknown) { toast.error(getErrorMessage(error, "Unable to load user.")); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [id]);

  async function save() { try { const updates = Object.fromEntries(Object.entries(draft).filter(([, value]) => value.trim() !== "")); await updateManagedUser(id, updates); toast.success("User updated."); setEditing(false); await load(); } catch (error: unknown) { toast.error(getErrorMessage(error, "Unable to update user.")); } }
  async function saveNote() { if (!note.trim()) return; try { await addAdminNote(id, note); setNote(""); toast.success("Note added."); await load(); } catch (error: unknown) { toast.error(getErrorMessage(error, "Unable to add note.")); } }
  async function saveRole(value: AdminRole) { try { await changeAdminRole(id, value); toast.success("Admin role updated."); await load(); } catch (error: unknown) { toast.error(getErrorMessage(error, "Unable to update admin role.")); } }

  if (loading) return <p className="text-sm text-muted-foreground">Loading user...</p>;
  if (!user) return <p className="text-sm text-rose-600">User not found.</p>;

  const setField = (key: string, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return <div className="space-y-6">
    <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate("/app/users")}><ArrowLeft className="h-4 w-4" /></Button><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">User Management</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{user.name}</h1></div><Badge className={`ml-auto border ${statusClass(user.accountStatus)}`}>{user.accountStatus}</Badge></div>
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6"><Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-lg">Personal / Profile Information</CardTitle>{!editing ? <Button variant="outline" onClick={() => setEditing(true)}>Edit User</Button> : null}</CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{["firstName", "lastName", "organizationName", "phone", "address", "city", "state"].map((key) => <label key={key} className="space-y-1 text-sm font-medium text-slate-700"><span>{key.replace(/([A-Z])/g, " $1")}</span>{editing ? <Input value={draft[key] ?? ""} onChange={(e) => setField(key, e.target.value)} /> : <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-950">{draft[key] || "-"}</p>}</label>)}{editing ? <div className="flex gap-2 md:col-span-2"><Button onClick={() => void save()}><Save className="mr-2 h-4 w-4" />Save changes</Button><Button variant="outline" onClick={() => { setEditing(false); void load(); }}>Cancel</Button></div> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">RentSure Activity</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">{Object.entries(user.activity).map(([key, value]) => <div key={key} className="rounded-xl border p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Admin Notes</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Textarea placeholder="Add an internal note" value={note} onChange={(e) => setNote(e.target.value)} /><Button onClick={() => void saveNote()}>Add</Button></div>{!user.notes.length ? <p className="text-sm text-muted-foreground">No admin notes.</p> : user.notes.map((item) => <div key={item.id} className="rounded-xl border p-3"><p className="text-sm text-slate-900">{item.note}</p><p className="mt-2 text-xs text-muted-foreground">{item.author?.fullName ?? "Admin"} · {dateLabel(item.createdAt)}</p></div>)}</CardContent></Card></div>
      <div className="space-y-6"><Card><CardHeader><CardTitle className="text-lg">Account Information</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><span className="text-muted-foreground">Type:</span> {user.userType}</p><p><span className="text-muted-foreground">Email:</span> {user.email}</p><p><span className="text-muted-foreground">Registered:</span> {dateLabel(user.dateRegistered)}</p><p><span className="text-muted-foreground">Last login:</span> {dateLabel(user.lastLogin)}</p>{user.adminRole ? <p><span className="text-muted-foreground">Admin role:</span> {user.adminRole}</p> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Verification</CardTitle></CardHeader><CardContent className="space-y-3"><Badge className={`border ${statusClass(user.verificationStatus)}`}>{user.verificationStatus}</Badge>{user.verification ? Object.entries(user.verification).map(([key, value]) => <p key={key} className="text-sm"><span className="text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}:</span> {value ? String(value) : "-"}</p>) : null}</CardContent></Card>
        {user.userType === "ADMIN" ? <Card><CardHeader><CardTitle className="text-lg">Admin Role</CardTitle></CardHeader><CardContent><select className="w-full rounded-md border bg-white px-3 py-2" value={user.adminRole ?? "ADMIN"} onChange={(e) => void saveRole(e.target.value as AdminRole)}><option value="SUPER_ADMIN">Super Admin</option><option value="ADMIN">Admin</option><option value="SUPPORT_ADMIN">Support Admin</option><option value="READ_ONLY_ADMIN">Read Only Admin</option></select></CardContent></Card> : null}
        <Card><CardHeader><CardTitle className="text-lg">Documents</CardTitle></CardHeader><CardContent>{!user.documents.length ? <p className="text-sm text-muted-foreground">No documents.</p> : user.documents.map((document) => <div key={String(document.id)} className="border-b py-2 text-sm last:border-0">{String(document.fileName)} <span className="text-muted-foreground">· {String(document.documentType)}</span></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Account / Audit History</CardTitle></CardHeader><CardContent>{!user.auditHistory.length ? <p className="text-sm text-muted-foreground">No history.</p> : <div className="space-y-3">{user.auditHistory.map((item) => <div key={item.id} className="border-b pb-2 text-sm last:border-0"><p className="font-medium">{item.action}</p><p className="text-xs text-muted-foreground">{dateLabel(item.createdAt)}</p></div>)}</div>}</CardContent></Card>
      </div>
    </div>
    <Link className="text-sm text-[var(--rentsure-blue)] hover:underline" to="/app/users">Back to User Management</Link>
  </div>;
}
