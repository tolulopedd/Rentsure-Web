export type RentScoreBandCode = "STRONG" | "STABLE" | "WATCH" | "RISK";

export function rentScoreBandLabel(scoreBand: RentScoreBandCode) {
  if (scoreBand === "STRONG") return "Excellent";
  if (scoreBand === "STABLE") return "Good";
  if (scoreBand === "WATCH") return "Fair";
  return "High Risk";
}
