import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CreditCard, FileBadge2, Home, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NigeriaAddressFields } from "@/components/NigeriaAddressFields";
import { clearAuthSession } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  confirmRenterPayment,
  getRenterDashboard,
  updateRenterProfile,
  verifyRenterIdentity,
  type RenterDashboardResponse
} from "@/lib/renter-api";
import { useNavigate } from "react-router-dom";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatNgn(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

function scorePercent(score: number, minScore: number, maxScore: number) {
  const range = Math.max(maxScore - minScore, 1);
  const percent = ((score - minScore) / range) * 100;
  return Math.max(0, Math.min(100, percent));
}

function scoreBandBadgeClass(scoreBand: "STRONG" | "STABLE" | "WATCH" | "RISK") {
  if (scoreBand === "STRONG") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (scoreBand === "STABLE") return "border-lime-200 bg-lime-50 text-lime-700";
  if (scoreBand === "WATCH") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function decisionBadgeClass(decision?: string | null) {
  if (decision === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (decision === "HOLD") return "border-amber-200 bg-amber-50 text-amber-700";
  if (decision === "DECLINED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function RenterDashboard() {
  const nav = useNavigate();
  const [data, setData] = useState<RenterDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [identitySaving, setIdentitySaving] = useState<"NIN" | "BVN" | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    state: "",
    city: "",
    address: "",
    notes: ""
  });
  const [nin, setNin] = useState("");
  const [bvn, setBvn] = useState("");
  const [paymentNoteById, setPaymentNoteById] = useState<Record<string, string>>({});
  const [receiptById, setReceiptById] = useState<Record<string, string>>({});

  async function loadDashboard() {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await getRenterDashboard();
      setData(response);
      setProfileDraft({
        firstName: response.profile.firstName || "",
        lastName: response.profile.lastName || "",
        phone: response.profile.phone || "",
        state: response.profile.state || "",
        city: response.profile.city || "",
        address: response.profile.address || "",
        notes: response.profile.notes || ""
      });
      setNin(response.profile.nin || "");
      setBvn(response.profile.bvn || "");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to load renter dashboard");
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const pendingSchedules = useMemo(
    () => data?.linkedCases.flatMap((item) => item.paymentSchedules).filter((schedule) => schedule.status !== "PAID") || [],
    [data]
  );
  const rentScoreWidth = useMemo(
    () => scorePercent(data?.rentScore.summary.score || 0, data?.rentScore.summary.minScore || 0, data?.rentScore.summary.maxScore || 900),
    [data]
  );

  async function saveProfile() {
    try {
      setProfileSaving(true);
      const response = await updateRenterProfile({
        firstName: profileDraft.firstName,
        lastName: profileDraft.lastName,
        phone: profileDraft.phone,
        state: profileDraft.state,
        city: profileDraft.city,
        address: profileDraft.address,
        notes: profileDraft.notes || null
      });
      setData(response);
      toast.success("Profile updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update profile"));
    } finally {
      setProfileSaving(false);
    }
  }

  async function verifyIdentity(type: "NIN" | "BVN") {
    try {
      setIdentitySaving(type);
      const response = await verifyRenterIdentity({
        verificationType: type,
        value: type === "NIN" ? nin : bvn
      });
      setData(response);
      toast.success(`${type} verified`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, `Failed to verify ${type}`));
    } finally {
      setIdentitySaving(null);
    }
  }

  async function confirmPayment(scheduleId: string) {
    try {
      const response = await confirmRenterPayment(scheduleId, {
        receiptReference: receiptById[scheduleId] || undefined,
        note: paymentNoteById[scheduleId] || undefined
      });
      setData(response);
      setReceiptById((current) => ({ ...current, [scheduleId]: "" }));
      setPaymentNoteById((current) => ({ ...current, [scheduleId]: "" }));
      toast.success("Payment confirmed");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to confirm payment"));
    }
  }

  function signOut() {
    clearAuthSession();
    nav("/login", { replace: true });
  }

  if (loading) {
    return <div className="min-h-screen px-6 py-10 text-muted-foreground">Loading renter dashboard...</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_40%,#f8fbff_100%)] px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">We could not load this renter dashboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                {loadError || "Something went wrong while loading your renter record."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void loadDashboard()} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                  Retry
                </Button>
                <Button variant="outline" onClick={signOut}>
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_40%,#f8fbff_100%)] px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Renter dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Your RentSure score, profile, and payment record</h1>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.18),_transparent_34%),linear-gradient(135deg,#ffffff,#f3f8ff_62%,#edf4ff)] p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--rentsure-blue)]">Rent score</p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-6xl font-bold tracking-[-0.04em] text-slate-950">
                  {data.rentScore.summary.score}
                  <span className="ml-2 text-2xl font-medium text-slate-400">/ {data.rentScore.summary.maxScore}</span>
                </div>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  This is the center of your renter dashboard. Every verified detail, payment confirmation, and trust
                  signal should help this score become stronger over time.
                </p>
              </div>
              <div className="rounded-3xl border border-white/80 bg-white/80 px-5 py-4 text-right backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Band</p>
                <Badge className={`mt-2 ${scoreBandBadgeClass(data.rentScore.summary.scoreBand)}`}>
                  {data.rentScore.summary.scoreBand}
                </Badge>
                <p className="mt-2 text-xs text-slate-500">
                  +{data.rentScore.summary.positivePoints} positive · -{data.rentScore.summary.negativePoints} negative
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-[24px] border border-white/80 bg-white/80 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Score movement</span>
                <span>{data.rentScore.summary.minScore} - {data.rentScore.summary.maxScore}</span>
              </div>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f97316_0%,#fbbf24_26%,#84cc16_66%,#16a34a_100%)] transition-all duration-500"
                  style={{ width: `${rentScoreWidth}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>0</span>
                <span>300</span>
                <span>500</span>
                <span>750</span>
                <span>900</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <ScoreAction
                  label="Identity"
                  value={data.profile.ninVerifiedAt || data.profile.bvnVerifiedAt ? "Verified in progress" : "Validate NIN or BVN"}
                />
                <ScoreAction
                  label="Payments"
                  value={pendingSchedules.length ? `${pendingSchedules.length} schedule(s) waiting` : "No pending confirmations"}
                />
                <ScoreAction
                  label="Profile"
                  value={`${data.summary.profileCompletenessPercent}% profile confidence`}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <MiniCard label="Profile completion" value={`${data.summary.profileCompletenessPercent}%`} icon={BadgeCheck} />
            <MiniCard label="Linked rental cases" value={String(data.summary.activeLinkedCases)} icon={Home} />
            <MiniCard label="Pending schedules" value={String(data.summary.pendingSchedules)} icon={CreditCard} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Profile information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" value={profileDraft.firstName} onChange={(value) => setProfileDraft((current) => ({ ...current, firstName: value }))} />
                <Field label="Last name" value={profileDraft.lastName} onChange={(value) => setProfileDraft((current) => ({ ...current, lastName: value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone" value={profileDraft.phone} onChange={(value) => setProfileDraft((current) => ({ ...current, phone: value }))} />
                <Field label="Email" value={data.profile.email} onChange={() => {}} readOnly />
              </div>
              <NigeriaAddressFields
                stateValue={profileDraft.state}
                cityValue={profileDraft.city}
                addressValue={profileDraft.address}
                onStateChange={(value) => setProfileDraft((current) => ({ ...current, state: value }))}
                onCityChange={(value) => setProfileDraft((current) => ({ ...current, city: value }))}
                onAddressChange={(value) => setProfileDraft((current) => ({ ...current, address: value }))}
              />
              <div className="space-y-2">
                <Label>Additional information</Label>
                <Textarea value={profileDraft.notes} onChange={(event) => setProfileDraft((current) => ({ ...current, notes: event.target.value }))} className="bg-white" />
              </div>
              <Button onClick={() => void saveProfile()} disabled={profileSaving} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                {profileSaving ? "Saving..." : "Update profile"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Identity validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <IdentityBlock
                label="NIN"
                value={nin}
                onChange={setNin}
                verifiedAt={data.profile.ninVerifiedAt}
                loading={identitySaving === "NIN"}
                onVerify={() => void verifyIdentity("NIN")}
              />
              <IdentityBlock
                label="BVN"
                value={bvn}
                onChange={setBvn}
                verifiedAt={data.profile.bvnVerifiedAt}
                loading={identitySaving === "BVN"}
                onVerify={() => void verifyIdentity("BVN")}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Confirm payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!pendingSchedules.length ? <p className="text-sm text-muted-foreground">No pending payment schedules linked to your renter record yet.</p> : null}
              {pendingSchedules.map((schedule) => (
                <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{schedule.paymentType.replaceAll("_", " ")}</p>
                      <p className="text-sm text-slate-600">{formatNgn(schedule.amountNgn)} · due {formatDate(schedule.dueDate)}</p>
                      {schedule.note ? <p className="mt-1 text-sm text-slate-600">{schedule.note}</p> : null}
                    </div>
                    <Badge variant="outline">{schedule.status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Receipt reference"
                      value={receiptById[schedule.id] || ""}
                      onChange={(value) => setReceiptById((current) => ({ ...current, [schedule.id]: value }))}
                    />
                    <Field
                      label="Payment note"
                      value={paymentNoteById[schedule.id] || ""}
                      onChange={(value) => setPaymentNoteById((current) => ({ ...current, [schedule.id]: value }))}
                    />
                  </div>
                  <Button className="mt-4" variant="outline" onClick={() => void confirmPayment(schedule.id)}>
                    Confirm payment
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">What is driving your score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.rentScore.breakdown
                .filter((item) => item.appliedOccurrences > 0)
                .slice(0, 8)
                .map((item) => (
                  <div key={item.ruleId} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.appliedOccurrences} applied occurrence(s)</p>
                      </div>
                      <div className={`text-sm font-semibold ${item.contribution >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {item.contribution > 0 ? "+" : ""}{item.contribution}
                      </div>
                    </div>
                  </div>
                ))}
              {!data.rentScore.breakdown.some((item) => item.appliedOccurrences > 0) ? (
                <p className="text-sm text-muted-foreground">Your score will become more informative as you verify identity and confirm more payment activity.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Linked rental cases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!data.linkedCases.length ? <p className="text-sm text-muted-foreground">No landlord or agent case is currently linked to your renter account.</p> : null}
              {data.linkedCases.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{item.property.name}</p>
                      <p className="text-sm text-slate-600">{item.property.address}</p>
                      <p className="text-xs text-muted-foreground">{item.property.city}, {item.property.state}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={decisionBadgeClass(item.decision || item.status)} variant="outline">
                        {item.decision || item.status}
                      </Badge>
                    </div>
                  </div>
                  {item.decisionNote ? <p className="mt-3 text-sm text-slate-600">{item.decisionNote}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-[var(--rentsure-blue)]" />
                Recent score activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.rentScore.recentEvents.length ? <p className="text-sm text-muted-foreground">No score activity has been recorded yet.</p> : null}
              {data.rentScore.recentEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{event.rule.name}</p>
                      <p className="text-sm text-slate-600">{event.sourceNote || "Rent score activity recorded"}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${event.rule.points >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {event.rule.points > 0 ? "+" : ""}{event.rule.points}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ScoreAction({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} className="bg-white" />
    </div>
  );
}

function IdentityBlock({
  label,
  value,
  onChange,
  verifiedAt,
  loading,
  onVerify
}: {
  label: "NIN" | "BVN";
  value: string;
  onChange: (value: string) => void;
  verifiedAt?: string | null;
  loading: boolean;
  onVerify: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{label} verification</p>
          <p className="text-sm text-slate-600">
            {verifiedAt ? `Verified on ${formatDate(verifiedAt)}` : `Enter your ${label} and validate it through RentSure.`}
          </p>
        </div>
        {verifiedAt ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            Verified
          </Badge>
        ) : (
          <Badge variant="outline">
            <FileBadge2 className="mr-1 h-3.5 w-3.5" />
            Pending
          </Badge>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={`Enter ${label}`} className="bg-white" />
        <Button onClick={onVerify} disabled={loading} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
          {loading ? "Verifying..." : `Validate ${label}`}
        </Button>
      </div>
    </div>
  );
}

function MiniCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: typeof BadgeCheck;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-[var(--rentsure-blue)]" />
      </div>
    </div>
  );
}
