import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  createSelfInitiatedRenterPayment,
  confirmRenterPayment,
  getRenterDashboard,
  initiateRenterPaymentConfirmation,
  saveRenterPassportPhoto,
  shareRenterScoreReport,
  updateRenterProfile,
  verifyRenterIdentity,
  type RenterDashboardResponse
} from "@/lib/renter-api";
import { getErrorMessage } from "@/lib/errors";
import { updateStoredUserIdentity } from "@/lib/api";
import { scorePercent } from "@/lib/renter-workspace-presenters";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

type RenterWorkspaceContextValue = {
  data: RenterDashboardResponse | null;
  loading: boolean;
  loadError: string | null;
  pendingSchedules: RenterDashboardResponse["linkedCases"][number]["paymentSchedules"];
  rentScoreWidth: number;
  refresh: () => Promise<void>;
  saveProfile: (input: {
    firstName?: string;
    lastName?: string;
    organizationName?: string | null;
    registrationNumber?: string | null;
    phone?: string;
    state?: string;
    city?: string;
    address?: string;
    notes?: string | null;
  }) => Promise<boolean>;
  verifyIdentityValue: (input: {
    verificationType: "NIN" | "BVN";
    value: string;
  }) => Promise<boolean>;
  confirmSchedulePayment: (input: {
    paymentScheduleId: string;
    paidAt?: string;
    receiptReference?: string;
    note?: string;
  }) => Promise<boolean>;
  initiateSchedulePaymentConfirmation: (input: {
    paymentScheduleId: string;
    receiptReference?: string;
    note?: string;
    paymentEvidenceObjectKey?: string;
    paymentEvidenceFileName?: string;
    paymentEvidenceMimeType?: string;
    paymentEvidenceFileSize?: number;
  }) => Promise<boolean>;
  initiateDirectPayment: (input: {
    linkedCaseId: string;
    paymentType: "RENT" | "UTILITY" | "ESTATE_DUE";
    amountNgn: number;
    paidAt?: string;
    receiptReference?: string;
    note?: string;
    paymentEvidenceObjectKey: string;
    paymentEvidenceFileName: string;
    paymentEvidenceMimeType: string;
    paymentEvidenceFileSize: number;
  }) => Promise<boolean>;
  shareScoreReport: (input: {
    recipientEmail: string;
    recipientType: "LANDLORD" | "AGENT";
    recipientFirstName?: string;
    recipientLastName?: string;
    recipientPhone?: string;
    note?: string;
  }) => Promise<{ success: boolean; previewUrl?: string | null }>;
  savePassportPhoto: (input: {
    objectKey: string;
    fileName: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    fileSize: number;
  }) => Promise<boolean>;
};

const RenterWorkspaceContext = createContext<RenterWorkspaceContextValue | null>(null);

export function RenterWorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RenterDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async (input?: { silent?: boolean }) => {
    try {
      if (!input?.silent) {
        setLoading(true);
      }
      const response = await getRenterDashboard();
      setData(response);
      setLoadError(null);
      updateStoredUserIdentity({
        fullName: response.profile.organizationName?.trim() || [response.profile.firstName, response.profile.lastName].filter(Boolean).join(" ") || response.profile.email,
        email: response.profile.email
      });
      localStorage.setItem("userPhotoUrl", response.profile.passportPhoto?.viewUrl || "");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to load renter workspace");
      setLoadError(message);
      if (!input?.silent) {
        toast.error(message);
      }
    } finally {
      if (!input?.silent) {
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useAutoRefresh(
    () => loadWorkspace({ silent: true }),
    {
      enabled: Boolean(data),
      intervalMs: 12000
    }
  );

  const pendingSchedules = useMemo(
    () => data?.linkedCases.flatMap((item) => item.paymentSchedules).filter((schedule) => schedule.status !== "PAID") || [],
    [data]
  );

  const rentScoreWidth = useMemo(
    () => scorePercent(data?.rentScore.summary.score || 0, data?.rentScore.summary.minScore || 0, data?.rentScore.summary.maxScore || 900),
    [data]
  );

  async function saveProfile(input: {
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
    try {
      const response = await updateRenterProfile(input);
      setData(response);
      updateStoredUserIdentity({
        fullName: response.profile.organizationName?.trim() || [response.profile.firstName, response.profile.lastName].filter(Boolean).join(" ") || response.profile.email,
        email: response.profile.email
      });
      localStorage.setItem("userPhotoUrl", response.profile.passportPhoto?.viewUrl || "");
      toast.success("Profile updated");
      return true;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update profile"));
      return false;
    }
  }

  async function verifyIdentityValue(input: { verificationType: "NIN" | "BVN"; value: string }) {
    try {
      const response = await verifyRenterIdentity(input);
      setData(response);
      toast.success(`${input.verificationType} verified`);
      return true;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, `Failed to verify ${input.verificationType}`));
      return false;
    }
  }

  async function confirmSchedulePayment(input: {
    paymentScheduleId: string;
    paidAt?: string;
    receiptReference?: string;
    note?: string;
  }) {
    try {
      const response = await confirmRenterPayment(input.paymentScheduleId, {
        paidAt: input.paidAt,
        receiptReference: input.receiptReference,
        note: input.note
      });
      setData(response);
      toast.success("Payment confirmed");
      return true;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to confirm payment"));
      return false;
    }
  }

  async function initiateSchedulePaymentConfirmation(input: {
    paymentScheduleId: string;
    receiptReference?: string;
    note?: string;
    paymentEvidenceObjectKey?: string;
    paymentEvidenceFileName?: string;
    paymentEvidenceMimeType?: string;
    paymentEvidenceFileSize?: number;
  }) {
    try {
      const response = await initiateRenterPaymentConfirmation(input.paymentScheduleId, {
        receiptReference: input.receiptReference,
        note: input.note,
        paymentEvidenceObjectKey: input.paymentEvidenceObjectKey,
        paymentEvidenceFileName: input.paymentEvidenceFileName,
        paymentEvidenceMimeType: input.paymentEvidenceMimeType,
        paymentEvidenceFileSize: input.paymentEvidenceFileSize
      });
      setData(response);
      toast.success("Payment confirmation initiated");
      return true;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to initiate confirmation"));
      return false;
    }
  }

  async function initiateDirectPayment(input: {
    linkedCaseId: string;
    paymentType: "RENT" | "UTILITY" | "ESTATE_DUE";
    amountNgn: number;
    paidAt?: string;
    receiptReference?: string;
    note?: string;
    paymentEvidenceObjectKey: string;
    paymentEvidenceFileName: string;
    paymentEvidenceMimeType: string;
    paymentEvidenceFileSize: number;
  }) {
    try {
      const response = await createSelfInitiatedRenterPayment(input);
      setData(response);
      toast.success("Payment sent for landlord confirmation");
      return true;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to submit payment"));
      return false;
    }
  }

  async function shareScoreReport(input: {
    recipientEmail: string;
    recipientType: "LANDLORD" | "AGENT";
    recipientFirstName?: string;
    recipientLastName?: string;
    recipientPhone?: string;
    note?: string;
  }) {
    try {
      const response = await shareRenterScoreReport(input);
      setData(response.dashboard);
      toast.success("Rent score report shared");
      return {
        success: true,
        previewUrl: response.sharePreviewUrl
      };
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to share rent score report"));
      return { success: false };
    }
  }

  async function savePassportPhoto(input: {
    objectKey: string;
    fileName: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    fileSize: number;
  }) {
    try {
      const response = await saveRenterPassportPhoto(input);
      setData(response);
      localStorage.setItem("userPhotoUrl", response.profile.passportPhoto?.viewUrl || "");
      toast.success("Passport photo updated");
      return true;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update passport photo"));
      return false;
    }
  }

  return (
    <RenterWorkspaceContext.Provider
      value={{
        data,
        loading,
        loadError,
        pendingSchedules,
        rentScoreWidth,
        refresh,
        saveProfile,
        verifyIdentityValue,
        confirmSchedulePayment,
        initiateSchedulePaymentConfirmation,
        initiateDirectPayment,
        shareScoreReport,
        savePassportPhoto
      }}
    >
      {children}
    </RenterWorkspaceContext.Provider>
  );
}

export function useRenterWorkspace() {
  const context = useContext(RenterWorkspaceContext);
  if (!context) {
    throw new Error("useRenterWorkspace must be used within RenterWorkspaceProvider");
  }
  return context;
}
