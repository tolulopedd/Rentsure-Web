import { rentScoreBandLabel, type RentScoreBandCode } from "@/lib/rent-score-band";

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

export function formatNgn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value);
}

export function scorePercent(score: number, minScore: number, maxScore: number) {
  const range = Math.max(maxScore - minScore, 1);
  const percent = ((score - minScore) / range) * 100;
  return Math.max(0, Math.min(100, percent));
}

export function scoreBandBadgeClass(scoreBand: RentScoreBandCode) {
  if (scoreBand === "STRONG") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (scoreBand === "STABLE") return "border-lime-200 bg-lime-50 text-lime-700";
  if (scoreBand === "WATCH") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export { rentScoreBandLabel };

export function decisionBadgeClass(decision?: string | null) {
  if (decision === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (decision === "HOLD") return "border-amber-200 bg-amber-50 text-amber-700";
  if (decision === "DECLINED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function paymentStatusBadgeClass(status: "PENDING" | "PAID" | "OVERDUE") {
  if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "OVERDUE") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function paymentTypeLabel(type: "RENT" | "UTILITY" | "ESTATE_DUE") {
  return type.replaceAll("_", " ");
}

export function rentScoreGuidance(score: number) {
  if (score >= 750) {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      title: "Excellent rating",
      message: "Your current rent score is excellent. Your profile is in a strong position if the rest of your renter record stays consistent."
    };
  }

  if (score >= 500) {
    return {
      tone: "border-lime-200 bg-lime-50 text-lime-800",
      title: "Good rating",
      message: "Your current rent score is good. Keep strengthening your profile, identity verification, and payment confirmations to move toward excellent."
    };
  }

  if (score >= 300) {
    return {
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      title: "Fair rating",
      message: "Your current rent score is fair. You should improve your profile, identity verification, and payment confirmations to strengthen approval chances."
    };
  }

  return {
    tone: "border-rose-200 bg-rose-50 text-rose-800",
    title: "High Risk rating",
    message: "Your current rent score is high risk and may affect approval. Improve it by updating your profile, verifying identity, and confirming rent or utility payments."
  };
}
