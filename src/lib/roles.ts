export type AppRole = "ADMIN" | "AGENT";
export type PublicWorkspaceRole = "AGENT" | "LANDLORD" | "RENTER";
export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT_ADMIN" | "READ_ONLY_ADMIN";

export function getStoredAccountScope() {
  return localStorage.getItem("accountScope") === "PUBLIC" ? "PUBLIC" : "STAFF";
}

export function getStoredUserRole(): AppRole {
  const raw = (localStorage.getItem("userRole") || "AGENT").toUpperCase();
  return raw === "ADMIN" ? "ADMIN" : "AGENT";
}

export function isAgentRole(role: AppRole) {
  return role === "AGENT";
}

export function isAdminPortalRole(role: AppRole) {
  return role === "ADMIN";
}

export function getStoredAdminRole(): AdminRole {
  const raw = (localStorage.getItem("adminRole") || "ADMIN").toUpperCase();
  if (raw === "SUPER_ADMIN" || raw === "SUPPORT_ADMIN" || raw === "READ_ONLY_ADMIN") return raw;
  return "ADMIN";
}

export function canAdminEditUsers() {
  return getStoredAdminRole() !== "READ_ONLY_ADMIN";
}

export function canAdminManageAdmins() {
  return getStoredAdminRole() === "SUPER_ADMIN";
}

export function canManagePortal(role: AppRole) {
  return role === "ADMIN";
}

export function getStoredPublicRole(): PublicWorkspaceRole {
  const raw = (localStorage.getItem("userRole") || "RENTER").toUpperCase();
  if (raw === "LANDLORD") return "LANDLORD";
  if (raw === "AGENT") return "AGENT";
  return "RENTER";
}

export function canAccessPublicWorkspace() {
  if (getStoredAccountScope() !== "PUBLIC") return false;
  const role = getStoredPublicRole();
  return role === "LANDLORD" || role === "AGENT";
}

export function canAccessRenterDashboard() {
  return getStoredAccountScope() === "PUBLIC" && getStoredPublicRole() === "RENTER";
}
