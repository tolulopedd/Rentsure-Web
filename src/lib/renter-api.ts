import { apiFetch } from "@/lib/api";

export type RenterDashboardResponse = {
  profile: {
    id: string;
    entityType: "INDIVIDUAL" | "COMPANY";
    firstName: string;
    lastName: string;
    organizationName?: string | null;
    registrationNumber?: string | null;
    email: string;
    phone: string;
    state: string;
    city: string;
    address: string;
    notes?: string | null;
    nin?: string | null;
    ninVerifiedAt?: string | null;
    bvn?: string | null;
    bvnVerifiedAt?: string | null;
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
  };
  rentScore: {
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
    breakdown: Array<{
      ruleId: string;
      code: string;
      name: string;
      points: number;
      appliedOccurrences: number;
      contribution: number;
    }>;
    recentEvents: Array<{
      id: string;
      occurredAt: string;
      sourceNote?: string | null;
      rule: {
        name: string;
        points: number;
      };
    }>;
  };
  summary: {
    activeLinkedCases: number;
    pendingSchedules: number;
    profileCompletenessPercent: number;
  };
  shareHistory: Array<{
    id: string;
    recipientEmail: string;
    recipientType: "LANDLORD" | "AGENT";
    recipientName?: string | null;
    recipientPhone?: string | null;
    note?: string | null;
    score: number;
    maxScore: number;
    scoreBand: "STRONG" | "STABLE" | "WATCH" | "RISK";
    createdAt: string;
  }>;
  linkedCases: Array<{
    id: string;
    status: string;
    decision?: string | null;
    decisionNote?: string | null;
    property: {
      id: string;
      name: string;
      address: string;
      city: string;
      state: string;
    };
    scoreRequests: Array<{
      id: string;
      status: string;
      requestedBy: string;
      forwardedTo?: string | null;
      createdAt: string;
    }>;
    paymentSchedules: Array<{
      id: string;
      paymentType: "RENT" | "UTILITY" | "ESTATE_DUE";
      amountNgn: number;
      dueDate: string;
      status: "PENDING" | "PAID" | "OVERDUE";
      note?: string | null;
      confirmedByRenterAt?: string | null;
      receiptReference?: string | null;
      createdBy: string;
    }>;
    activities: Array<{
      id: string;
      activityType: string;
      message: string;
      createdAt: string;
      actorName?: string | null;
    }>;
  }>;
};

export function getRenterDashboard() {
  return apiFetch<RenterDashboardResponse>("/api/renter/dashboard");
}

export function updateRenterProfile(input: {
  firstName?: string;
  lastName?: string;
  organizationName?: string | null;
  registrationNumber?: string | null;
  phone?: string;
  state?: string;
  city?: string;
  address?: string;
  notes?: string | null;
}) {
  return apiFetch<RenterDashboardResponse>("/api/renter/profile", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function saveRenterPassportPhoto(input: {
  objectKey: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileSize: number;
}) {
  return apiFetch<RenterDashboardResponse>("/api/renter/profile/passport-photo", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function verifyRenterIdentity(input: {
  verificationType: "NIN" | "BVN";
  value: string;
}) {
  return apiFetch<RenterDashboardResponse>("/api/renter/identity", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function confirmRenterPayment(
  paymentScheduleId: string,
  input: {
    receiptReference?: string;
    note?: string;
  }
) {
  return apiFetch<RenterDashboardResponse>(`/api/renter/payment-schedules/${encodeURIComponent(paymentScheduleId)}/confirm`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function shareRenterScoreReport(input: {
  recipientEmail: string;
  recipientType: "LANDLORD" | "AGENT";
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientPhone?: string;
  note?: string;
}) {
  return apiFetch<{ dashboard: RenterDashboardResponse; sharePreviewUrl?: string | null }>("/api/renter/share-report", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export type ShareRecipientSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  organizationName?: string | null;
  email: string;
  phone: string;
  state: string;
  city: string;
  address: string;
};

export function searchRenterShareRecipients(recipientType: "LANDLORD" | "AGENT", q: string) {
  const search = new URLSearchParams({
    recipientType,
    q
  });
  return apiFetch<{ items: ShareRecipientSearchResult[] }>(`/api/renter/share-recipient-search?${search.toString()}`);
}
