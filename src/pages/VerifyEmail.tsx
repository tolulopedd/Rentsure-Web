import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { publicFetch, setAuthSession } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { usePageSeo } from "@/lib/usePageSeo";

type VerifyEmailResponse = {
  success: boolean;
  email: string;
  fullName: string;
  accountType: "RENTER" | "LANDLORD" | "AGENT";
  entityType: "INDIVIDUAL" | "COMPANY";
};

type CompleteSignupResponse = {
  success: boolean;
  email: string;
  fullName: string;
  onboardingRoute: string;
  accessToken: string;
  refreshToken: string;
  accountScope?: "PUBLIC";
  user: {
    id: string;
    role: string;
    fullName: string;
    email: string;
    outletId?: string | null;
  };
};

function getPasswordRequirementStates(password: string) {
  return [
    { label: "10+ chars", met: password.length >= 10 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /\d/.test(password) },
    { label: "Special", met: /[^A-Za-z0-9]/.test(password) }
  ];
}

function strongPasswordError(password: string) {
  const failedRequirement = getPasswordRequirementStates(password).find((item) => !item.met);
  return failedRequirement ? `Password requirement: ${failedRequirement.label}.` : null;
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [result, setResult] = useState<VerifyEmailResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  usePageSeo({
    title: "RentSure | Complete Signup",
    description: "Verify your email and finish your RentSure signup.",
    canonicalPath: "/verify-email"
  });

  const passwordRequirements = useMemo(() => getPasswordRequirementStates(password), [password]);

  useEffect(() => {
    const token = searchParams.get("token")?.trim();
    if (!token) {
      setErrorMessage("This signup link is missing a token.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const payload = await publicFetch<VerifyEmailResponse>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (!cancelled) {
          setResult(payload);
          setTokenValid(true);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Unable to validate this signup link."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function completeSignup() {
    const token = searchParams.get("token")?.trim();
    if (!token) {
      toast.error("This signup link is missing a token.");
      return;
    }
    if (!password.trim()) {
      toast.error("Enter a password.");
      return;
    }
    const passwordError = strongPasswordError(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (!confirmPassword.trim()) {
      toast.error("Confirm the password.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = await publicFetch<CompleteSignupResponse>("/api/auth/complete-signup", {
        method: "POST",
        body: JSON.stringify({
          token,
          password
        })
      });
      setAuthSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        accountScope: payload.accountScope,
        userRole: payload.user.role,
        userName: payload.user.fullName,
        userEmail: payload.user.email,
        userId: payload.user.id,
        outletId: payload.user.outletId
      });
      toast.success("Email verified. Continue onboarding.");
      navigate(payload.onboardingRoute, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to complete signup."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fafcff_0%,#ffffff_50%,#f7f8ff_100%)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center space-y-3 text-center">
          <BrandLogo size="md" showTagline />
          <div className="text-sm text-slate-500">Complete your signup</div>
        </div>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white/95 shadow-[0_24px_80px_-48px_rgba(18,0,255,0.45)] backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-xl">Verify email and set password</CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                Validating your signup link...
              </div>
            ) : tokenValid && result ? (
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--rentsure-blue)]">
                    <LockKeyhole className="h-4 w-4" />
                    Verified email
                  </div>
                  <div className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {result.accountType === "RENTER" ? "Renter" : "Landlord / Agent"} ·{" "}
                    {result.entityType === "COMPANY" ? "Company" : "Individual"}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Continue as <span className="font-medium text-slate-900">{result.email}</span>. Set your password to activate this account and continue into RentSure.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Create password"
                      autoComplete="new-password"
                      className="pr-11"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-[var(--rentsure-blue)]"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className="pr-11"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-[var(--rentsure-blue)]"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {passwordRequirements.map((item) => (
                    <span
                      key={item.label}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        item.met ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>

                <Button className="w-full" onClick={() => void completeSignup()} disabled={submitting}>
                  {submitting ? "Activating..." : "Set password and continue"}
                </Button>
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                  <MailWarning className="h-4 w-4" />
                  Link unavailable
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{errorMessage}</p>
                <div className="mt-5">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/signup">Back to signup</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-5 text-center">
          <Link className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[var(--rentsure-blue)]" to="/login">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
