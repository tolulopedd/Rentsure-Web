import { apiFetch } from "@/lib/api";

export type PublicAccountStatus = "UNVERIFIED" | "ACTIVE" | "DISABLED";
export type RentScoreBand = "STRONG" | "STABLE" | "WATCH" | "RISK";

export type RentScoreRuleConfig = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  points: number;
  maxOccurrences?: number | null;
  isActive: boolean;
  sortOrder: number;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type RentScoreConfig = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  minScore: number;
  maxScore: number;
  isActive: boolean;
  updatedAt: string;
  rules: RentScoreRuleConfig[];
};

export type RenterScoreListItem = {
  accountId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  organizationName?: string | null;
  status: PublicAccountStatus;
  state?: string | null;
  city?: string | null;
  score: number;
  rawScore: number;
  scoreBand: RentScoreBand;
  positivePoints: number;
  negativePoints: number;
  eventCount: number;
  createdAt: string;
};

export type RenterScoreListResponse = {
  items: RenterScoreListItem[];
  summary: {
    scoreRequestCount: number;
  };
};

export type PendingRenterInviteItem = {
  id: string;
  firstName: string;
  lastName: string;
  organizationName?: string | null;
  email: string;
  phone: string;
  inviteState: "INVITED" | "UNVERIFIED_ACCOUNT";
  property: {
    id: string;
    summaryLabel: string;
    address: string;
    city: string;
    state: string;
  };
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  lastReminderAt?: string | null;
  createdAt: string;
};

export type PendingManualRentScorePaymentItem = {
  id: string;
  reference: string;
  amountNgn: number;
  currency: string;
  notes?: string | null;
  createdAt: string;
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  renter: {
    id: string;
    name: string;
    email: string;
  };
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
};

export type RentScoreBreakdownItem = {
  ruleId: string;
  code: string;
  name: string;
  description?: string | null;
  points: number;
  maxOccurrences?: number | null;
  isActive: boolean;
  quantity: number;
  appliedOccurrences: number;
  contribution: number;
  lastOccurredAt?: string | null;
};

export type RentScoreEventItem = {
  id: string;
  quantity: number;
  occurredAt: string;
  sourceNote?: string | null;
  metadata?: unknown;
  rule: {
    id: string;
    code: string;
    name: string;
    points: number;
  };
  recordedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export type RenterScoreSnapshot = {
  account: {
    id: string;
    accountType: "RENTER";
    entityType: "INDIVIDUAL" | "COMPANY";
    firstName?: string | null;
    lastName?: string | null;
    organizationName?: string | null;
    email: string;
    phone?: string | null;
    state?: string | null;
    city?: string | null;
    address?: string | null;
    status: PublicAccountStatus;
    createdAt: string;
  };
  policy: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    minScore: number;
    maxScore: number;
    isActive: boolean;
    updatedAt: string;
  };
  summary: {
    score: number;
    rawScore: number;
    minScore: number;
    maxScore: number;
    positivePoints: number;
    negativePoints: number;
    eventCount: number;
    scoreBand: RentScoreBand;
  };
  breakdown: RentScoreBreakdownItem[];
  recentEvents: RentScoreEventItem[];
};

export function listRenterScores(params?: { q?: string; status?: PublicAccountStatus | "ALL" }) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status && params.status !== "ALL") search.set("status", params.status);
  const query = search.toString();
  return apiFetch<RenterScoreListResponse>(`/api/admin/rent-score/accounts${query ? `?${query}` : ""}`);
}

export function getRenterScoreDetails(publicAccountId: string) {
  return apiFetch<RenterScoreSnapshot>(`/api/admin/rent-score/accounts/${encodeURIComponent(publicAccountId)}`);
}

export function getRentScoreConfig() {
  return apiFetch<RentScoreConfig>("/api/admin/rent-score/config");
}

export function updateRentScorePolicy(input: {
  name?: string;
  description?: string | null;
  minScore?: number;
  maxScore?: number;
  isActive?: boolean;
}) {
  return apiFetch<RentScoreConfig>("/api/admin/rent-score/config", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function updateRentScoreRule(
  ruleId: string,
  input: {
    name?: string;
    description?: string | null;
    points?: number;
    maxOccurrences?: number | null;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  return apiFetch<RentScoreConfig>(`/api/admin/rent-score/rules/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function createRentScoreRule(input: {
  code: string;
  name: string;
  description?: string | null;
  points: number;
  maxOccurrences?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}) {
  return apiFetch<RentScoreConfig>("/api/admin/rent-score/rules", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function recordRentScoreEvent(
  publicAccountId: string,
  input: {
    ruleId?: string;
    ruleCode?: string;
    quantity?: number;
    sourceNote?: string;
  }
) {
  return apiFetch<RenterScoreSnapshot>(`/api/admin/rent-score/accounts/${encodeURIComponent(publicAccountId)}/events`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function deleteRentScoreEvent(eventId: string) {
  return apiFetch<RenterScoreSnapshot>(`/api/admin/rent-score/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE"
  });
}

export function listPendingRenterInvites() {
  return apiFetch<{ items: PendingRenterInviteItem[] }>("/api/admin/renter-invites");
}

export function resendPendingRenterInvite(proposedRenterId: string) {
  return apiFetch<{ success: true; invitePreviewUrl?: string | null }>(
    `/api/admin/renter-invites/${encodeURIComponent(proposedRenterId)}/remind`,
    {
      method: "POST"
    }
  );
}

export function listManualRentScorePayments() {
  return apiFetch<{ items: PendingManualRentScorePaymentItem[] }>("/api/admin/rent-score/payments/manual");
}

export function confirmManualRentScorePayment(paymentId: string) {
  return apiFetch<{ success: true }>(
    `/api/admin/rent-score/payments/manual/${encodeURIComponent(paymentId)}/confirm`,
    {
      method: "POST"
    }
  );
}
