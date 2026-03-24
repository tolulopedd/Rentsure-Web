import { Navigate, createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "@/app/RequireAuth";
import { AppLayout } from "@/layouts/AppLayout";
import RouteError from "@/components/RouteError";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Signup from "@/pages/Signup";
import VerifyEmail from "@/pages/VerifyEmail";
import AccountHome from "@/pages/AccountHome";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import RentersPage from "@/pages/RentersPage";
import RentScoreAdminPage from "@/pages/RentScoreAdminPage";
import PublicWorkspaceDashboard from "@/pages/PublicWorkspaceDashboard";
import PublicWorkspaceQueue from "@/pages/PublicWorkspaceQueue";
import PublicWorkspaceDecisions from "@/pages/PublicWorkspaceDecisions";
import PublicWorkspacePayments from "@/pages/PublicWorkspacePayments";
import PublicWorkspaceProperties from "@/pages/PublicWorkspaceProperties";
import PublicWorkspaceProfile from "@/pages/PublicWorkspaceProfile";
import { PublicWorkspaceLayout } from "@/layouts/PublicWorkspaceLayout";
import { RenterWorkspaceLayout } from "@/layouts/RenterWorkspaceLayout";
import RenterWorkspaceDashboard from "@/pages/RenterWorkspaceDashboard";
import RenterWorkspaceCases from "@/pages/RenterWorkspaceCases";
import RenterWorkspaceQueue from "@/pages/RenterWorkspaceQueue";
import RenterWorkspacePayments from "@/pages/RenterWorkspacePayments";
import RenterWorkspaceProfile from "@/pages/RenterWorkspaceProfile";
import RenterWorkspaceShareScore from "@/pages/RenterWorkspaceShareScore";
import { AccountIndexRedirect, AdminRoute, AppIndexRedirect, PublicWorkspaceRoute, RenterWorkspaceRoute } from "@/app/route-guards";

export const router = createBrowserRouter([
  { path: "/", element: <Landing />, errorElement: <RouteError /> },
  { path: "/login", element: <Login />, errorElement: <RouteError /> },
  { path: "/reset-password", element: <ResetPassword />, errorElement: <RouteError /> },
  { path: "/signup", element: <Signup />, errorElement: <RouteError /> },
  { path: "/verify-email", element: <VerifyEmail />, errorElement: <RouteError /> },
  {
    path: "/account",
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <AccountIndexRedirect /> },
      { path: "home", element: <AccountHome /> },
      { path: "renter-dashboard", element: <Navigate to="/account/renter/dashboard" replace /> },
      {
        path: "renter",
        element: <RenterWorkspaceRoute element={<RenterWorkspaceLayout />} />,
        children: [
          { index: true, element: <Navigate to="/account/renter/dashboard" replace /> },
          { path: "dashboard", element: <RenterWorkspaceDashboard /> },
          { path: "cases", element: <RenterWorkspaceCases /> },
          { path: "queue", element: <RenterWorkspaceQueue /> },
          { path: "payments", element: <RenterWorkspacePayments /> },
          { path: "profile", element: <RenterWorkspaceProfile /> },
          { path: "share-score", element: <RenterWorkspaceShareScore /> }
        ]
      },
      {
        element: <PublicWorkspaceRoute element={<PublicWorkspaceLayout />} />,
        children: [
          { path: "dashboard", element: <PublicWorkspaceDashboard /> },
          { path: "queue", element: <PublicWorkspaceQueue /> },
          { path: "decisions", element: <PublicWorkspaceDecisions /> },
          { path: "payments", element: <PublicWorkspacePayments /> },
          { path: "properties", element: <PublicWorkspaceProperties /> },
          { path: "profile", element: <PublicWorkspaceProfile /> }
        ]
      }
    ]
  },
  {
    path: "/app",
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <AppIndexRedirect /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "renters", element: <AdminRoute element={<RentersPage />} /> },
          { path: "rent-score", element: <AdminRoute element={<RentScoreAdminPage />} /> },
          { path: "profile", element: <Profile /> },
          { path: "admin", element: <Navigate to="/app/rent-score" replace /> },
          { path: "users", element: <Navigate to="/app/rent-score" replace /> },
          { path: "outlets", element: <Navigate to="/app/rent-score" replace /> },
          { path: "customer", element: <Navigate to="/app/renters" replace /> },
          { path: "customer-enquiry", element: <Navigate to="/app/renters" replace /> },
          { path: "customers", element: <Navigate to="/app/renters" replace /> },
          { path: "wallet", element: <Navigate to="/app/dashboard" replace /> },
          { path: "withdrawals", element: <Navigate to="/app/dashboard" replace /> },
          { path: "deposits", element: <Navigate to="/app/dashboard" replace /> },
          { path: "transfers", element: <Navigate to="/app/dashboard" replace /> },
          { path: "integrations", element: <Navigate to="/app/dashboard" replace /> },
          { path: "loans", element: <Navigate to="/app/dashboard" replace /> },
          { path: "reports", element: <Navigate to="/app/dashboard" replace /> },
          { path: "receipts", element: <Navigate to="/app/dashboard" replace /> },
          { path: "loans-approvals", element: <Navigate to="/app/rent-score" replace /> },
          { path: "transactions-approvals", element: <Navigate to="/app/rent-score" replace /> },
          { path: "transaction-history", element: <Navigate to="/app/dashboard" replace /> },
          { path: "transactions", element: <Navigate to="/app/dashboard" replace /> },
          { path: "float", element: <Navigate to="/app/dashboard" replace /> },
          { path: "cash-requests", element: <Navigate to="/app/dashboard" replace /> },
          { path: "*", element: <div>404</div> }
        ]
      }
    ]
  }
]);
