export const INFORMATION_OPTIONS = ["Work History", "Work Reference Letter"] as const;
export type InformationResponse = {
  submittedAt: string;
  workHistory?: string;
  referenceLetter?: { fileName: string; url: string | null } | null;
};

export function applicationDecisionLabel(
  decision?: string | null,
  response?: InformationResponse | null,
  requestedInformation?: string[]
) {
  if (decision === "HOLD") {
    if (response?.submittedAt) return "Information received — awaiting landlord review";
    if (requestedInformation?.length) return "Awaiting renter information";
    return "Additional information requested";
  }
  if (decision === "APPROVED") return "Approved";
  if (decision === "DECLINED") return "Declined";
  return decision?.replaceAll("_", " ").toLowerCase().replace(/^./, value => value.toUpperCase()) || "Pending";
}

export function awaitingRenterInformation(decision?: string | null, response?: InformationResponse | null, requestedInformation?: string[]) {
  return decision === "HOLD" && Boolean(requestedInformation?.length) && !response?.submittedAt;
}
