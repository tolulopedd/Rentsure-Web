export type AppRole = "ADMIN" | "AGENT";
export type PublicWorkspaceRole = "AGENT" | "LANDLORD" | "RENTER";

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
