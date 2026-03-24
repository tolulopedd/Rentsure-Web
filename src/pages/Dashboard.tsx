import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  Home,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/errors";
import { getStoredUserRole } from "@/lib/roles";
import { getRentScoreConfig, listRenterScores, type RentScoreConfig, type RenterScoreListItem } from "@/lib/rent-score-api";

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function renterDisplayName(item: {
  firstName?: string | null;
  lastName?: string | null;
  organizationName?: string | null;
}) {
  if (item.organizationName) return item.organizationName;
  return [item.firstName, item.lastName].filter(Boolean).join(" ") || "Unnamed renter";
}

export default function Dashboard() {
  const role = getStoredUserRole();
  const isAdmin = role === "ADMIN";
  const userName = localStorage.getItem("userName") || (isAdmin ? "Admin" : "Agent");
  const [config, setConfig] = useState<RentScoreConfig | null>(null);
  const [items, setItems] = useState<RenterScoreListItem[]>([]);
  const [scoreRequestCount, setScoreRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!alive) return;
        if (isAdmin) {
          const [policy, queue] = await Promise.all([getRentScoreConfig(), listRenterScores()]);
          if (!alive) return;
          setConfig(policy);
          setItems(queue.items);
          setScoreRequestCount(queue.summary.scoreRequestCount);
        } else {
          setConfig(null);
          setItems([]);
          setScoreRequestCount(0);
        }
      } catch (loadError: unknown) {
        if (!alive) return;
        setError(getErrorMessage(loadError, "Failed to load dashboard"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const adminMetrics = useMemo(() => {
    if (!isAdmin) return null;
    const totalProfiles = items.length;
    const activeProfiles = items.filter((item) => item.status === "ACTIVE").length;
    const strongProfiles = items.filter((item) => item.score >= 750).length;
    const recentProfiles = items.slice(0, 5);

    return {
      totalProfiles,
      activeProfiles,
      strongProfiles,
      scoreRequestCount,
      recentProfiles,
      activeRules: config?.rules.filter((rule) => rule.isActive).length || 0,
      negativeRules: config?.rules.filter((rule) => rule.points < 0).length || 0
    };
  }, [config, isAdmin, items, scoreRequestCount]);

  if (loading) {
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <p className="font-semibold">Dashboard unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isAdmin && adminMetrics) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Operations dashboard</h1>
            <p className="mt-2 text-muted-foreground">
              Monitor renter intake, live score quality, and policy readiness across RentSure.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
              <Link to="/app/renters">
                Review renter queue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/rent-score">Adjust score rules</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Renter profiles" value={String(adminMetrics.totalProfiles)} icon={Users} tone="blue" />
          <MetricCard label="Active profiles" value={String(adminMetrics.activeProfiles)} icon={ShieldCheck} tone="emerald" />
          <MetricCard label="Rent score requests" value={String(adminMetrics.scoreRequestCount)} icon={ClipboardCheck} tone="amber" />
          <MetricCard label="Strong score band" value={String(adminMetrics.strongProfiles)} icon={Sparkles} tone="slate" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Latest renter profiles</CardTitle>
              <Badge className="border border-[var(--rentsure-blue-soft)] bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]">
                Live queue
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {!adminMetrics.recentProfiles.length ? (
                <p className="text-sm text-muted-foreground">No renter profiles have been created yet.</p>
              ) : null}

              {adminMetrics.recentProfiles.map((item) => (
                <div key={item.accountId} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{renterDisplayName(item)}</p>
                      <p className="text-sm text-muted-foreground">{item.email}</p>
                      <p className="text-xs text-muted-foreground">Joined {formatDate(item.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{item.status}</Badge>
                      <div className="text-right">
                        <p className="text-xl font-semibold tracking-tight text-slate-950">
                          {item.score}
                          <span className="ml-1 text-sm font-medium text-muted-foreground">/ 900</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{item.scoreBand}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Policy health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Active policy</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{config?.name || "Rent score policy"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{config?.description || "Default rule-based scoring model for renters."}</p>
              </div>
              <p><span className="font-medium text-slate-950">Score range:</span> {config?.minScore ?? 0} to {config?.maxScore ?? 900}</p>
              <p><span className="font-medium text-slate-950">Active rules:</span> {adminMetrics.activeRules}</p>
              <p><span className="font-medium text-slate-950">Negative controls:</span> {adminMetrics.negativeRules}</p>
              <p><span className="font-medium text-slate-950">Last update:</span> {formatDate(config?.updatedAt)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.15),_transparent_35%),linear-gradient(135deg,#ffffff,#f8fbff_58%,#eef5ff)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">
              Agent dashboard
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Welcome back, {userName}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your job here is to help good renters present complete, credible profiles before a landlord or admin
              reviewer makes the final decision. This workspace keeps the handoff clean and consistent.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[460px]">
            <AgentMiniStat label="Role" value="Agent" />
            <AgentMiniStat label="Market" value="Nigeria" />
            <AgentMiniStat label="Rent score" value="0 - 900" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Role" value="Agent" icon={Users} tone="blue" />
        <MetricCard label="Product focus" value="Renter intake" icon={FolderKanban} tone="slate" />
        <MetricCard label="Score model" value="0 - 900" icon={Scale} tone="amber" />
        <MetricCard label="Decision path" value="Admin handoff" icon={ShieldCheck} tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Agent playbook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agentWorkflow.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-[var(--rentsure-blue-soft)] p-3 text-[var(--rentsure-blue)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                          {item.step}
                        </span>
                        <p className="font-semibold text-slate-950">{item.title}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Escalate to admin when</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {escalationTriggers.map((item) => (
              <div key={item.title} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Documents to collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documentChecklist.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <FileCheck2 className="mt-0.5 h-4 w-4 text-[var(--rentsure-blue)]" />
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Score guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scoreBands.map((band) => (
              <div key={band.range} className={`rounded-2xl border p-4 ${band.classes}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{band.label}</p>
                  <p className="text-sm font-medium">{band.range}</p>
                </div>
                <p className="mt-2 text-sm leading-6 opacity-90">{band.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Working notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">What a strong handoff looks like</p>
              <p className="mt-2 leading-6">
                The renter has complete identity details, a traceable address, salary or business evidence, and enough
                supporting context for admin to apply the rule engine without guessing.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-950">What to avoid</p>
              <ul className="mt-2 space-y-2 leading-6 text-slate-600">
                <li>Missing addresses or unverified phone numbers</li>
                <li>Unclear employer or income evidence</li>
                <li>Notes that say "verified" without stating what was checked</li>
                <li>Submitting a profile before key documents are attached</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const agentWorkflow = [
  {
    step: "1",
    title: "Confirm account type",
    description:
      "Make sure the person is signing up on the right path: renter, landlord, or agent. For renters, confirm whether the profile is individual or company before you collect supporting details.",
    icon: BadgeCheck
  },
  {
    step: "2",
    title: "Capture identity and contact details",
    description:
      "Check that full name or company name, email, phone number, state, city or town, and address are all complete and consistent with submitted evidence.",
    icon: ClipboardCheck
  },
  {
    step: "3",
    title: "Collect evidence that strengthens trust",
    description:
      "Encourage renters to add work evidence, proof of rent payments, utility consistency, and any spouse income support that can improve the final rent score.",
    icon: BriefcaseBusiness
  },
  {
    step: "4",
    title: "Prepare a clean decision handoff",
    description:
      "Your handoff should help admin and property decision-makers move quickly. Flag anything unusual early so the profile is not delayed later in the process.",
    icon: Home
  }
] as const;

const escalationTriggers = [
  {
    title: "Identity or address details conflict",
    description: "Escalate if the submitted name, city, address, or company details do not match the evidence the renter provided."
  },
  {
    title: "Income evidence looks incomplete",
    description: "Escalate when salary documents, business records, or spouse-income support are missing, inconsistent, or too weak to support a confident score."
  },
  {
    title: "Prior tenancy signals are concerning",
    description: "Escalate immediately if there are signs of missed annual rent, utility problems, or reported misuse of property."
  }
] as const;

const documentChecklist = [
  {
    label: "Valid identity trail",
    description: "Government-backed identity details that match the signup profile and can support BVN or SIN verification later."
  },
  {
    label: "Evidence of work",
    description: "Payslip, employment letter, or other acceptable work document for individuals, or business registration and income evidence for companies."
  },
  {
    label: "Rent and utility history",
    description: "Any traceable history showing on-time rent behavior, utility payment consistency, and address stability."
  }
] as const;

const scoreBands = [
  {
    label: "High confidence",
    range: "750 - 900",
    description: "Likely strong renter profile with good supporting information and healthy trust signals.",
    classes: "border-emerald-100 bg-emerald-50 text-emerald-700"
  },
  {
    label: "Reviewable",
    range: "500 - 749",
    description: "Generally usable profile, but admin may still need to confirm missing details or inconsistencies.",
    classes: "border-lime-100 bg-lime-50 text-lime-700"
  },
  {
    label: "Caution",
    range: "300 - 499",
    description: "More review is needed before this renter should move forward with confidence.",
    classes: "border-amber-100 bg-amber-50 text-amber-700"
  },
  {
    label: "High risk",
    range: "0 - 299",
    description: "Profile likely contains weak evidence or negative history that needs close attention before any approval.",
    classes: "border-rose-100 bg-rose-50 text-rose-700"
  }
] as const;

function AgentMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  icon: typeof Users;
  tone: "blue" | "emerald" | "amber" | "slate";
}) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  } as const;

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] opacity-80">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <Icon className="h-5 w-5 opacity-90" />
      </div>
    </div>
  );
}
