import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Database, FileText, Lock, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageSeo } from "@/lib/usePageSeo";

const policySections: Array<{
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  points: string[];
}> = [
  {
    id: "terms-and-conditions",
    title: "Terms & Conditions",
    summary: "How the platform should be used.",
    icon: FileText,
    points: [
      "RentSure is a rental trust platform for tenants, landlords, and agents.",
      "Users must provide accurate identity, payment, tenancy, and contact information.",
      "Accounts may be reviewed, restricted, or suspended where information appears false or abusive."
    ]
  },
  {
    id: "data-policy",
    title: "Data policy",
    summary: "What data we collect and why.",
    icon: Database,
    points: [
      "We may collect profile, identity, rental history, payment evidence, affordability details, and platform activity.",
      "This data supports verification, rent score services, fraud prevention, support, and operational records.",
      "Access is limited to authorized teams, approved providers, and permitted rental workflows."
    ]
  },
  {
    id: "privacy-and-security",
    title: "Privacy & security",
    summary: "How information is protected.",
    icon: Lock,
    points: [
      "RentSure applies reasonable safeguards to reduce unauthorized access, loss, or misuse.",
      "Sensitive records are handled with controlled access and reviewed processes.",
      "Users should protect their login details and report suspicious activity promptly."
    ]
  },
  {
    id: "sharing-and-transparency",
    title: "Sharing & transparency",
    summary: "When information may be shared.",
    icon: ShieldCheck,
    points: [
      "Relevant score outputs or verification results may be shared within a permitted rental process.",
      "Policy updates may be posted on this page and surfaced through platform notices where needed.",
      "Questions about policy handling can be sent to info@rentsureng.com."
    ]
  }
];

export default function PoliciesPage() {
  usePageSeo({
    title: "RentSure | Policy Details",
    description: "Review RentSure policy details for terms, data use, privacy, and sharing.",
    canonicalPath: "/policies"
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f9fbff_0%,#ffffff_42%,#f4f7ff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] overflow-hidden">
        <div className="absolute left-[10%] top-10 h-56 w-56 rounded-full bg-[var(--rentsure-blue)]/10 blur-3xl" />
        <div className="absolute right-[10%] top-8 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />
      </div>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="shrink-0">
          <BrandLogo size="sm" showTagline />
        </Link>

        <Button asChild variant="ghost" className="text-slate-700 hover:bg-white/75 hover:text-slate-950">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 pb-24 pt-6 lg:px-10">
        <section className="rounded-[2rem] border border-white/80 bg-white/88 px-6 py-8 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.24)] lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--rentsure-blue)]">Policies</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                Policy details
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Review our terms, data, privacy, and sharing policies.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {policySections.map((section) => {
                const Icon = section.icon;
                return (
                  <a
                    key={section.id}
                    className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/90 p-4 transition hover:-translate-y-0.5 hover:border-[var(--rentsure-blue)]/25 hover:bg-white"
                    href={`#${section.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4 text-base font-semibold text-slate-950">{section.title}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{section.summary}</p>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4">
          {policySections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                id={section.id}
                key={section.id}
                className="scroll-mt-24 rounded-[1.6rem] border border-slate-200/80 bg-white/94 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)]"
              >
                <CardContent className="p-6 lg:p-7">
                  <div className="grid gap-5 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
                    <div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{section.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{section.summary}</p>
                    </div>

                    <div className="grid gap-3">
                      {section.points.map((point) => (
                        <div key={point} className="rounded-[1rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                          <p className="text-sm leading-6 text-slate-700">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}
