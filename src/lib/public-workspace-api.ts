import { apiFetch } from "@/lib/api";

export type WorkspaceMembershipRole = "LANDLORD" | "AGENT";
export type ProposedRenterStatus = "PROPOSED" | "SCORE_REQUESTED" | "SCORE_SHARED" | "UNDER_REVIEW" | "DECISION_READY";
export type ProposedRenterDecision = "APPROVED" | "HOLD" | "DECLINED";
export type ScoreRequestStatus = "REQUESTED" | "FORWARDED" | "REVIEWED";
export type PaymentScheduleType = "RENT" | "UTILITY" | "ESTATE_DUE";
export type PaymentScheduleStatus = "PENDING" | "PAID" | "OVERDUE";
export type RentScorePaymentProvider = "PAYSTACK" | "FLUTTERWAVE" | "MANUAL_TRANSFER";
export type RentScorePaymentStatus = "PENDING" | "PENDING_ACTION" | "AWAITING_MANUAL_CONFIRMATION" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export type WorkspaceProperty = {
  id: string;
  name: string;
  summaryLabel: string;
  ownerName: string;
  landlordEmail: string;
  address: string;
  city: string;
  state: string;
  propertyType?: string | null;
  bedroomCount: number;
  bathroomCount: number;
  toiletCount: number;
  unitCount: number;
  isOccupied: boolean;
  currentTenantName?: string | null;
  currentTenantEmail?: string | null;
  currentTenantPhone?: string | null;
  membershipRole: WorkspaceMembershipRole;
  createdAt?: string;
  proposedRenterCount?: number;
  units: Array<{
    id: string;
    label: string;
    address: string;
    city: string;
    state: string;
    bedroomCount: number;
    bathroomCount: number;
    isOccupied: boolean;
    currentTenantName?: string | null;
    currentTenantEmail?: string | null;
    currentTenantPhone?: string | null;
  }>;
  members: Array<{
    role: WorkspaceMembershipRole;
    isPrimary: boolean;
    accountId: string;
    accountType: "LANDLORD" | "AGENT";
    name: string;
    email: string;
    phone: string;
  }>;
};

export type WorkspaceProfileResponse = {
  profile: {
    id: string;
    accountType: "LANDLORD" | "AGENT";
    entityType: "INDIVIDUAL" | "COMPANY";
    representation?: string | null;
    firstName: string;
    lastName: string;
    organizationName?: string | null;
    registrationNumber?: string | null;
    email: string;
    phone: string;
    state: string;
    city: string;
    address: string;
    propertyCount?: string | null;
    portfolioType?: string | null;
    notes?: string | null;
    status: "UNVERIFIED" | "ACTIVE" | "DISABLED";
    passportPhoto?: {
      id: string;
      documentType: "PASSPORT_PHOTO";
      fileName: string;
      mimeType: string;
      fileSize: number;
      createdAt: string;
      viewUrl?: string | null;
    } | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type LinkedRentScoreSummary = {
  score: number;
  scoreBand: "STRONG" | "STABLE" | "WATCH" | "RISK";
  positivePoints: number;
  negativePoints: number;
  eventCount: number;
} | null;

export type QueueListItem = {
  id: string;
  firstName: string;
  lastName: string;
  organizationName?: string | null;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  status: ProposedRenterStatus;
  property: WorkspaceProperty;
  linkedRentScore: LinkedRentScoreSummary;
  decision: {
    decision: ProposedRenterDecision;
    decidedAt?: string | null;
    decidedByName?: string | null;
    note?: string | null;
  } | null;
  latestScoreRequest: {
    id: string;
    status: ScoreRequestStatus;
    notes?: string | null;
    createdAt: string;
    requestedBy: string;
    forwardedTo?: string | null;
  } | null;
  latestRentScorePayment: {
    id: string;
    provider: RentScorePaymentProvider;
    status: RentScorePaymentStatus;
    amountNgn: number;
    reference: string;
    createdAt: string;
  } | null;
  paymentSchedules: Array<{
    id: string;
    paymentType: PaymentScheduleType;
    amountNgn: number;
    dueDate: string;
    status: PaymentScheduleStatus;
    confirmationInitiatedAt?: string | null;
    confirmedAt?: string | null;
    confirmationTiming?: "ON_TIME" | "LATE" | null;
  }>;
  createdAt: string;
};

export type QueueDetail = {
  id: string;
  firstName: string;
  lastName: string;
  organizationName?: string | null;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  status: ProposedRenterStatus;
  notes?: string | null;
  linkedRentScore: LinkedRentScoreSummary;
  linkedRentScoreReport: {
    summary: {
      score: number;
      rawScore: number;
      minScore: number;
      maxScore: number;
      positivePoints: number;
      negativePoints: number;
      eventCount: number;
      scoreBand: "STRONG" | "STABLE" | "WATCH" | "RISK";
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
    breakdown: Array<{
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
    }>;
  } | null;
  decision: {
    decision: ProposedRenterDecision;
    decidedAt?: string | null;
    note?: string | null;
    decidedBy: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  property: WorkspaceProperty;
  scoreRequests: Array<{
    id: string;
    status: ScoreRequestStatus;
    notes?: string | null;
    createdAt: string;
    forwardedAt?: string | null;
    reviewedAt?: string | null;
    requestedBy: {
      id: string;
      name: string;
      email: string;
    };
    forwardedTo: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  latestRentScorePayment: {
    id: string;
    provider: RentScorePaymentProvider;
    status: RentScorePaymentStatus;
    amountNgn: number;
    currency: string;
    reference: string;
    checkoutUrl?: string | null;
    manualTransferReference?: string | null;
    notes?: string | null;
    createdAt: string;
    manualTransfer?: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      reference: string;
      instructions: string;
    } | null;
  } | null;
  paymentSchedules: Array<{
    id: string;
    paymentType: PaymentScheduleType;
    amountNgn: number;
    dueDate: string;
    status: PaymentScheduleStatus;
    note?: string | null;
    paidAt?: string | null;
    confirmationNote?: string | null;
    receiptReference?: string | null;
    paymentEvidenceObjectKey?: string | null;
    paymentEvidenceFileName?: string | null;
    paymentEvidenceMimeType?: string | null;
    paymentEvidenceFileSize?: number | null;
    paymentEvidenceUploadedAt?: string | null;
    paymentEvidenceViewUrl?: string | null;
    confirmationInitiatedAt?: string | null;
    confirmationInitiatedBy?: {
      id: string;
      name: string;
      email: string;
      accountType: "RENTER" | "LANDLORD" | "AGENT";
    } | null;
    confirmedAt?: string | null;
    confirmedBy?: {
      id: string;
      name: string;
      email: string;
      accountType: "RENTER" | "LANDLORD" | "AGENT";
    } | null;
    confirmationTiming?: "ON_TIME" | "LATE" | null;
    createdBy: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  activities: Array<{
    id: string;
    activityType:
      | "COMMENT"
      | "CREATED"
      | "SCORE_REQUESTED"
      | "SCORE_FORWARDED"
      | "DECISION"
      | "PAYMENT_SCHEDULE_CREATED"
      | "PAYMENT_SCHEDULE_UPDATED"
      | "PAYMENT_CONFIRMATION_INITIATED"
      | "PAYMENT_CONFIRMED"
      | "RENTER_PAYMENT_CONFIRMED";
    message: string;
    createdAt: string;
    actor: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  createdAt: string;
  updatedAt: string;
  invitePreviewUrl?: string | null;
};

export type WorkspaceRenterSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  organizationName?: string | null;
  email: string;
  phone: string;
  state: string;
  city: string;
  address: string;
  status: "UNVERIFIED" | "ACTIVE" | "DISABLED";
  alreadyQueued: boolean;
};

export type WorkspaceOverview = {
  summary: {
    propertyCount: number;
    proposedRenterCount: number;
    scoreRequestCount: number;
    pendingScheduleCount: number;
  };
  properties: WorkspaceProperty[];
  recentRenters: Array<{
    id: string;
    name: string;
    email: string;
    status: ProposedRenterStatus;
    propertyName: string;
    propertyAddress: string;
    linkedRentScore: LinkedRentScoreSummary;
    createdAt: string;
  }>;
};

export function getWorkspaceOverview() {
  return apiFetch<WorkspaceOverview>("/api/workspace/overview");
}

export function getWorkspaceProfile() {
  return apiFetch<WorkspaceProfileResponse>("/api/workspace/profile");
}

export function updateWorkspaceProfile(input: {
  accountType?: "LANDLORD" | "AGENT";
  representation?: string | null;
  firstName?: string;
  lastName?: string;
  organizationName?: string | null;
  registrationNumber?: string | null;
  phone?: string;
  state?: string;
  city?: string;
  address?: string;
  propertyCount?: string | null;
  portfolioType?: string | null;
  notes?: string | null;
}) {
  return apiFetch<WorkspaceProfileResponse>("/api/workspace/profile", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function saveWorkspacePassportPhoto(input: {
  objectKey: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileSize: number;
}) {
  return apiFetch<WorkspaceProfileResponse>("/api/workspace/profile/passport-photo", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listWorkspaceProperties() {
  return apiFetch<{ items: WorkspaceProperty[] }>("/api/workspace/properties");
}

export function createWorkspaceProperty(input: {
  name: string;
  ownerName: string;
  landlordEmail: string;
  propertyType: "Duplex" | "Flats" | "Self Contain" | "Mansion" | "Boys Quater";
  bedroomCount: number;
  bathroomCount: number;
  address: string;
  state: string;
  city: string;
  units: Array<{
    label: string;
    bedroomCount: number;
    bathroomCount: number;
    isOccupied: boolean;
    currentTenantName?: string;
    currentTenantEmail?: string;
    currentTenantPhone?: string;
  }>;
}) {
  return apiFetch<WorkspaceOverview>("/api/workspace/properties", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function shareWorkspaceProperty(propertyId: string, sharedWithEmail: string) {
  return apiFetch<{ items: WorkspaceProperty[] }>(`/api/workspace/properties/${encodeURIComponent(propertyId)}/share`, {
    method: "POST",
    body: JSON.stringify({ sharedWithEmail })
  });
}

export function listWorkspaceQueue() {
  return apiFetch<{ items: QueueListItem[] }>("/api/workspace/queue");
}

export function getWorkspaceQueueItem(id: string) {
  return apiFetch<QueueDetail>(`/api/workspace/queue/${encodeURIComponent(id)}`);
}

export function searchWorkspaceRenters(propertyId: string, q: string) {
  const search = new URLSearchParams({
    propertyId,
    q
  });
  return apiFetch<{ items: WorkspaceRenterSearchResult[] }>(`/api/workspace/renter-search?${search.toString()}`);
}

export function createWorkspaceProposedRenter(input: {
  propertyId: string;
  renterAccountId?: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
  email: string;
  phone: string;
  address?: string;
  state?: string;
  city?: string;
  notes?: string;
}) {
  return apiFetch<QueueDetail>("/api/workspace/queue", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function requestWorkspaceRentScore(proposedRenterId: string, notes?: string) {
  return apiFetch<QueueDetail>(`/api/workspace/queue/${encodeURIComponent(proposedRenterId)}/score-requests`, {
    method: "POST",
    body: JSON.stringify({ notes })
  });
}

export function createRentScorePaymentSession(
  proposedRenterId: string,
  input: {
    provider: RentScorePaymentProvider;
    notes?: string;
    callbackPath?: string;
  }
) {
  return apiFetch<{
    paymentId: string;
    provider: RentScorePaymentProvider;
    status: RentScorePaymentStatus;
    amountNgn: number;
    currency: string;
    reference: string;
    checkoutUrl?: string | null;
    manualTransfer?: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      reference: string;
      instructions: string;
    } | null;
  }>(`/api/workspace/queue/${encodeURIComponent(proposedRenterId)}/score-payments`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function verifyRentScorePayment(reference: string) {
  return apiFetch<QueueDetail>("/api/workspace/score-payments/verify", {
    method: "POST",
    body: JSON.stringify({ reference })
  });
}

export function decideWorkspaceProposedRenter(
  proposedRenterId: string,
  input: {
    decision: ProposedRenterDecision;
    note?: string;
  }
) {
  return apiFetch<QueueDetail>(`/api/workspace/queue/${encodeURIComponent(proposedRenterId)}/decision`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function commentOnWorkspaceProposedRenter(proposedRenterId: string, message: string) {
  return apiFetch<QueueDetail>(`/api/workspace/queue/${encodeURIComponent(proposedRenterId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

export function forwardWorkspaceScoreRequest(scoreRequestId: string, forwardToAccountId?: string) {
  return apiFetch<QueueDetail>(`/api/workspace/score-requests/${encodeURIComponent(scoreRequestId)}/forward`, {
    method: "POST",
    body: JSON.stringify({ forwardToAccountId })
  });
}

export function createWorkspacePaymentSchedule(
  proposedRenterId: string,
  input: {
    paymentType: PaymentScheduleType;
    amountNgn: number;
    dueDate: string;
    note?: string;
    recurrence?: {
      enabled: boolean;
      frequency?: "MONTHLY" | "QUARTERLY" | "YEARLY";
      occurrences?: number;
    };
  }
) {
  return apiFetch<QueueDetail>(`/api/workspace/queue/${encodeURIComponent(proposedRenterId)}/payment-schedules`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateWorkspacePaymentSchedule(paymentScheduleId: string, status: PaymentScheduleStatus) {
  return apiFetch<QueueDetail>(`/api/workspace/payment-schedules/${encodeURIComponent(paymentScheduleId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function confirmWorkspacePaymentSchedule(
  paymentScheduleId: string,
  input?: {
    paidAt?: string;
    note?: string;
  }
) {
  return apiFetch<QueueDetail>(`/api/workspace/payment-schedules/${encodeURIComponent(paymentScheduleId)}/confirm`, {
    method: "POST",
    body: JSON.stringify(input || {})
  });
}
