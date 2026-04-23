import { useMemo, useState } from "react";
import { CreditCard, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { preparePassportPhotoUpload, uploadPublicAccountDocument } from "@/lib/upload";
import { useRenterWorkspace } from "@/lib/renter-workspace-context";
import {
  formatDate,
  formatNgn,
  paymentStatusBadgeClass,
  paymentTypeLabel
} from "@/lib/renter-workspace-presenters";

type EvidencePayload = {
  objectKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export default function RenterWorkspacePayments() {
  const { data, pendingSchedules, initiateDirectPayment, initiateSchedulePaymentConfirmation } = useRenterWorkspace();
  const [showDirectPaymentForm, setShowDirectPaymentForm] = useState(false);
  const [directPayment, setDirectPayment] = useState<{
    linkedCaseId: string;
    paymentType: "RENT" | "UTILITY" | "ESTATE_DUE";
    amountNgn: string;
    paidAt: string;
    receiptReference: string;
    note: string;
  }>({
    linkedCaseId: "",
    paymentType: "RENT",
    amountNgn: "",
    paidAt: "",
    receiptReference: "",
    note: ""
  });
  const [directEvidence, setDirectEvidence] = useState<EvidencePayload | null>(null);
  const [receiptById, setReceiptById] = useState<Record<string, string>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [evidenceById, setEvidenceById] = useState<Record<string, EvidencePayload>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [initiatingId, setInitiatingId] = useState<string | null>(null);
  const [uploadingDirectEvidence, setUploadingDirectEvidence] = useState(false);
  const [submittingDirectPayment, setSubmittingDirectPayment] = useState(false);

  const eligibleLinkedCases = useMemo(
    () => data?.linkedCases.filter((item) => item.decision !== "DECLINED") || [],
    [data]
  );

  const paidSchedules = useMemo(
    () =>
      data?.linkedCases
        .flatMap((item) =>
          item.paymentSchedules
            .filter((schedule) => schedule.status === "PAID")
            .map((schedule) => ({
              ...schedule,
              propertyName: item.property.name
            }))
        )
        .sort((a, b) => new Date(b.confirmedByRenterAt || b.dueDate).getTime() - new Date(a.confirmedByRenterAt || a.dueDate).getTime()) || [],
    [data]
  );

  if (!data) return null;

  async function uploadEvidence(file: File, onComplete: (payload: EvidencePayload) => void, onStart?: () => void, onFinally?: () => void) {
    try {
      onStart?.();
      const prepared = await preparePassportPhotoUpload(file);
      const uploaded = await uploadPublicAccountDocument({
        documentType: "PAYMENT_RECEIPT",
        file: prepared.file,
        fileName: prepared.fileName,
        contentType: prepared.mimeType
      });
      onComplete({
        objectKey: uploaded.objectKey,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize
      });
      toast.success("Payment evidence uploaded");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to upload payment evidence"));
    } finally {
      onFinally?.();
    }
  }

  async function handleEvidenceUpload(scheduleId: string, file: File) {
    await uploadEvidence(
      file,
      (payload) => setEvidenceById((current) => ({ ...current, [scheduleId]: payload })),
      () => setUploadingId(scheduleId),
      () => setUploadingId(null)
    );
  }

  async function handleDirectEvidenceUpload(file: File) {
    await uploadEvidence(
      file,
      (payload) => setDirectEvidence(payload),
      () => setUploadingDirectEvidence(true),
      () => setUploadingDirectEvidence(false)
    );
  }

  async function initiateConfirmation(scheduleId: string) {
    setInitiatingId(scheduleId);
    const evidence = evidenceById[scheduleId];
    const success = await initiateSchedulePaymentConfirmation({
      paymentScheduleId: scheduleId,
      receiptReference: receiptById[scheduleId] || undefined,
      note: noteById[scheduleId] || undefined,
      paymentEvidenceObjectKey: evidence?.objectKey,
      paymentEvidenceFileName: evidence?.fileName,
      paymentEvidenceMimeType: evidence?.mimeType,
      paymentEvidenceFileSize: evidence?.fileSize
    });
    if (success) {
      toast.success("Confirmation sent for landlord review");
    }
    setInitiatingId(null);
  }

  async function submitDirectPayment() {
    if (!directPayment.linkedCaseId) {
      toast.error("Select a linked property first");
      return;
    }
    if (!directPayment.amountNgn.trim() || Number(directPayment.amountNgn) <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    if (!directEvidence) {
      toast.error("Upload proof of payment before sending to landlord");
      return;
    }

    setSubmittingDirectPayment(true);
    const success = await initiateDirectPayment({
      linkedCaseId: directPayment.linkedCaseId,
      paymentType: directPayment.paymentType,
      amountNgn: Number(directPayment.amountNgn),
      paidAt: directPayment.paidAt || undefined,
      receiptReference: directPayment.receiptReference || undefined,
      note: directPayment.note || undefined,
      paymentEvidenceObjectKey: directEvidence.objectKey,
      paymentEvidenceFileName: directEvidence.fileName,
      paymentEvidenceMimeType: directEvidence.mimeType,
      paymentEvidenceFileSize: directEvidence.fileSize
    });
    if (success) {
      setDirectPayment({
        linkedCaseId: "",
        paymentType: "RENT",
        amountNgn: "",
        paidAt: "",
        receiptReference: "",
        note: ""
      });
      setDirectEvidence(null);
      setShowDirectPaymentForm(false);
    }
    setSubmittingDirectPayment(false);
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(28,78,216,0.14),_transparent_32%),linear-gradient(135deg,#ffffff,#f7fbff_58%,#eef5ff)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rentsure-blue)]">Payments</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Payments and proof</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Send your own payment proof to the landlord, or respond to landlord payment requests already linked to you.
            </p>
          </div>
          <Button type="button" onClick={() => setShowDirectPaymentForm((current) => !current)} disabled={!eligibleLinkedCases.length}>
            {showDirectPaymentForm ? "Cancel" : "Initiate payment"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Pending payment schedules" value={String(pendingSchedules.length)} icon={CreditCard} />
        <MetricCard label="Paid schedules" value={String(paidSchedules.length)} icon={ReceiptText} />
        <MetricCard label="Linked rental properties" value={String(data.summary.activeLinkedCases)} icon={CreditCard} />
      </div>

      {showDirectPaymentForm ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Initiate payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!eligibleLinkedCases.length ? (
              <p className="text-sm text-muted-foreground">A landlord or agent needs to link a property to you before you can initiate a payment here.</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField
                    id="linked-case"
                    label="Linked property"
                    value={directPayment.linkedCaseId}
                    onChange={(value) => setDirectPayment((current) => ({ ...current, linkedCaseId: value }))}
                    options={[
                      { value: "", label: "Select linked property" },
                      ...eligibleLinkedCases.map((item) => ({
                        value: item.id,
                        label: item.property.name
                      }))
                    ]}
                  />
                  <SelectField
                    id="payment-type"
                    label="Payment type"
                    value={directPayment.paymentType}
                    onChange={(value) =>
                      setDirectPayment((current) => ({
                        ...current,
                        paymentType: value as "RENT" | "UTILITY" | "ESTATE_DUE"
                      }))
                    }
                    options={[
                      { value: "RENT", label: "Rent" },
                      { value: "UTILITY", label: "Utility" },
                      { value: "ESTATE_DUE", label: "Estate due" }
                    ]}
                  />
                  <FormField
                    label="Amount"
                    value={directPayment.amountNgn}
                    onChange={(value) => setDirectPayment((current) => ({ ...current, amountNgn: value }))}
                    placeholder="Enter amount in naira"
                    type="number"
                  />
                  <FormField
                    label="Payment date"
                    value={directPayment.paidAt}
                    onChange={(value) => setDirectPayment((current) => ({ ...current, paidAt: value }))}
                    placeholder=""
                    type="date"
                  />
                  <FormField
                    label="Receipt reference"
                    value={directPayment.receiptReference}
                    onChange={(value) => setDirectPayment((current) => ({ ...current, receiptReference: value }))}
                    placeholder="Enter receipt reference"
                  />
                  <FormField
                    label="Payment note"
                    value={directPayment.note}
                    onChange={(value) => setDirectPayment((current) => ({ ...current, note: value }))}
                    placeholder="Add payment note"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direct-evidence">Payment evidence (screenshot)</Label>
                  <Input
                    id="direct-evidence"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="bg-white"
                    disabled={uploadingDirectEvidence}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleDirectEvidenceUpload(file);
                      }
                    }}
                  />
                  {directEvidence ? <p className="text-xs text-slate-500">Uploaded: {directEvidence.fileName}</p> : null}
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => void submitDirectPayment()} disabled={submittingDirectPayment}>
                    {submittingDirectPayment ? "Sending..." : "Send to landlord"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Payment requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!pendingSchedules.length ? (
              <p className="text-sm text-muted-foreground">No landlord payment requests are waiting right now.</p>
            ) : null}
            {pendingSchedules.map((schedule) => (
              <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{paymentTypeLabel(schedule.paymentType)}</p>
                    <p className="text-sm text-slate-600">
                      {formatNgn(schedule.amountNgn)} · due {formatDate(schedule.dueDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Requested by {schedule.createdBy}</p>
                    {schedule.note ? <p className="mt-1 text-sm text-slate-600">{schedule.note}</p> : null}
                  </div>
                  <Badge className={paymentStatusBadgeClass(schedule.status)} variant="outline">
                    {schedule.status}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <FormField
                    label="Receipt reference"
                    value={receiptById[schedule.id] || ""}
                    onChange={(value) => setReceiptById((current) => ({ ...current, [schedule.id]: value }))}
                    placeholder="Enter receipt reference"
                  />
                  <FormField
                    label="Payment note"
                    value={noteById[schedule.id] || ""}
                    onChange={(value) => setNoteById((current) => ({ ...current, [schedule.id]: value }))}
                    placeholder="Add payment note"
                  />
                </div>
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`evidence-${schedule.id}`}>Payment evidence (screenshot)</Label>
                  <Input
                    id={`evidence-${schedule.id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="bg-white"
                    disabled={uploadingId === schedule.id}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleEvidenceUpload(schedule.id, file);
                      }
                    }}
                  />
                  {evidenceById[schedule.id] ? <p className="text-xs text-slate-500">Uploaded: {evidenceById[schedule.id]?.fileName}</p> : null}
                  {schedule.paymentEvidenceFileName ? <p className="text-xs text-slate-500">Current evidence: {schedule.paymentEvidenceFileName}</p> : null}
                  {schedule.confirmationInitiatedAt ? (
                    <p className="text-xs text-amber-700">Proof sent on {formatDate(schedule.confirmationInitiatedAt)}. Awaiting landlord confirmation.</p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => void initiateConfirmation(schedule.id)} disabled={initiatingId === schedule.id}>
                    {initiatingId === schedule.id ? "Sending..." : schedule.confirmationInitiatedAt ? "Update proof of payment" : "Send proof to landlord"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent confirmations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!paidSchedules.length ? <p className="text-sm text-muted-foreground">No payment confirmation has been recorded yet.</p> : null}
            {paidSchedules.slice(0, 8).map((schedule) => (
              <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{paymentTypeLabel(schedule.paymentType)}</p>
                    <p className="text-sm text-slate-600">{schedule.propertyName}</p>
                    <p className="text-xs text-muted-foreground">Confirmed {formatDate(schedule.confirmedByRenterAt || schedule.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">{formatNgn(schedule.amountNgn)}</p>
                    <Badge className={paymentStatusBadgeClass(schedule.status)} variant="outline">
                      {schedule.status}
                    </Badge>
                  </div>
                </div>
                {schedule.receiptReference ? <p className="mt-3 text-xs text-slate-500">Receipt reference: {schedule.receiptReference}</p> : null}
                {schedule.confirmationTiming ? (
                  <p className="mt-1 text-xs text-slate-500">Timing: {schedule.confirmationTiming === "ON_TIME" ? "On time" : "Late"}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: typeof CreditCard;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-[var(--rentsure-blue)]" />
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "number" | "date";
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="bg-white" />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background"
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
