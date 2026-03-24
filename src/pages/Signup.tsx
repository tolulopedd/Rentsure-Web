import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Building2, MailCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { publicFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { usePageSeo } from "@/lib/usePageSeo";

type SignupTrack = "RENTER" | "PROPERTY";
type SignupEntity = "INDIVIDUAL" | "COMPANY";

type SignupFormState = {
  track: SignupTrack;
  entityType: SignupEntity;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type SignupResponse = {
  success: boolean;
  email: string;
  status: string;
  verificationExpiresAt: string;
  verificationPreviewUrl?: string;
  verificationEmailPreviewUrl?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function initialForm(searchParams: URLSearchParams): SignupFormState {
  const trackParam = searchParams.get("track")?.trim().toUpperCase();
  const nextTrack: SignupTrack = trackParam === "RENTER" ? "RENTER" : "PROPERTY";

  return {
    track: nextTrack,
    entityType: "INDIVIDUAL",
    firstName: "",
    lastName: "",
    email: searchParams.get("email")?.trim() || "",
    phone: ""
  };
}

export default function Signup() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<SignupFormState>(() => initialForm(searchParams));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [signupResult, setSignupResult] = useState<SignupResponse | null>(null);

  usePageSeo({
    title: "RentSure | Signup",
    description: "Start your RentSure signup with your basic contact details.",
    canonicalPath: "/signup"
  });

  function update<K extends keyof SignupFormState>(key: K, value: SignupFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    if (!form.firstName.trim()) return "Enter first name.";
    if (!form.lastName.trim()) return "Enter last name.";
    if (!form.email.trim()) return "Enter email address.";
    if (!isValidEmail(form.email)) return "Enter a valid email address.";
    if (!form.phone.trim()) return "Enter phone number.";
    return null;
  }

  async function submitSignup() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setSubmitting(true);
      const response = await publicFetch<SignupResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          accountType: form.track === "RENTER" ? "RENTER" : "LANDLORD",
          entityType: form.entityType,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim()
        })
      });
      setSignupResult(response);
      setSubmitted(true);
      toast.success("Signup started. Check your email to continue.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to start signup."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fafcff_0%,#ffffff_50%,#f7f8ff_100%)] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center space-y-3 text-center">
          <BrandLogo size="md" showTagline />
          <div className="text-sm text-slate-500">Signup</div>
        </div>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white/95 shadow-[0_24px_80px_-48px_rgba(18,0,255,0.45)] backdrop-blur">
          <CardHeader className="space-y-3">
            <CardTitle className="text-center text-xl">Start with your basic details</CardTitle>
            <p className="text-center text-sm text-slate-500">
              We will send a verification link to your email.
            </p>
          </CardHeader>

          <CardContent>
            {submitted ? (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  <BadgeCheck className="h-4 w-4" />
                  Signup started
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Check your email to continue.
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  We sent a signup link to <span className="font-medium text-slate-900">{signupResult?.email ?? form.email}</span>. Open that link to verify your email and set your password.
                </p>
                {signupResult?.verificationEmailPreviewUrl || signupResult?.verificationPreviewUrl ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/80 p-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">Local email preview</div>
                    {signupResult?.verificationEmailPreviewUrl ? (
                      <a
                        className="mt-2 block break-all text-[var(--rentsure-blue)] hover:underline"
                        href={signupResult.verificationEmailPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {signupResult.verificationEmailPreviewUrl}
                      </a>
                    ) : null}
                    {signupResult?.verificationPreviewUrl ? (
                      <>
                        <div className="mt-3 font-medium text-slate-900">Direct signup link</div>
                        <a
                          className="mt-2 block break-all text-[var(--rentsure-blue)] hover:underline"
                          href={signupResult.verificationPreviewUrl}
                        >
                          {signupResult.verificationPreviewUrl}
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => setSubmitted(false)}>Edit details</Button>
                  <Button asChild variant="outline">
                    <Link to="/login">Go to sign in</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-3">
                    <Tabs value={form.track} onValueChange={(value) => update("track", value as SignupTrack)}>
                      <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white p-1 shadow-sm">
                        <TabsTrigger value="RENTER" className="h-12 rounded-xl text-sm font-semibold data-[state=active]:bg-[var(--rentsure-blue)] data-[state=active]:text-white">
                          <span className="inline-flex items-center gap-2">
                            <UserRound className="h-4 w-4" />
                            Renter
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="PROPERTY" className="h-12 rounded-xl text-sm font-semibold data-[state=active]:bg-[var(--rentsure-blue)] data-[state=active]:text-white">
                          <span className="inline-flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Landlord / Agent
                          </span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <Tabs value={form.entityType} onValueChange={(value) => update("entityType", value as SignupEntity)}>
                      <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white p-1 shadow-sm">
                        <TabsTrigger value="INDIVIDUAL" className="h-11 rounded-xl text-sm font-medium data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                          Individual
                        </TabsTrigger>
                        <TabsTrigger value="COMPANY" className="h-11 rounded-xl text-sm font-medium data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                          Company
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="Enter email address"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone number</Label>
                  <Input
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="Enter phone number"
                    autoComplete="tel"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{form.entityType === "COMPANY" ? "Contact first name" : "First name"}</Label>
                    <Input
                      value={form.firstName}
                      onChange={(event) => update("firstName", event.target.value)}
                      placeholder={form.entityType === "COMPANY" ? "Enter contact first name" : "Enter first name"}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{form.entityType === "COMPANY" ? "Contact last name" : "Last name"}</Label>
                    <Input
                      value={form.lastName}
                      onChange={(event) => update("lastName", event.target.value)}
                      placeholder={form.entityType === "COMPANY" ? "Enter contact last name" : "Enter last name"}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <Button className="w-full" onClick={() => void submitSignup()} disabled={submitting}>
                  {submitting ? (
                    "Submitting..."
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <MailCheck className="h-4 w-4" />
                      Continue with email verification
                    </span>
                  )}
                </Button>
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
