import { apiFetch } from "@/lib/api";

export type ManagedUserType = "RENTER" | "LANDLORD" | "AGENT" | "ADMIN";
export type ManagedUserStatus = "UNVERIFIED" | "ACTIVE" | "DISABLED" | "SUSPENDED" | "BLOCKED";
export type ManagedVerificationStatus = "VERIFIED" | "UNVERIFIED" | "PENDING" | "FAILED";
export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT_ADMIN" | "READ_ONLY_ADMIN";

export type ManagedUser = {
  id: string;
  source: "PUBLIC" | "STAFF";
  name: string;
  userType: ManagedUserType;
  email: string;
  phone: string;
  verificationStatus: ManagedVerificationStatus;
  accountStatus: ManagedUserStatus;
  dateRegistered: string;
  lastLogin: string | null;
  adminRole?: AdminRole | null;
};

export type ManagedUserListResponse = {
  items: ManagedUser[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  counts: { totalUsers: number; renters: number; landlords: number; agents: number; admins: number; active: number; suspended: number };
};

export function listManagedUsers(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
  return apiFetch<ManagedUserListResponse>(`/api/admin/users?${query.toString()}`);
}

export function getManagedUser(id: string) {
  return apiFetch<ManagedUser & { profile: Record<string, unknown>; account: Record<string, unknown>; verification?: Record<string, unknown>; activity: Record<string, number>; documents: Array<Record<string, unknown>>; notes: Array<{ id: string; note: string; createdAt: string; author?: { fullName: string } }>; auditHistory: Array<{ id: string; action: string; entity: string; createdAt: string; meta?: unknown }> }>(`/api/admin/users/${encodeURIComponent(id)}`);
}

export function updateManagedUser(id: string, input: Record<string, unknown>) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function changeManagedUserStatus(id: string, action: string, reason?: string) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}/status`, { method: "POST", body: JSON.stringify({ action, reason }) });
}

export function resendManagedVerification(id: string) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}/resend-verification`, { method: "POST" });
}

export function sendManagedPasswordReset(id: string) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}/send-password-reset`, { method: "POST" });
}

export function changeAdminRole(id: string, adminRole: AdminRole) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}/admin-role`, { method: "PATCH", body: JSON.stringify({ adminRole }) });
}

export function addAdminNote(id: string, note: string) {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}/notes`, { method: "POST", body: JSON.stringify({ note }) });
}

export function createAdmin(input: { fullName: string; email: string; password: string; adminRole: AdminRole }) {
  return apiFetch("/api/admin/admins", { method: "POST", body: JSON.stringify(input) });
}
