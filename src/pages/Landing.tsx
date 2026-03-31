import { useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CircleCheckBig,
  Clock3,
  CreditCard,
  ShieldCheck,
  Users
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageSeo } from "@/lib/usePageSeo";

const audienceCards: Array<{
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
  accent: string;
}> = [
  {
    title: "For tenants",
    description: "Build a trusted rental profile and trust score before you step into a viewing or engaging with agents or landlord.",
    bullets: [
      "Show a clear 0-900 rent score grade backed by your behavior and rent history.",
      "Reduce friction during screening and negotiations.",
      "Keep records, reminders, and rent proof in one place."
    ],
    icon: Users,
    accent: "from-sky-500 to-cyan-400"
  },
  {
    title: "For landlords and agents",
    description: "Make faster rental decisions with better confidence and less manual and unrealistic metrics.",
    bullets: [
      "See whether a tenant is likely to pay consistently.",
      "Review history and trust indicators at a glance.",
      "Cut vacancy risk without compromising good judgement."
    ],
    icon: Building2,
    accent: "from-blue-600 to-sky-500"
  }
];

const scoreSignals: Array<{ label: string; value: string; description: string; icon: LucideIcon }> = [
  {
    label: "On-time rent history",
    value: "11 of 12 months",
    description: "Presented clearly so strong rent applicants stand out and risky renters are easier to be flagged.",
    icon: CircleCheckBig
  },
  {
    label: "Identity verification",
    value: "ID and income verified",
    description: "Presented clearly the real identity of renters and renters with fake information are easier to detect.",
    icon: ShieldCheck
  },
  {
    label: "Affordability",
    value: "3.4x rent coverage",
    description: "Presented clearly to show when renter income and obligations can support the asking rent.",
    icon: CreditCard
  },
  {
    label: "Address stability",
    value: "24 months at current address",
    description: "Presented clearly to show how consistent a renter has been over time and across verified records.",
    icon: Clock3
  }
];

const adaDemoFacts = [
  { label: "Yearly rent", value: "₦1,250,000" },
  { label: "Completed leases", value: "2" }
];

const scoreSteps = [
  {
    title: "Connect your rental profile",
    description: "Tenants add identity, payment records, and other supporting information."
  },
  {
    title: "Receive a clear 0-900 rent score",
    description: "RentSure turns all datapoints of renters into a simple 300-900 trust score that is easy to understand."
  },
  {
    title: "Decide with comfort",
    description: "Owners and agents review the score, request for any additional information, and take a decision within 24 hours."
  }
];

const trustStats = [
  { value: "2-sided", label: "Experience for both tenants and property teams" },
  { value: "< 2 min", label: "Fast onboarding for first-time applicants" },
  { value: "1 view", label: "Unified rent score for all renters in Nigeria." }
];

const SCORE_MIN = 0;
const SCORE_MAX = 900;

function getScoreProgress(score: number) {
  return ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
}

function getScoreTheme(score: number) {
  if (score <= 300) {
    return {
      accent: "#ef4444",
      soft: "rgba(239, 68, 68, 0.16)",
      border: "rgba(239, 68, 68, 0.34)"
    };
  }

  if (score <= 500) {
    return {
      accent: "#f59e0b",
      soft: "rgba(245, 158, 11, 0.16)",
      border: "rgba(245, 158, 11, 0.34)"
    };
  }

  if (score <= 750) {
    return {
      accent: "#84cc16",
      soft: "rgba(132, 204, 22, 0.16)",
      border: "rgba(132, 204, 22, 0.34)"
    };
  }

  return {
    accent: "#10b981",
    soft: "rgba(16, 185, 129, 0.16)",
    border: "rgba(16, 185, 129, 0.34)"
  };
}

function HeroScoreHighlight() {
  return (
    <span className="group mx-1.5 inline-flex max-w-full align-middle whitespace-nowrap">
      <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-[1.15rem] border border-[var(--rentsure-blue)]/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(238,240,255,0.96))] px-3 py-1.5 shadow-[0_14px_34px_-22px_rgba(18,0,255,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300/70 hover:shadow-[0_22px_48px_-24px_rgba(245,158,11,0.35)]">
        <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(254,243,199,0.9))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <span className="relative text-[0.48em] font-black leading-none tracking-[-0.06em] text-[var(--rentsure-blue)] transition-colors duration-300 group-hover:text-blue-700">
          RENT SCORE
        </span>

        <span className="relative flex items-end gap-1 self-end pb-0.5">
          <span className="h-2.5 w-1.5 rounded-full bg-blue-500 transition-all duration-300 group-hover:h-3.5 group-hover:bg-amber-300" />
          <span className="delay-75 h-4 w-1.5 rounded-full bg-[var(--rentsure-blue)] transition-all duration-300 group-hover:h-5 group-hover:bg-amber-400" />
          <span className="delay-150 h-5.5 w-1.5 rounded-full bg-blue-800 transition-all duration-300 group-hover:h-6.5 group-hover:bg-amber-500" />
        </span>

        <span className="relative hidden min-w-[5.8rem] items-center justify-center overflow-hidden rounded-full bg-emerald-500 px-2 py-1 text-[0.27em] font-semibold leading-none text-white transition-all duration-300 sm:inline-flex group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-amber-500">
          <span className="relative block h-[1em] w-[4rem] overflow-hidden">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap transition-all duration-300 group-hover:-translate-x-1/2 group-hover:-translate-y-[1.05em]">
              <span>850</span>
              <span className="ml-1 text-[0.8em] font-medium text-white/75">/ 900</span>
            </span>
            <span className="absolute left-1/2 top-[1.05em] -translate-x-1/2 whitespace-nowrap transition-all duration-300 group-hover:-translate-x-1/2 group-hover:-translate-y-[1.05em]">
              <span>350</span>
              <span className="ml-1 text-[0.8em] font-medium text-white/75">/ 900</span>
            </span>
          </span>
          <ArrowUpRight className="ml-1 h-3 w-3 transition-transform duration-300 group-hover:rotate-90 group-hover:translate-y-0.5" />
        </span>
      </span>
    </span>
  );
}

export default function Landing() {
  const [demoScore, setDemoScore] = useState(850);
  const demoScoreProgress = getScoreProgress(demoScore);
  const demoScoreTheme = getScoreTheme(demoScore);

  usePageSeo({
    title: "RentSure | Rent Score for Tenants, Confidence for Property Owners",
    description:
      "RentSure helps tenants prove reliability and gives landlords and agents a 300-900 rent score to make more confident rental decisions.",
    canonicalPath: "/"
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#fafcff_0%,#fdfdff_26%,#ffffff_62%,#f6f7ff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] overflow-hidden">
        <div className="absolute left-[8%] top-16 h-72 w-72 rounded-full bg-[var(--rentsure-blue)]/12 blur-3xl" />
        <div className="absolute right-[10%] top-8 h-96 w-96 rounded-full bg-[var(--rentsure-blue)]/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--rentsure-blue)]/35 to-transparent" />
      </div>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="shrink-0">
          <BrandLogo size="sm" showTagline />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
          <a href="#value">Value</a>
          <a href="#how-it-works">How it works</a>
          <a href="#score">Rent score</a>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="text-slate-700 hover:bg-white/70 hover:text-slate-950">
            <Link to="/login">Sign in</Link>
          </Button>
            <Button
              asChild
              className="rounded-full bg-[var(--rentsure-blue)] px-5 text-white shadow-lg shadow-[rgba(18,0,255,0.2)] hover:bg-[var(--rentsure-blue-deep)] focus-visible:ring-[var(--rentsure-blue)]"
            >
              <Link to="/signup">Get started</Link>
            </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-16 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-28 lg:pt-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--rentsure-blue)]/12 bg-white/90 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[var(--rentsure-blue)] shadow-sm backdrop-blur">
              <span className="flex flex-col items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--rentsure-blue)]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--rentsure-blue)]/55" />
              </span>
              Comfort before rent commitment
            </div>

            <h1 className="mt-8 max-w-4xl text-4xl font-semibold leading-[1.06] tracking-[-0.04em] text-slate-950 md:text-5xl lg:text-[3.6rem]">
              We offer a <HeroScoreHighlight /> that helps good tenants stand out and helps owners say yes with
              confidence.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
              RentSure brings tenants, landlords, and property agents into one decision point. Tenants build trust
              before applying. Property owners see whether a renter is worth handing over the keys.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[var(--rentsure-blue)] px-7 text-base text-white shadow-xl shadow-[rgba(18,0,255,0.2)] hover:bg-[var(--rentsure-blue-deep)] focus-visible:ring-[var(--rentsure-blue)]"
              >
                <Link to="/signup">
                  Launch RentSure
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-slate-200 bg-white/80 px-7 text-base text-slate-800 hover:bg-slate-50 hover:text-slate-950"
              >
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>

            <div className="mt-12 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              {trustStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{item.value}</div>
                  <div className="mt-1 leading-6">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-10 h-48 w-48 rounded-full bg-[var(--rentsure-blue)]/12 blur-3xl" />
            <Card className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_30px_80px_-35px_rgba(18,0,255,0.22)] backdrop-blur">
              <CardContent className="p-0">
                <div className="border-b border-slate-100 px-7 py-6">
                  <div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">Tenant trust snapshot</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Ada Nwosu</div>
                      <div className="mt-2 text-sm leading-6 text-slate-500">Pre-rental view for landlords and letting agents.</div>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] xl:items-start">
                    <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
                      <div className="text-xs uppercase tracking-[0.26em] text-blue-200">Rent score demo</div>
                      <div className="mt-4 flex items-end gap-2">
                        <span
                          className="w-[5.5rem] text-5xl font-semibold tracking-[-0.05em] tabular-nums transition-colors duration-300 md:text-[3.25rem]"
                          style={{ color: demoScoreTheme.accent }}
                        >
                          {demoScore}
                        </span>
                        <span className="pb-2 text-sm text-slate-300">/ 900</span>
                      </div>
                      <div className="mt-5 h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${demoScoreProgress}%`,
                            background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 38%, #84cc16 72%, #10b981 100%)"
                          }}
                        />
                      </div>
                      <input
                        aria-label="Rent score demo slider"
                        className="mt-4 w-full cursor-pointer"
                        max={SCORE_MAX}
                        min={SCORE_MIN}
                        onChange={(event) => setDemoScore(Number(event.target.value))}
                        step={10}
                        style={{ accentColor: demoScoreTheme.accent }}
                        type="range"
                        value={demoScore}
                      />
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>0</span>
                        <span>300</span>
                        <span>500</span>
                        <span className="text-slate-500">750</span>
                        <span>900</span>
                      </div>
                      <div className="mt-4 text-sm leading-6 text-slate-300">
                        Ada Nwosu&apos;s profile shows verified identity, stable affordability, and a mostly on-time rent record.
                      </div>
                      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                        {adaDemoFacts.map((fact) => (
                          <div
                            key={fact.label}
                            className="grid gap-1.5 rounded-[1rem] border border-white/10 bg-white/5 px-3 py-3"
                          >
                            <div className="min-w-0 text-[11px] uppercase tracking-[0.16em] text-slate-400">{fact.label}</div>
                            <div className="min-w-0 text-sm font-semibold text-white">{fact.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {scoreSignals.map((signal) => {
                        const Icon = signal.icon;
                        return (
                          <div
                            key={signal.label}
                            className="grid grid-cols-[auto_1fr] gap-x-3 rounded-[1.35rem] border border-slate-100 bg-slate-50/80 px-4 py-4"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--rentsure-blue)] shadow-sm">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium leading-5 text-slate-900">{signal.label}</div>
                              <div className="mt-1 text-sm font-semibold leading-5 text-slate-700">{signal.value}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 bg-[linear-gradient(180deg,rgba(248,250,252,0.6),rgba(239,240,255,0.9))] px-7 py-6 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <BadgeCheck className="h-4 w-4 text-[var(--rentsure-blue)]" />
                      For tenants
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Turn payment consistency into a profile that makes applications feel less uncertain.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/70 bg-slate-950 p-5 text-white">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4 text-blue-300" />
                      For owners & agents
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Review rental readiness at a glance instead of relying only on instinct and paperwork.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="value" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-10 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-2">
            {audienceCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="group rounded-[2rem] border border-slate-200/80 bg-white/85 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <CardContent className="p-8">
                    <div className={`inline-flex rounded-2xl bg-gradient-to-br p-3 text-white ${item.accent}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{item.title}</h2>
                    <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">{item.description}</p>
                    <div className="mt-8 space-y-4">
                      {item.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-start gap-3">
                      <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]">
                        <CircleCheckBig className="h-4 w-4" />
                      </div>
                          <p className="text-sm leading-6 text-slate-700">{bullet}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">How it works</div>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                A simple trust layer for every rental decision.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                RentSure replaces the traditional decisions of landlords with one clean flow that helps both sides move
                faster without feeling exposed. We have access to 99% of renters information in Nigeria.
              </p>
            </div>

            <div className="grid gap-5">
              {scoreSteps.map((step, index) => (
                <Card key={step.title} className="rounded-[1.75rem] border border-slate-200/80 bg-white/90">
                  <CardContent className="flex gap-5 p-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--rentsure-blue)] text-base font-semibold text-white shadow-lg shadow-[rgba(18,0,255,0.2)]">
                      0{index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="score" className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-10">
          <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 px-8 py-10 text-white shadow-[0_30px_120px_-45px_rgba(2,6,23,0.65)] lg:px-10 lg:py-12">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">0-900 rent score technology</div>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                  Built to answer the question every owner asks: can I trust this tenant?
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
                  The score is only useful if it makes decisions clearer. RentSure combines rental behavior, profile
                  information, other aggregated information and consistency signals into a 0-900 format that both
                  tenants and property teams can understand.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {scoreSignals.map((signal) => {
                  const Icon = signal.icon;
                  return (
                    <div key={signal.label} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--rentsure-blue)]/20 text-blue-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="mt-4 text-lg font-semibold">{signal.label}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">
                        {signal.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-10">
          <div className="rounded-[2rem] border border-[var(--rentsure-blue)]/10 bg-[linear-gradient(135deg,#ffffff_0%,#f6f7ff_55%,#e9ebff_100%)] px-8 py-10 shadow-[0_20px_60px_-40px_rgba(18,0,255,0.25)] lg:flex lg:items-center lg:justify-between lg:px-10">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--rentsure-blue)]">New Innovation for Africa</div>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                A rental decision experience starts here.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                RentSure is positioned to help tenants look credible earlier and help owners or agents move with less
                uncertainty. The next step is enabling payments and managing the renter-landlord relationship directly
                on the platform.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row lg:mt-0">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[var(--rentsure-blue)] px-7 text-base text-white shadow-lg shadow-[rgba(18,0,255,0.2)] hover:bg-[var(--rentsure-blue-deep)] focus-visible:ring-[var(--rentsure-blue)]"
              >
                <Link to="/login">Open dashboard</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-slate-300 bg-white/80 px-7 text-base text-slate-900 hover:bg-white"
              >
                <a href="#value">Review value proposition</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
