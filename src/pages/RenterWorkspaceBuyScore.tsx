import { Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import { rentScoreGuidance, rentScoreBandLabel, scoreBandBadgeClass } from "@/lib/renter-workspace-presenters";

export default function RenterWorkspaceBuyScore() {
  const { data } = useRenterWorkspace();

  if (!data) return null;

  const workspaceData = data;
  const guidance = rentScoreGuidance(workspaceData.rentScore.summary.score);

  function downloadCurrentSnapshot() {
    const renterDisplayName =
      workspaceData.profile.organizationName || `${workspaceData.profile.firstName} ${workspaceData.profile.lastName}`.trim();
    const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>RentSure Rent Score</title></head>
  <body style="font-family: Arial, sans-serif; margin: 32px; color: #0f172a;">
    <h1>RentSure Rent Score</h1>
    <p>${renterDisplayName}</p>
    <p><strong>Score:</strong> ${workspaceData.rentScore.summary.score} / ${workspaceData.rentScore.summary.maxScore}</p>
    <p><strong>Band:</strong> ${rentScoreBandLabel(workspaceData.rentScore.summary.scoreBand)}</p>
    <p><strong>Email:</strong> ${workspaceData.profile.email}</p>
    <p><strong>Phone:</strong> ${workspaceData.profile.phone}</p>
    <p><strong>Address:</strong> ${workspaceData.profile.address}, ${workspaceData.profile.city}, ${workspaceData.profile.state}</p>
  </body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rentsure-rent-score.html";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.16),_transparent_34%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">Your rent score</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">View your current rent score</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This page shows your current renter score, your current band, and a simple summary you can download or share when needed.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Current score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Rent score</p>
              <p className="mt-3 text-5xl font-bold tracking-[-0.04em] text-slate-950">
                {data.rentScore.summary.score}
                <span className="ml-2 text-xl font-medium text-slate-400">/ {data.rentScore.summary.maxScore}</span>
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Badge className={scoreBandBadgeClass(data.rentScore.summary.scoreBand)}>
                  {rentScoreBandLabel(workspaceData.rentScore.summary.scoreBand)}
                </Badge>
                <p className="text-sm text-slate-500">{workspaceData.summary.profileCompletenessPercent}% profile confidence</p>
              </div>
            </div>

            <div className={`rounded-2xl border p-4 text-sm ${guidance.tone}`}>
              <p className="font-semibold">{guidance.title}</p>
              <p className="mt-2 leading-6">{guidance.message}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                <Link to="/account/renter/share-score">Share score</Link>
              </Button>
              <Button variant="outline" onClick={downloadCurrentSnapshot}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Score summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Positive points</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">+{workspaceData.rentScore.summary.positivePoints}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Negative points</p>
              <p className="mt-2 text-2xl font-semibold text-rose-700">{workspaceData.rentScore.summary.negativePoints}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Recent score events</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{workspaceData.rentScore.recentEvents.length}</p>
            </div>
            <p className="text-sm text-slate-600">
              Your rent score improves as your identity, profile, payment records, landlord references, and related rental history become stronger.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
