import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { publicFetch, setAuthSession } from "@/lib/api";
import { RENTSURE_RELEASE_LABEL } from "@/lib/branding";
import { getErrorCode, getErrorMessage } from "@/lib/errors";
import { isAgentRole, type AppRole } from "@/lib/roles";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  accountScope?: "STAFF" | "PUBLIC";
  user: {
    id: string;
    role: string;
    fullName: string;
    email: string;
    outletId?: string | null;
  };
};

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await publicFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      setAuthSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accountScope: data.accountScope,
        userRole: data.user.role,
        userName: data.user.fullName,
        userEmail: data.user.email,
        userId: data.user.id,
        outletId: data.user.outletId
      });

      const rawRole = data.user.role.toUpperCase();
      const isOperatorRole = data.accountScope === "STAFF" && (rawRole === "ADMIN" || rawRole === "AGENT");

      if (!isOperatorRole) {
        toast.success("Email verified. Signed in.");
        nav(rawRole === "AGENT" || rawRole === "LANDLORD" ? "/account/dashboard" : rawRole === "RENTER" ? "/account/renter/dashboard" : "/account/home");
        return;
      }

      const role: AppRole = rawRole === "ADMIN" ? "ADMIN" : "AGENT";
      toast.success("Logged in");
      nav(isAgentRole(role) ? "/app/dashboard" : "/app/rent-score");
    } catch (error: unknown) {
      if (getErrorCode(error) === "EMAIL_NOT_VERIFIED") {
        toast.error("Verify your email before signing in.");
        return;
      }
      toast.error(getErrorMessage(error, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafcff_0%,#ffffff_50%,#f7f8ff_100%)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center space-y-3 text-center">
          <BrandLogo size="md" showTagline />
          <div className="text-sm text-slate-500">Web Portal</div>
        </div>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white/95 shadow-[0_24px_80px_-48px_rgba(18,0,255,0.45)] backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Sign in</CardTitle>
            <p className="text-xs text-slate-400 text-muted-foreground text-center">
              Use your verified email.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="border border-slate-300 focus:border-slate-400 focus:ring-slate-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Password</Label>
                  <Link className="text-xs text-slate-500 hover:text-[var(--rentsure-blue)]" to="/reset-password">
                    Reset password
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="border border-slate-300 pr-11 focus:border-slate-400 focus:ring-slate-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-[var(--rentsure-blue)]"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button className="w-full" disabled={loading} type="submit">
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-700">
                {RENTSURE_RELEASE_LABEL}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link className="inline-flex items-center gap-2 text-slate-500 hover:text-[var(--rentsure-blue)]" to="/">
              <ArrowLeft className="h-4 w-4" />
              Back to landing page
            </Link>
            <Link className="text-slate-500 hover:text-[var(--rentsure-blue)]" to="/signup">
              Don&apos;t have an account yet? <span className="text-[var(--rentsure-blue)]">Sign up</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
