import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CreditCard, Download } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import { createRenterRentScorePaymentSession, verifyRenterRentScorePayment } from "@/lib/renter-api";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatNgn, scoreBandBadgeClass } from "@/lib/renter-workspace-presenters";

function paymentStatusLabel(status: string) {
  if (status === "AWAITING_MANUAL_CONFIRMATION") return "Awaiting admin confirmation";
  if (status === "PENDING_ACTION") return "Complete payment";
  if (status === "SUCCEEDED") return "Paid";
  if (status === "FAILED") return "Failed";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

function paymentStatusBadgeClass(status: string) {
  if (status === "SUCCEEDED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "AWAITING_MANUAL_CONFIRMATION" || status === "PENDING_ACTION") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "FAILED" || status === "CANCELLED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function RenterWorkspaceBuyScore() {
  const { data, refresh } = useRenterWorkspace();
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [submittingProvider, setSubmittingProvider] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const reference = search.get("rentScorePaymentRef");
    if (!reference) return;

    void (async () => {
      try {
        await verifyRenterRentScorePayment(reference);
        await refresh();
        toast.success("Payment verified. Your rent score purchase is complete.");
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Failed to verify rent score payment"));
      } finally {
        const nextUrl = `${window.location.pathname}${window.location.hash || ""}`;
        window.history.replaceState({}, "", nextUrl);
      }
    })();
  }, [refresh]);

  const latestPurchase = useMemo(() => data?.rentScorePurchases[0] || null, [data]);
  const purchaseInProgress =
    latestPurchase?.status === "PENDING_ACTION" || latestPurchase?.status === "AWAITING_MANUAL_CONFIRMATION"
      ? latestPurchase
      : null;

  async function startPurchase(provider: "PAYSTACK" | "FLUTTERWAVE" | "MANUAL_TRANSFER") {
    try {
      setSubmittingProvider(provider);
      const response = await createRenterRentScorePaymentSession({
        provider,
        callbackPath: window.location.pathname
      });
      if (response.checkoutUrl) {
        window.location.assign(response.checkoutUrl);
        return;
      }
      await refresh();
      setShowPaymentOptions(false);
      toast.success("Transfer instructions created. Admin will confirm once payment is received.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to start rent score payment"));
    } finally {
      setSubmittingProvider(null);
    }
  }

  function downloadCurrentSnapshot() {
    if (!data) return;
    const renterDisplayName = data.profile.organizationName || `${data.profile.firstName} ${data.profile.lastName}`.trim();
    const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>RentSure Rent Score</title></head>
  <body style="font-family: Arial, sans-serif; margin: 32px; color: #0f172a;">
    <h1>RentSure Rent Score</h1>
    <p>${renterDisplayName}</p>
    <p><strong>Score:</strong> ${data.rentScore.summary.score} / ${data.rentScore.summary.maxScore}</p>
    <p><strong>Band:</strong> ${data.rentScore.summary.scoreBand}</p>
    <p><strong>Email:</strong> ${data.profile.email}</p>
    <p><strong>Phone:</strong> ${data.profile.phone}</p>
    <p><strong>Address:</strong> ${data.profile.address}, ${data.profile.city}, ${data.profile.state}</p>
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

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.16),_transparent_34%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">Buy rent score</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Buy your current rent score report</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Pay for an official RentSure rent score report using card, transfer, or another supported gateway option.
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
                <Badge className={scoreBandBadgeClass(data.rentScore.summary.scoreBand)}>{data.rentScore.summary.scoreBand}</Badge>
                <p className="text-sm text-slate-500">{data.summary.profileCompletenessPercent}% profile confidence</p>
              </div>
            </div>

            {purchaseInProgress?.status === "AWAITING_MANUAL_CONFIRMATION" && purchaseInProgress.manualTransfer ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Manual transfer instructions</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Amount</p>
                  <p>{formatNgn(purchaseInProgress.amountNgn)}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Bank</p>
                  <p>{purchaseInProgress.manualTransfer.bankName}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Account name</p>
                  <p>{purchaseInProgress.manualTransfer.accountName}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Account number</p>
                  <p>{purchaseInProgress.manualTransfer.accountNumber}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Reference</p>
                  <p>{purchaseInProgress.manualTransfer.reference}</p>
                </div>
                <p className="mt-3 text-sm text-slate-600">{purchaseInProgress.manualTransfer.instructions}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  if (purchaseInProgress?.checkoutUrl) {
                    window.location.assign(purchaseInProgress.checkoutUrl);
                    return;
                  }
                  setShowPaymentOptions((current) => !current);
                }}
                className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {purchaseInProgress ? paymentStatusLabel(purchaseInProgress.status) : "Buy rent score"}
              </Button>
              <Button asChild variant="outline">
                <Link to="/account/renter/share-score">
                  Share score
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" onClick={downloadCurrentSnapshot}>
                <Download className="mr-2 h-4 w-4" />
                Download snapshot
              </Button>
            </div>

            {showPaymentOptions && !purchaseInProgress ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-950">Choose payment method</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => void startPurchase("PAYSTACK")} disabled={Boolean(submittingProvider)}>
                    {submittingProvider === "PAYSTACK" ? "Opening..." : "Paystack"}
                  </Button>
                  <Button variant="outline" onClick={() => void startPurchase("FLUTTERWAVE")} disabled={Boolean(submittingProvider)}>
                    {submittingProvider === "FLUTTERWAVE" ? "Opening..." : "Flutterwave"}
                  </Button>
                  <Button variant="outline" onClick={() => void startPurchase("MANUAL_TRANSFER")} disabled={Boolean(submittingProvider)}>
                    {submittingProvider === "MANUAL_TRANSFER" ? "Creating..." : "Cash / transfer"}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Purchase history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data.rentScorePurchases.length ? (
              <p className="text-sm text-muted-foreground">You have not bought a rent score report yet.</p>
            ) : null}
            {data.rentScorePurchases.map((purchase) => (
              <div key={purchase.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{purchase.provider.replaceAll("_", " ")}</p>
                    <p className="text-sm text-slate-600">
                      {formatNgn(purchase.amountNgn)} · {purchase.reference}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(purchase.createdAt)}</p>
                  </div>
                  <Badge className={paymentStatusBadgeClass(purchase.status)} variant="outline">
                    {paymentStatusLabel(purchase.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
