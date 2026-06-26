import { apiFetch } from "@/lib/api";

export type PublicAccountStatus = "UNVERIFIED" | "ACTIVE" | "DISABLED";
export type RentScoreBand = "STRONG" | "STABLE" | "WATCH" | "RISK";

export type RentScoreRuleConfig = {
  id: string;
  code: string;
  categoryCode:
    | "IDENTITY_VERIFICATION"
    | "PAYMENT"
    | "RENTER_BEHAVIOUR"
    | "RENTAL_STABILITY"
    | "EMPLOYMENT_STABILITY"
    | "LANDLORD_REFERENCE"
    | "RENTER_BAND";
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

export type RentScoreCategoryConfig = {
  id: string;
  code:
    | "IDENTITY_VERIFICATION"
    | "PAYMENT"
    | "RENTER_BEHAVIOUR"
    | "RENTAL_STABILITY"
    | "EMPLOYMENT_STABILITY"
    | "LANDLORD_REFERENCE"
    | "RENTER_BAND";
  name: string;
  maxScore: number;
  isActive: boolean;
  sortOrder: number;
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
  categories: RentScoreCategoryConfig[];
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

export type AdminRenterActivityItem = {
  id: string;
  activityType: string;
  message: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
  renter: {
    proposedRenterId: string;
    accountId?: string | null;
    name: string;
    email: string;
    status: string;
    decision?: string | null;
  };
  property: {
    id: string;
    summaryLabel: string;
    address: string;
    city: string;
    state: string;
  };
};

export type AdminLandlordAgentActivityItem = {
  id: string;
  activityType: string;
  message: string;
  createdAt: string;
  actor: {
    id: string;
    accountType: "LANDLORD" | "AGENT";
    name: string;
    email: string;
  } | null;
  renter: {
    proposedRenterId: string;
    accountId?: string | null;
    name: string;
    email: string;
    status: string;
    decision?: string | null;
  };
  property: {
    id: string;
    summaryLabel: string;
    address: string;
    city: string;
    state: string;
  };
  latestScoreRequest: {
    id: string;
    status: string;
    createdAt: string;
    reviewedAt?: string | null;
    requestedBy: string;
    forwardedTo?: string | null;
  } | null;
  latestRentScorePayment: {
    id: string;
    provider: string;
    status: string;
    amountNgn: number;
    reference: string;
    reportApprovedAt?: string | null;
  } | null;
  shareApproval: {
    status: "APPROVED" | "PENDING" | "NOT_REQUESTED";
    canApprove: boolean;
  };
};

export type PendingRentScoreReportApprovalItem = {
  id: string;
  reportType: "LANDLORD_REQUEST" | "RENTER_SELF_SERVICE";
  amountNgn: number;
  currency: string;
  provider: "PAYSTACK" | "FLUTTERWAVE" | "MANUAL_TRANSFER";
  reference: string;
  createdAt: string;
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  renter: {
    accountId: string;
    name: string;
    email: string;
  };
  property?: {
    id: string;
    summaryLabel: string;
    address: string;
    city: string;
    state: string;
  } | null;
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
  categoryCode:
    | "IDENTITY_VERIFICATION"
    | "PAYMENT"
    | "RENTER_BEHAVIOUR"
    | "RENTAL_STABILITY"
    | "EMPLOYMENT_STABILITY"
    | "LANDLORD_REFERENCE"
    | "RENTER_BAND";
  name: string;
  description?: string | null;
  points: number;
  maxOccurrences?: number | null;
  isActive: boolean;
  quantity: number;
  appliedOccurrences: number;
  contribution: number;
  lastOccurredAt?: string | null;
  overridden?: boolean;
  overrideScope?: "BREAKDOWN_ITEM" | "CATEGORY" | null;
  overrideId?: string | null;
  overrideNote?: string | null;
};

export type RentScoreCategoryBreakdownItem = {
  code:
    | "IDENTITY_VERIFICATION"
    | "PAYMENT"
    | "RENTER_BEHAVIOUR"
    | "RENTAL_STABILITY"
    | "EMPLOYMENT_STABILITY"
    | "LANDLORD_REFERENCE"
    | "RENTER_BAND";
  name: string;
  score: number;
  maxScore: number;
  overridden?: boolean;
  overrideId?: string | null;
  overrideNote?: string | null;
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
  activeOverrides: Array<{
    id: string;
    scope: "BREAKDOWN_ITEM" | "CATEGORY";
    targetCode: string;
    note?: string | null;
    createdAt: string;
    createdBy?: {
      id: string;
      fullName: string;
      email: string;
    } | null;
  }>;
  categoryBreakdown: RentScoreCategoryBreakdownItem[];
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

export function listRentScoreRules() {
  return apiFetch<{ items: RentScoreRuleConfig[] }>("/api/admin/rent-score/rules");
}

export function getRentScoreSetup() {
  return apiFetch<RentScoreConfig>("/api/admin/rent-score/setup");
}

export function updateRentScoreCategory(
  categoryId: string,
  input: {
    name?: string;
    maxScore?: number;
  }
) {
  return apiFetch<RentScoreConfig>(`/api/admin/rent-score/setup/categories/${encodeURIComponent(categoryId)}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function deleteRentScoreCategory(categoryId: string) {
  return apiFetch<RentScoreConfig>(`/api/admin/rent-score/setup/categories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE"
  });
}

export function updateRentScoreRule(
  ruleId: string,
  input: {
    name?: string;
    points?: number;
  }
) {
  return apiFetch<RentScoreConfig>(`/api/admin/rent-score/setup/rules/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function deleteRentScoreRule(ruleId: string) {
  return apiFetch<RentScoreConfig>(`/api/admin/rent-score/setup/rules/${encodeURIComponent(ruleId)}`, {
    method: "DELETE"
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

export function createRentScoreOverride(
  publicAccountId: string,
  input: {
    scope: "BREAKDOWN_ITEM" | "CATEGORY";
    targetCode: string;
    note?: string;
  }
) {
  return apiFetch<RenterScoreSnapshot>(`/api/admin/rent-score/accounts/${encodeURIComponent(publicAccountId)}/overrides`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function deleteRentScoreOverride(overrideId: string) {
  return apiFetch<RenterScoreSnapshot>(`/api/admin/rent-score/overrides/${encodeURIComponent(overrideId)}`, {
    method: "DELETE"
  });
}

export function listPendingRenterInvites() {
  return apiFetch<{ items: PendingRenterInviteItem[] }>("/api/admin/renter-invites");
}

export function listAdminRenterActivities() {
  return apiFetch<{ items: AdminRenterActivityItem[] }>("/api/admin/renter-activities");
}

export function listAdminLandlordAgentActivities() {
  return apiFetch<{ items: AdminLandlordAgentActivityItem[] }>("/api/admin/landlord-agent-activities");
}

export function resendPendingRenterInvite(proposedRenterId: string) {
  return apiFetch<{ success: true; invitePreviewUrl?: string | null }>(
    `/api/admin/renter-invites/${encodeURIComponent(proposedRenterId)}/remind`,
    {
      method: "POST"
    }
  );
}
