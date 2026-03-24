import { Link, useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearAuthSession } from "@/lib/api";
import { canAccessPublicWorkspace, canAccessRenterDashboard } from "@/lib/roles";
import { usePageSeo } from "@/lib/usePageSeo";

export default function AccountHome() {
  const nav = useNavigate();

  if (canAccessPublicWorkspace()) {
    return <Navigate to="/account/profile" replace />;
  }
  if (canAccessRenterDashboard()) {
    return <Navigate to="/account/renter/dashboard" replace />;
  }

  const name = localStorage.getItem("userName") || "RentSure user";
  const email = localStorage.getItem("userEmail") || "-";
  const role = (localStorage.getItem("userRole") || "").replaceAll("_", " ").toLowerCase();

  usePageSeo({
    title: "RentSure | Account",
    description: "Your verified RentSure account.",
    canonicalPath: "/account"
  });

  function signOut() {
    clearAuthSession();
    nav("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafcff_0%,#ffffff_52%,#f6f7ff_100%)] px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <BrandLogo size="sm" showTagline />
          </Link>

          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>

        <Card className="mt-10 rounded-[2rem] border-slate-200 bg-white/95 shadow-[0_28px_90px_-52px_rgba(18,0,255,0.35)]">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <BadgeCheck className="h-4 w-4" />
              Verified account
            </div>
            <CardTitle className="text-3xl tracking-[-0.03em] text-slate-950">{name}</CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              Your RentSure account is verified. The full renter and landlord experience will continue from this
              account foundation.
            </p>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</div>
              <div className="mt-2 text-base font-medium text-slate-950">{email}</div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Account type</div>
              <div className="mt-2 text-base font-medium capitalize text-slate-950">{role || "verified account"}</div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5">
          <Link className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[var(--rentsure-blue)]" to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to landing page
          </Link>
        </div>
      </div>
    </div>
  );
}
