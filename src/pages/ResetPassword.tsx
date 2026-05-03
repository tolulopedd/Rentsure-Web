import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { usePageSeo } from "@/lib/usePageSeo";

type ResetPasswordResponse = {
  success: boolean;
  email: string;
  resetEmailPreviewUrl?: string | null;
  resetLinkPreviewUrl?: string | null;
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const isTokenFlow = Boolean(token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResetPasswordResponse | null>(null);

  usePageSeo({
    title: "RentSure | Reset Password",
    description: "Request a RentSure password reset link.",
    canonicalPath: "/reset-password"
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      if (isTokenFlow) {
        if (!password.trim()) {
          toast.error("Enter a new password.");
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Passwords do not match.");
          return;
        }

        await publicFetch<{ success: boolean }>("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token, password })
        });
        setSubmitted(true);
        toast.success("Password reset complete");
      } else {
        if (!email.trim()) {
          toast.error("Enter your email address.");
          return;
        }

        const response = await publicFetch<ResetPasswordResponse>("/api/auth/request-password-reset", {
          method: "POST",
          body: JSON.stringify({ email: email.trim() })
        });
        setResult(response);
        setSubmitted(true);
        toast.success("Reset link sent");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, isTokenFlow ? "Unable to reset password." : "Unable to process reset request."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fafcff_0%,#ffffff_50%,#f7f8ff_100%)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center space-y-3 text-center">
          <BrandLogo size="md" showTagline />
          <div className="text-sm text-slate-500">Reset your password</div>
        </div>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white/95 shadow-[0_24px_80px_-48px_rgba(18,0,255,0.45)] backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-xl">Password reset</CardTitle>
            <p className="text-center text-xs text-slate-400">Enter the email linked to your RentSure account.</p>
          </CardHeader>

          <CardContent>
            {submitted ? (
              <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  <MailCheck className="h-4 w-4" />
                  {isTokenFlow ? "Password updated" : "Request received"}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {isTokenFlow ? (
                    <>
                      Your password has been updated successfully. You can return to sign in with your new password.
                    </>
                  ) : (
                    <>
                      If the email exists in RentSure, we have sent a password reset link to{" "}
                      <span className="font-medium text-slate-900">{email}</span>.
                    </>
                  )}
                </p>
                {!isTokenFlow && result?.resetEmailPreviewUrl ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/80 p-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">Local email preview</div>
                    <a
                      className="mt-2 block break-all text-[var(--rentsure-blue)] hover:underline"
                      href={result.resetEmailPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {result.resetEmailPreviewUrl}
                    </a>
                    {result.resetLinkPreviewUrl ? (
                      <a
                        className="mt-3 block break-all text-[var(--rentsure-blue)] hover:underline"
                        href={result.resetLinkPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {result.resetLinkPreviewUrl}
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {!isTokenFlow ? (
                    <Button
                      onClick={() => {
                        setSubmitted(false);
                        setResult(null);
                      }}
                    >
                      Change email
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link to="/login">Back to sign in</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                {isTokenFlow ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="reset-password">New password</Label>
                      <Input
                        id="reset-password"
                        autoComplete="new-password"
                        className="border border-slate-300 focus:border-slate-400 focus:ring-slate-300"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter new password"
                        type="password"
                        value={password}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm password</Label>
                      <Input
                        id="confirm-password"
                        autoComplete="new-password"
                        className="border border-slate-300 focus:border-slate-400 focus:ring-slate-300"
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm new password"
                        type="password"
                        value={confirmPassword}
                      />
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      Use at least 10 characters with uppercase, lowercase, number, and special character.
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      autoComplete="email"
                      className="border border-slate-300 focus:border-slate-400 focus:ring-slate-300"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter email address"
                      type="email"
                      value={email}
                    />
                  </div>
                )}

                <Button className="w-full" disabled={loading} type="submit">
                  {loading ? "Submitting..." : isTokenFlow ? "Reset password" : "Send reset link"}
                </Button>
              </form>
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
