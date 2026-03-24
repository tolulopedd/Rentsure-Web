import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import {
  canAccessPublicWorkspace,
  canAccessRenterDashboard,
  canManagePortal,
  getStoredAccountScope,
  getStoredUserRole,
  isAdminPortalRole,
  isAgentRole
} from "@/lib/roles";

export function AgentRoute({ element }: { element: ReactElement }) {
  if (getStoredAccountScope() !== "STAFF") {
    return <Navigate to="/account" replace />;
  }
  const role = getStoredUserRole();
  if (!isAgentRole(role)) {
    return <Navigate to={isAdminPortalRole(role) ? "/app/renters" : "/app/dashboard"} replace />;
  }
  return element;
}

export function AdminRoute({ element }: { element: ReactElement }) {
  if (getStoredAccountScope() !== "STAFF") {
    return <Navigate to="/account" replace />;
  }
  const role = getStoredUserRole();
  if (!isAdminPortalRole(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return element;
}

export function ManageRoute({ element }: { element: ReactElement }) {
  if (getStoredAccountScope() !== "STAFF") {
    return <Navigate to="/account" replace />;
  }
  const role = getStoredUserRole();
  if (!canManagePortal(role)) {
    return <Navigate to={isAdminPortalRole(role) ? "/app/rent-score" : "/app/dashboard"} replace />;
  }
  return element;
}

export function AppIndexRedirect() {
  if (getStoredAccountScope() !== "STAFF") {
    return <Navigate to="/account" replace />;
  }
  return <Navigate to="/app/dashboard" replace />;
}

export function PublicWorkspaceRoute({ element }: { element: ReactElement }) {
  if (!canAccessPublicWorkspace()) {
    return <Navigate to="/account/home" replace />;
  }
  return element;
}

export function RenterWorkspaceRoute({ element }: { element: ReactElement }) {
  if (!canAccessRenterDashboard()) {
    return <Navigate to="/account/home" replace />;
  }
  return element;
}

export function AccountIndexRedirect() {
  if (canAccessPublicWorkspace()) {
    return <Navigate to="/account/dashboard" replace />;
  }
  if (canAccessRenterDashboard()) {
    return <Navigate to="/account/renter/dashboard" replace />;
  }
  return <Navigate to="/account/home" replace />;
}
