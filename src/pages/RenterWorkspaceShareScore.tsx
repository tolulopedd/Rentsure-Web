import { useMemo, useState } from "react";
import { Download, Mail, Search, Send, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import { formatDate, rentScoreGuidance, scoreBandBadgeClass } from "@/lib/renter-workspace-presenters";
import { getErrorMessage } from "@/lib/errors";
import { searchRenterShareRecipients, type ShareRecipientSearchResult } from "@/lib/renter-api";
import { toast } from "sonner";

type ShareDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note: string;
};

const emptyDraft: ShareDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  note: ""
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function RenterWorkspaceShareScore() {
  const { data, shareScoreReport } = useRenterWorkspace();
  const [recipientType, setRecipientType] = useState<"LANDLORD" | "AGENT">("LANDLORD");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ShareRecipientSearchResult[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<ShareRecipientSearchResult | null>(null);
  const [draft, setDraft] = useState<ShareDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);

  const reportHtml = useMemo(() => {
    if (!data) return "";
    const renterDisplayName = data.profile.organizationName || `${data.profile.firstName} ${data.profile.lastName}`.trim();
    const breakdown = data.rentScore.breakdown
      .filter((item) => item.appliedOccurrences > 0)
      .slice(0, 8)
      .map(
        (item) =>
          `<li><strong>${escapeHtml(item.name)}</strong> - ${item.contribution > 0 ? "+" : ""}${item.contribution} (${item.appliedOccurrences} occurrence(s))</li>`
      )
      .join("");

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>RentSure Rent Score Report</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 32px; color: #0f172a;">
    <h1 style="margin-bottom: 4px;">RentSure Rent Score Report</h1>
    <p style="margin-top: 0; color: #475569;">Generated for ${escapeHtml(renterDisplayName)} on ${escapeHtml(new Date().toLocaleDateString())}</p>
    <h2>Score</h2>
    <p style="font-size: 24px; font-weight: bold;">${data.rentScore.summary.score} / ${data.rentScore.summary.maxScore}</p>
    <p>Band: ${escapeHtml(data.rentScore.summary.scoreBand)}</p>
    <h2>Profile</h2>
    <p>${escapeHtml(data.profile.email)}<br />${escapeHtml(data.profile.phone)}<br />${escapeHtml(data.profile.address)}, ${escapeHtml(data.profile.city)}, ${escapeHtml(data.profile.state)}</p>
    <h2>Top drivers</h2>
    <ul>${breakdown || "<li>No scored activity recorded yet.</li>"}</ul>
  </body>
</html>`;
  }, [data]);

  if (!data) return null;
  const fileStem = (data.profile.organizationName || data.profile.firstName || "renter").toLowerCase().replace(/\s+/g, "-");
  const scoreGuidance = rentScoreGuidance(data.rentScore.summary.score);
  const shouldShowGuidance =
    Boolean(selectedRecipient) ||
    Boolean(draft.firstName.trim()) ||
    Boolean(draft.lastName.trim()) ||
    Boolean(draft.email.trim()) ||
    Boolean(draft.phone.trim());

  function resetSearchFlow(nextType?: "LANDLORD" | "AGENT") {
    setSearchQuery("");
    setSearchPerformed(false);
    setSearchResults([]);
    setSelectedRecipient(null);
    setDraft((current) => ({
      ...emptyDraft,
      note: current.note
    }));
    if (nextType) {
      setRecipientType(nextType);
    }
  }

  async function runSearch() {
    if (searchQuery.trim().length < 2) {
      toast.error("Enter at least two characters to search.");
      return;
    }

    try {
      setSearchLoading(true);
      setSearchPerformed(true);
      setSelectedRecipient(null);
      const response = await searchRenterShareRecipients(recipientType, searchQuery.trim());
      setSearchResults(response.items);
      if (!response.items.length) {
        setDraft((current) => ({
          ...current,
          email: isValidEmail(searchQuery.trim()) ? searchQuery.trim() : current.email,
          phone: /^\+?\d[\d\s-]{6,}$/.test(searchQuery.trim()) ? searchQuery.trim() : current.phone
        }));
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to search recipient"));
    } finally {
      setSearchLoading(false);
    }
  }

  function useExistingRecipient(result: ShareRecipientSearchResult) {
    setSelectedRecipient(result);
    setDraft((current) => ({
      ...current,
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      phone: result.phone
    }));
  }

  async function submitShare() {
    if (!draft.firstName.trim()) {
      toast.error(`Enter the ${recipientType.toLowerCase()} first name.`);
      return;
    }
    if (!draft.lastName.trim()) {
      toast.error(`Enter the ${recipientType.toLowerCase()} last name.`);
      return;
    }
    if (!draft.email.trim()) {
      toast.error(`Enter the ${recipientType.toLowerCase()} email.`);
      return;
    }
    if (!isValidEmail(draft.email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!draft.phone.trim()) {
      toast.error(`Enter the ${recipientType.toLowerCase()} phone number.`);
      return;
    }

    setSubmitting(true);
    const result = await shareScoreReport({
      recipientEmail: draft.email,
      recipientType,
      recipientFirstName: selectedRecipient ? undefined : draft.firstName,
      recipientLastName: selectedRecipient ? undefined : draft.lastName,
      recipientPhone: selectedRecipient ? undefined : draft.phone,
      note: draft.note || undefined
    });
    if (result.success) {
      setSharePreviewUrl(result.previewUrl || null);
      resetSearchFlow();
      setDraft(emptyDraft);
    }
    setSubmitting(false);
  }

  function downloadReport() {
    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rentsure-rent-score-${fileStem}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.16),_transparent_34%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">Share score</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Share your rent score report with a landlord or agent</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Use this page to search, share, and keep a clean record of who has received your current rent score report.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Current report snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Rent score</p>
              <p className="mt-3 text-5xl font-bold tracking-[-0.04em] text-slate-950">
                {data.rentScore.summary.score}
                <span className="ml-2 text-xl font-medium text-slate-400">/ {data.rentScore.summary.maxScore}</span>
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Badge className={scoreBandBadgeClass(data.rentScore.summary.scoreBand)}>{data.rentScore.summary.scoreBand}</Badge>
                <p className="text-sm text-slate-500">{data.summary.profileCompletenessPercent}% profile confidence</p>
              </div>
            </div>
            {shouldShowGuidance ? (
              <div className={`rounded-2xl border p-4 ${scoreGuidance.tone}`}>
                <p className="text-sm font-semibold">{scoreGuidance.title}</p>
                <p className="mt-1 text-sm">{scoreGuidance.message}</p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Renter profile</p>
              <p className="mt-2 text-sm text-slate-600">{data.profile.organizationName || `${data.profile.firstName} ${data.profile.lastName}`.trim()}</p>
              <p className="text-sm text-slate-600">{data.profile.email}</p>
              <p className="text-sm text-slate-600">{data.profile.address}</p>
              <p className="text-sm text-slate-600">{data.profile.city}, {data.profile.state}</p>
            </div>
            <Button variant="outline" onClick={downloadReport}>
              <Download className="mr-2 h-4 w-4" />
              Download report
            </Button>
            {sharePreviewUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-950">Local email preview</p>
                <a
                  className="mt-2 block break-all text-sm text-[var(--rentsure-blue)] hover:underline"
                  href={sharePreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {sharePreviewUrl}
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Share report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient type</Label>
              <select
                value={recipientType}
                onChange={(event) => resetSearchFlow(event.target.value === "AGENT" ? "AGENT" : "LANDLORD")}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="LANDLORD">Landlord</option>
                <option value="AGENT">Agent</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Search recipient</p>
              <p className="mt-1 text-sm text-slate-600">
                To start input either email, phone number, first name, or last name of the landlord or agent.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Email, phone, first name, or last name"
                  className="bg-white"
                />
                <Button variant="outline" onClick={() => void runSearch()} disabled={searchLoading}>
                  <Search className="mr-2 h-4 w-4" />
                  {searchLoading ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>

            {searchPerformed && searchResults.length ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-950">Available recipients</p>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => useExistingRecipient(result)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedRecipient?.id === result.id
                        ? "border-[var(--rentsure-blue)] bg-[var(--rentsure-blue-soft)]/50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{result.organizationName || `${result.firstName} ${result.lastName}`.trim()}</p>
                        <p className="text-sm text-slate-600">{result.email} · {result.phone}</p>
                        <p className="text-xs text-muted-foreground">{result.address}, {result.city}, {result.state}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        {recipientType.toLowerCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={draft.firstName}
                  onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))}
                  placeholder={`Enter ${recipientType.toLowerCase()} first name`}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input
                  value={draft.lastName}
                  onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))}
                  placeholder={`Enter ${recipientType.toLowerCase()} last name`}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                  placeholder={`Enter ${recipientType.toLowerCase()} email`}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={draft.phone}
                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                  placeholder={`Enter ${recipientType.toLowerCase()} phone number`}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Share note</Label>
              <Textarea
                value={draft.note}
                onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                placeholder="Add a short note for this report share"
                className="bg-white"
              />
            </div>

            <Button
              className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
              onClick={() => void submitShare()}
              disabled={submitting || !draft.email.trim()}
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Sharing..." : "Share report"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-4 w-4 text-[var(--rentsure-blue)]" />
            Share history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data.shareHistory.length ? <p className="text-sm text-muted-foreground">No rent score report has been shared yet.</p> : null}
          {data.shareHistory.map((share) => (
            <div key={share.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[var(--rentsure-blue)]" />
                    <p className="font-semibold text-slate-950">{share.recipientName || share.recipientEmail}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {share.recipientType.toLowerCase()} · {share.recipientEmail}
                  </p>
                  {share.recipientPhone ? <p className="text-sm text-slate-600">{share.recipientPhone}</p> : null}
                  {share.note ? <p className="mt-2 text-sm text-slate-600">{share.note}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-950">
                    {share.score}
                    <span className="ml-1 text-xs font-medium text-slate-400">/ {share.maxScore}</span>
                  </p>
                  <Badge className={`mt-2 ${scoreBandBadgeClass(share.scoreBand)}`}>{share.scoreBand}</Badge>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(share.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
