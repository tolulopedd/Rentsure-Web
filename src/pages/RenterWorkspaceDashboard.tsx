import { ArrowRight, BadgeCheck, CreditCard, Home, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import { getRenterOnboarding } from "@/lib/onboarding";
import {
  decisionBadgeClass,
  formatDate,
  rentScoreBandLabel,
  scoreBandBadgeClass
} from "@/lib/renter-workspace-presenters";

export default function RenterWorkspaceDashboard() {
  const { data, pendingSchedules, rentScoreWidth } = useRenterWorkspace();

  if (!data) return null;

  const onboarding = getRenterOnboarding(data.profile);
  return (
    <div className="space-y-4 md:space-y-6">
      {!onboarding.isComplete ? (
        <Card className="border-[var(--rentsure-blue-soft)] bg-[linear-gradient(135deg,#ffffff,#f5f8ff)] shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Onboarding</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">Complete your renter setup</p>
              <p className="mt-1 text-sm text-slate-600">
                {onboarding.completedCount} of {onboarding.totalCount} setup steps completed.
                {onboarding.nextStep ? ` Next: ${onboarding.nextStep.title}.` : ""}
              </p>
            </div>
            <Button asChild className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
              <Link to={onboarding.nextStep?.href || "/account/renter/profile"}>
                {onboarding.nextStep?.actionLabel || "Finish setup"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.95fr] xl:gap-6">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.18),_transparent_34%),linear-gradient(135deg,#ffffff,#f3f8ff_62%,#edf4ff)] p-4 shadow-sm md:rounded-[30px] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--rentsure-blue)]">Dashboard</p>
          </div>
          <div className="mt-3 flex flex-col gap-3 lg:mt-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl md:text-3xl">Your current rent score</h1>
              <div className="mt-3 flex flex-wrap items-end gap-3 md:mt-4">
                <div className="text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl md:text-6xl">
                  {data.rentScore.summary.score}
                  <span className="ml-2 text-xl font-medium text-slate-400 sm:text-2xl">/ {data.rentScore.summary.maxScore}</span>
                </div>
                <Badge className={`sm:hidden ${scoreBandBadgeClass(data.rentScore.summary.scoreBand)}`}>
                  {rentScoreBandLabel(data.rentScore.summary.scoreBand)}
                </Badge>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                To improve your score; verified identity, payment confirmations, and update your profile. These should keep moving your score in the right direction.
              </p>
            </div>
            <div className="hidden self-start rounded-3xl border border-white/80 bg-white/80 px-4 py-3 text-left backdrop-blur sm:block sm:px-5 sm:py-4 sm:text-right">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Band</p>
              <Badge className={`mt-2 ${scoreBandBadgeClass(data.rentScore.summary.scoreBand)}`}>
                {rentScoreBandLabel(data.rentScore.summary.scoreBand)}
              </Badge>
            </div>
          </div>
          <div className="mt-4 rounded-[20px] border border-white/80 bg-white/80 p-3 backdrop-blur sm:p-4 md:mt-6 md:rounded-[24px]">
            <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span>Score movement</span>
              <span>
                {data.rentScore.summary.minScore} - {data.rentScore.summary.maxScore}
              </span>
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
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <ScoreAction
                label="Identity"
                value={data.profile.ninVerifiedAt || data.profile.bvnVerifiedAt ? "Verified in progress" : "Validate NIN or BVN"}
              />
              <ScoreAction
                label="Payments"
                value={pendingSchedules.length ? `${pendingSchedules.length} schedule(s) waiting` : "No pending confirmations"}
              />
              <ScoreAction label="Profile" value={`${data.summary.profileCompletenessPercent}% profile confidence`} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
              <Button asChild variant="outline" className="w-full xl:w-auto">
                <Link to="/account/renter/payments">Confirm payments</Link>
              </Button>
              <Button asChild className="w-full bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)] xl:w-auto">
                <Link to="/account/renter/buy-score">Your rent score</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-1 xl:gap-4">
          <MiniCard label="Profile completion" value={`${data.summary.profileCompletenessPercent}%`} icon={BadgeCheck} />
          <MiniCard label="Linked rental properties" value={String(data.summary.activeLinkedCases)} icon={Home} />
          <MiniCard label="Pending payment schedules" value={String(data.summary.pendingSchedules)} icon={CreditCard} />
          <MiniCard label="Unread notifications" value={String(data.summary.unreadNotifications)} icon={Sparkles} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">What is driving your score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.rentScore.breakdown
              .filter((item) => item.appliedOccurrences > 0)
              .slice(0, 8)
              .map((item) => (
                <div key={item.ruleId} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.appliedOccurrences} applied occurrence(s)</p>
                    </div>
                    <div className={`text-sm font-semibold ${item.contribution >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {item.contribution > 0 ? "+" : ""}
                      {item.contribution}
                    </div>
                  </div>
                </div>
              ))}
            {!data.rentScore.breakdown.some((item) => item.appliedOccurrences > 0) ? (
              <p className="text-sm text-muted-foreground">
                Your score becomes more informative as you verify identity and confirm more payment activity.
              </p>
            ) : null}
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
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{event.rule.name}</p>
                    <p className="text-sm text-slate-600">{event.sourceNote || "Rent score activity recorded"}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${event.rule.points >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {event.rule.points > 0 ? "+" : ""}
                      {event.rule.points}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Linked rental properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data.linkedCases.length ? <p className="text-sm text-muted-foreground">No landlord or agent property is currently linked to your renter account.</p> : null}
            {data.linkedCases.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{item.property.name}</p>
                    <p className="text-sm text-slate-600">{item.property.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.property.city}, {item.property.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={decisionBadgeClass(item.decision || item.status)} variant="outline">
                      {item.decision || item.status}
                    </Badge>
                  </div>
                </div>
                {item.decisionNote ? <p className="mt-3 text-sm text-slate-600">{item.decisionNote}</p> : null}
                <Button asChild variant="ghost" size="sm" className="mt-3 px-0 text-[var(--rentsure-blue)] hover:bg-transparent">
                  <Link to="/account/renter/queue">
                    Landlord decision
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent shares</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data.shareHistory.length ? <p className="text-sm text-muted-foreground">You have not shared your rent score report yet.</p> : null}
            {data.shareHistory.slice(0, 5).map((share) => (
              <div key={share.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{share.recipientName || share.recipientEmail}</p>
                    <p className="text-sm text-slate-600">{share.recipientType.toLowerCase()} · {share.recipientEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      {share.score}
                      <span className="ml-1 text-xs font-medium text-slate-400">/ {share.maxScore}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(share.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Badge className={scoreBandBadgeClass(share.scoreBand)}>{rentScoreBandLabel(share.scoreBand)}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScoreAction({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 md:px-4 md:py-3">
      <div className="flex items-start justify-between gap-3 md:block">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="text-right text-sm font-medium text-slate-900 md:mt-1 md:text-left">{value}</p>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-[var(--rentsure-blue)]" />
      </div>
    </div>
  );
}
